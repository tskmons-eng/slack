from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from slack_sdk.errors import SlackApiError

from .config import Config
from .database import Database, utc_now_iso
from .slack_client import SlackClient
from .vin import extract_vins


@dataclass
class ChildMatch:
    vin: str
    child_channel_id: str
    child_channel_name: str
    child_thread_ts: str
    child_url: str


@dataclass
class RunStats:
    started_at: str
    dry_run: bool
    finished_at: str | None = None
    parent_threads_checked: int = 0
    vins_found: int = 0
    child_matches_found: int = 0
    posted_count: int = 0
    duplicate_skipped_count: int = 0
    expired_skipped_count: int = 0
    error_count: int = 0
    memo: str = ""
    notes: list[str] = field(default_factory=list, repr=False)

    def add_note(self, note: str) -> None:
        self.notes.append(note)
        self.memo = "\n".join(self.notes[-20:])


class SlackThreadLinker:
    def __init__(
        self,
        *,
        config: Config,
        slack_client: SlackClient,
        database: Database,
        logger: logging.Logger,
    ) -> None:
        self.config = config
        self.slack = slack_client
        self.db = database
        self.logger = logger

    def run(self) -> RunStats:
        stats = RunStats(started_at=utc_now_iso(), dry_run=self.config.dry_run)
        self.logger.info("SEEMORE Slack linker started. dry_run=%s", self.config.dry_run)

        try:
            parent_channel_id = self.slack.get_channel_id_by_name(self.config.parent_channel_name)
            child_channels = self._resolve_child_channels()
            parent_threads = self.slack.get_recent_threads(
                parent_channel_id,
                self.config.lookback_days,
            )
            self.logger.info("Found %d recent parent thread candidate(s).", len(parent_threads))

            for parent_thread in parent_threads:
                self._process_parent_thread(
                    parent_channel_id=parent_channel_id,
                    parent_thread=parent_thread,
                    child_channels=child_channels,
                    stats=stats,
                )
        except Exception as exc:  # noqa: BLE001
            self._record_error(stats, "run", exc)
        finally:
            stats.finished_at = utc_now_iso()
            self.db.save_run_log(stats)
            self.logger.info(
                "SEEMORE Slack linker finished. checked=%d vins=%d matches=%d posted=%d "
                "duplicates=%d expired=%d errors=%d",
                stats.parent_threads_checked,
                stats.vins_found,
                stats.child_matches_found,
                stats.posted_count,
                stats.duplicate_skipped_count,
                stats.expired_skipped_count,
                stats.error_count,
            )

        return stats

    def _resolve_child_channels(self) -> dict[str, str]:
        child_channels: dict[str, str] = {}
        for channel_name in self.config.child_channel_names:
            channel_id = self.slack.get_channel_id_by_name(channel_name)
            child_channels[channel_id] = channel_name
            self.logger.info("Resolved child channel: %s -> %s", channel_name, channel_id)
        return child_channels

    def _process_parent_thread(
        self,
        *,
        parent_channel_id: str,
        parent_thread: dict[str, Any],
        child_channels: dict[str, str],
        stats: RunStats,
    ) -> None:
        parent_thread_ts = str(parent_thread.get("thread_ts") or parent_thread.get("ts") or "")
        if not parent_thread_ts:
            stats.add_note("Skipped parent thread with missing timestamp.")
            return

        stats.parent_threads_checked += 1
        context = f"parent_thread:{parent_channel_id}:{parent_thread_ts}"

        try:
            parent_messages = self.slack.get_thread_messages(parent_channel_id, parent_thread_ts)
        except Exception as exc:  # noqa: BLE001
            self._record_error(stats, context, exc)
            return

        parent_text = _messages_text(parent_messages)
        vins = extract_vins(parent_text)
        stats.vins_found += len(vins)

        if not vins:
            self.logger.info("No vehicle number found in parent thread %s.", parent_thread_ts)
            return
        if len(vins) > 1:
            stats.add_note(f"Skipped ambiguous parent thread {parent_thread_ts}: {', '.join(vins)}")
            self.logger.warning(
                "Skipped parent thread %s because multiple vehicle numbers were found: %s",
                parent_thread_ts,
                ", ".join(vins),
            )
            return

        vin = vins[0]
        try:
            parent_url = self.slack.get_permalink(parent_channel_id, parent_thread_ts)
        except Exception as exc:  # noqa: BLE001
            self._record_error(stats, f"{context}:parent_permalink", exc)
            parent_url = None

        matches = self._find_child_matches(
            vin=vin,
            child_channels=child_channels,
            parent_channel_id=parent_channel_id,
            parent_thread_ts=parent_thread_ts,
            parent_text=parent_text,
            stats=stats,
        )
        if not matches:
            self.logger.info("No new child thread links found for %s.", vin)
            return

        post_text = format_link_message(matches, self.config.child_channel_names)
        if self.config.dry_run:
            stats.add_note(f"DRY RUN parent {parent_thread_ts}: would post {len(matches)} link(s).")
            self.logger.info(
                "DRY RUN: would post to parent thread %s:\n%s",
                parent_thread_ts,
                post_text,
            )
            return

        try:
            self.slack.post_thread_message(parent_channel_id, parent_thread_ts, post_text)
        except Exception as exc:  # noqa: BLE001
            self._record_error(stats, f"{context}:post", exc)
            return

        for match in matches:
            saved = self.db.save_link(
                vin=match.vin,
                parent_channel_id=parent_channel_id,
                parent_thread_ts=parent_thread_ts,
                parent_url=parent_url,
                child_channel_id=match.child_channel_id,
                child_thread_ts=match.child_thread_ts,
                child_url=match.child_url,
                child_channel_name=match.child_channel_name,
            )
            if saved:
                stats.posted_count += 1
            else:
                stats.duplicate_skipped_count += 1

    def _find_child_matches(
        self,
        *,
        vin: str,
        child_channels: dict[str, str],
        parent_channel_id: str,
        parent_thread_ts: str,
        parent_text: str,
        stats: RunStats,
    ) -> list[ChildMatch]:
        query = f'"{vin}"'
        try:
            search_results = self.slack.search_messages(query)
        except Exception as exc:  # noqa: BLE001
            self._record_error(stats, f"search:{vin}", exc)
            return []

        matches: list[ChildMatch] = []
        seen_threads: set[tuple[str, str]] = set()
        cutoff = datetime.now(UTC) - timedelta(days=self.config.lookback_days)

        for result in search_results:
            channel_id = _result_channel_id(result)
            if channel_id not in child_channels:
                continue

            child_thread_ts = str(result.get("thread_ts") or result.get("ts") or "")
            if not child_thread_ts:
                continue

            thread_key = (channel_id, child_thread_ts)
            if thread_key in seen_threads:
                continue
            seen_threads.add(thread_key)

            child_context = f"child_thread:{channel_id}:{child_thread_ts}"
            try:
                child_messages = self.slack.get_thread_messages(channel_id, child_thread_ts)
            except Exception as exc:  # noqa: BLE001
                self._record_error(stats, child_context, exc)
                continue

            if not _thread_updated_within(child_messages, cutoff):
                stats.expired_skipped_count += 1
                self.logger.info("Skipped expired child thread %s.", child_thread_ts)
                continue

            child_vins = set(extract_vins(_messages_text(child_messages)))
            if vin not in child_vins:
                self.logger.info(
                    "Skipped search result %s because exact labeled vehicle number was not found.",
                    child_thread_ts,
                )
                continue

            try:
                child_url = self.slack.get_permalink(channel_id, child_thread_ts)
            except Exception as exc:  # noqa: BLE001
                self._record_error(stats, f"{child_context}:permalink", exc)
                continue

            if child_url in parent_text:
                stats.duplicate_skipped_count += 1
                self.logger.info("Skipped existing parent-thread URL: %s", child_url)
                continue

            if self.db.is_already_linked(parent_channel_id, parent_thread_ts, child_url):
                stats.duplicate_skipped_count += 1
                self.logger.info("Skipped DB duplicate URL: %s", child_url)
                continue

            stats.child_matches_found += 1
            matches.append(
                ChildMatch(
                    vin=vin,
                    child_channel_id=channel_id,
                    child_channel_name=child_channels[channel_id],
                    child_thread_ts=child_thread_ts,
                    child_url=child_url,
                )
            )

        return matches

    def _record_error(self, stats: RunStats, context: str, exc: Exception) -> None:
        stats.error_count += 1
        message = _error_message(exc)
        stats.add_note(f"{context}: {message}")
        self.logger.exception("Error in %s: %s", context, message)
        try:
            self.db.save_error(context, message)
        except Exception:
            self.logger.exception("Failed to save error to database.")


def format_link_message(matches: list[ChildMatch], channel_order: list[str]) -> str:
    grouped: dict[str, list[str]] = {}
    for match in matches:
        grouped.setdefault(match.child_channel_name, []).append(match.child_url)

    lines = ["関連依頼スレ：", ""]
    ordered_names = [name for name in channel_order if name in grouped]
    ordered_names.extend(name for name in grouped if name not in ordered_names)

    for index, channel_name in enumerate(ordered_names):
        if index:
            lines.append("")
        lines.append(f"【{channel_name}】")
        lines.extend(grouped[channel_name])

    return "\n".join(lines)


def _messages_text(messages: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for message in messages:
        text = message.get("text")
        if isinstance(text, str):
            parts.append(text)
    return "\n".join(parts)


def _thread_updated_within(messages: list[dict[str, Any]], cutoff: datetime) -> bool:
    cutoff_ts = cutoff.timestamp()
    latest = 0.0
    for message in messages:
        for key in ("ts", "latest_reply"):
            try:
                latest = max(latest, float(message.get(key) or 0))
            except (TypeError, ValueError):
                continue
    return latest >= cutoff_ts


def _result_channel_id(result: dict[str, Any]) -> str:
    channel = result.get("channel")
    if isinstance(channel, dict):
        channel_id = channel.get("id")
        if channel_id:
            return str(channel_id)
    for key in ("channel_id", "channel"):
        value = result.get(key)
        if isinstance(value, str):
            return value
    return ""


def _error_message(exc: Exception) -> str:
    if isinstance(exc, SlackApiError):
        error = exc.response.get("error") if exc.response is not None else None
        if error:
            return f"Slack API error: {error}"
    return str(exc)
