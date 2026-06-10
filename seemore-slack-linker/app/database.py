from __future__ import annotations

import sqlite3
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS linked_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vin TEXT NOT NULL,
    parent_channel_id TEXT NOT NULL,
    parent_thread_ts TEXT NOT NULL,
    parent_url TEXT,
    child_channel_id TEXT NOT NULL,
    child_thread_ts TEXT NOT NULL,
    child_url TEXT NOT NULL,
    child_channel_name TEXT,
    linked_at TEXT NOT NULL,
    UNIQUE(parent_channel_id, parent_thread_ts, child_url)
);

CREATE TABLE IF NOT EXISTS run_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    dry_run INTEGER NOT NULL,
    parent_threads_checked INTEGER DEFAULT 0,
    vins_found INTEGER DEFAULT 0,
    child_matches_found INTEGER DEFAULT 0,
    posted_count INTEGER DEFAULT 0,
    duplicate_skipped_count INTEGER DEFAULT 0,
    expired_skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    memo TEXT
);

CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    context TEXT,
    error_message TEXT NOT NULL
);
"""


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Database:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        if not self.db_path.parent.exists():
            raise FileNotFoundError(f"DB parent folder does not exist: {self.db_path.parent}")

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self.connect() as conn:
            conn.executescript(SCHEMA)

    def is_already_linked(
        self,
        parent_channel_id: str,
        parent_thread_ts: str,
        child_url: str,
    ) -> bool:
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM linked_threads
                WHERE parent_channel_id = ?
                  AND parent_thread_ts = ?
                  AND child_url = ?
                LIMIT 1
                """,
                (parent_channel_id, parent_thread_ts, child_url),
            ).fetchone()
        return row is not None

    def save_link(
        self,
        *,
        vin: str,
        parent_channel_id: str,
        parent_thread_ts: str,
        parent_url: str | None,
        child_channel_id: str,
        child_thread_ts: str,
        child_url: str,
        child_channel_name: str | None,
    ) -> bool:
        with self.connect() as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO linked_threads (
                    vin,
                    parent_channel_id,
                    parent_thread_ts,
                    parent_url,
                    child_channel_id,
                    child_thread_ts,
                    child_url,
                    child_channel_name,
                    linked_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vin,
                    parent_channel_id,
                    parent_thread_ts,
                    parent_url,
                    child_channel_id,
                    child_thread_ts,
                    child_url,
                    child_channel_name,
                    utc_now_iso(),
                ),
            )
        return cursor.rowcount == 1

    def save_run_log(self, stats: Any) -> None:
        payload = asdict(stats) if is_dataclass(stats) else dict(stats)
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO run_logs (
                    started_at,
                    finished_at,
                    dry_run,
                    parent_threads_checked,
                    vins_found,
                    child_matches_found,
                    posted_count,
                    duplicate_skipped_count,
                    expired_skipped_count,
                    error_count,
                    memo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["started_at"],
                    payload.get("finished_at"),
                    1 if payload["dry_run"] else 0,
                    payload.get("parent_threads_checked", 0),
                    payload.get("vins_found", 0),
                    payload.get("child_matches_found", 0),
                    payload.get("posted_count", 0),
                    payload.get("duplicate_skipped_count", 0),
                    payload.get("expired_skipped_count", 0),
                    payload.get("error_count", 0),
                    payload.get("memo"),
                ),
            )

    def save_error(self, context: str, error_message: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO errors (occurred_at, context, error_message)
                VALUES (?, ?, ?)
                """,
                (utc_now_iso(), context, error_message),
            )


_default_database: Database | None = None


def configure(db_path: str | Path) -> Database:
    global _default_database
    _default_database = Database(db_path)
    return _default_database


def _db() -> Database:
    if _default_database is None:
        raise RuntimeError("Database is not configured. Call configure(db_path) first.")
    return _default_database


def init_db() -> None:
    _db().init_db()


def is_already_linked(parent_channel_id: str, parent_thread_ts: str, child_url: str) -> bool:
    return _db().is_already_linked(parent_channel_id, parent_thread_ts, child_url)


def save_link(**kwargs: Any) -> bool:
    return _db().save_link(**kwargs)


def save_run_log(stats: Any) -> None:
    _db().save_run_log(stats)


def save_error(context: str, error_message: str) -> None:
    _db().save_error(context, error_message)
