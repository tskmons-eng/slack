from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


class SlackClient:
    def __init__(self, token: str) -> None:
        self.client = WebClient(token=token)

    def get_channel_id_by_name(self, name: str) -> str:
        cursor: str | None = None
        target = name.strip()

        while True:
            response = self.client.conversations_list(
                exclude_archived=True,
                limit=200,
                cursor=cursor,
                types="public_channel,private_channel",
            )
            for channel in response.get("channels", []):
                names = _channel_names(channel)
                if target in names:
                    return str(channel["id"])

            cursor = response.get("response_metadata", {}).get("next_cursor") or None
            if not cursor:
                break

        raise LookupError(f"Slack channel not found or bot is not invited: {name}")

    def get_recent_threads(self, channel_id: str, lookback_days: int) -> list[dict[str, Any]]:
        cutoff = _cutoff_timestamp(lookback_days)
        cursor: str | None = None
        roots: dict[str, dict[str, Any]] = {}

        while True:
            response = self.client.conversations_history(
                channel=channel_id,
                limit=200,
                cursor=cursor,
            )
            for message in response.get("messages", []):
                ts = str(message.get("thread_ts") or message.get("ts") or "")
                if not ts:
                    continue
                last_activity_ts = _message_last_activity_ts(message)
                if last_activity_ts < cutoff:
                    continue

                existing = roots.get(ts)
                if existing is None or last_activity_ts > existing["last_activity_ts"]:
                    message["thread_ts"] = ts
                    message["last_activity_ts"] = last_activity_ts
                    roots[ts] = message

            cursor = response.get("response_metadata", {}).get("next_cursor") or None
            if not cursor:
                break

        return sorted(roots.values(), key=lambda item: item["last_activity_ts"], reverse=True)

    def get_thread_messages(self, channel_id: str, thread_ts: str) -> list[dict[str, Any]]:
        cursor: str | None = None
        messages: list[dict[str, Any]] = []

        while True:
            response = self.client.conversations_replies(
                channel=channel_id,
                ts=thread_ts,
                limit=200,
                cursor=cursor,
            )
            messages.extend(response.get("messages", []))
            cursor = response.get("response_metadata", {}).get("next_cursor") or None
            if not cursor:
                break

        return messages

    def search_messages(self, query: str) -> list[dict[str, Any]]:
        page = 1
        matches: list[dict[str, Any]] = []

        while True:
            response = self.client.search_messages(
                query=query,
                sort="timestamp",
                sort_dir="desc",
                count=100,
                page=page,
            )
            message_block = response.get("messages", {})
            matches.extend(message_block.get("matches", []))

            pagination = message_block.get("pagination", {})
            page_count = int(pagination.get("page_count") or 1)
            if page >= page_count:
                break
            page += 1

        return matches

    def get_permalink(self, channel_id: str, message_ts: str) -> str:
        response = self.client.chat_getPermalink(channel=channel_id, message_ts=message_ts)
        permalink = response.get("permalink")
        if not permalink:
            raise SlackApiError("chat.getPermalink did not return permalink.", response)
        return str(permalink)

    def post_thread_message(self, channel_id: str, thread_ts: str, text: str) -> None:
        self.client.chat_postMessage(
            channel=channel_id,
            thread_ts=thread_ts,
            text=text,
            unfurl_links=False,
            unfurl_media=False,
        )


def _cutoff_timestamp(lookback_days: int) -> float:
    cutoff = datetime.now(UTC) - timedelta(days=lookback_days)
    return cutoff.timestamp()


def _channel_names(channel: dict[str, Any]) -> set[str]:
    names = {
        str(channel.get("name", "")).strip(),
        str(channel.get("name_normalized", "")).strip(),
    }
    previous_names = channel.get("previous_names", [])
    if isinstance(previous_names, list):
        names.update(str(name).strip() for name in previous_names)
    return {name for name in names if name}


def _message_last_activity_ts(message: dict[str, Any]) -> float:
    candidates = [
        message.get("latest_reply"),
        message.get("ts"),
        message.get("thread_ts"),
    ]
    for candidate in candidates:
        try:
            if candidate is not None:
                return float(candidate)
        except (TypeError, ValueError):
            continue
    return time.time()
