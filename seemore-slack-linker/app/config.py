from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


class ConfigError(ValueError):
    """Raised when required runtime settings are missing or invalid."""


def _parse_bool(value: str, name: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ConfigError(f"{name} must be true or false.")


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Config:
    slack_bot_token: str
    slack_team_domain: str
    parent_channel_name: str
    child_channel_names: list[str]
    lookback_days: int
    dry_run: bool
    db_path: Path
    log_level: str
    project_dir: Path

    @classmethod
    def from_env(cls, project_dir: Path | None = None) -> "Config":
        root = project_dir or Path(__file__).resolve().parents[1]
        load_dotenv(root / ".env")

        slack_bot_token = os.getenv("SLACK_BOT_TOKEN", "").strip()
        if not slack_bot_token:
            raise ConfigError("SLACK_BOT_TOKEN is required.")

        slack_team_domain = os.getenv("SLACK_TEAM_DOMAIN", "").strip()
        if not slack_team_domain:
            raise ConfigError("SLACK_TEAM_DOMAIN is required.")

        parent_channel_name = os.getenv("PARENT_CHANNEL_NAME", "依頼_車案件").strip()
        if not parent_channel_name:
            raise ConfigError("PARENT_CHANNEL_NAME is required.")

        child_channel_names = _split_csv(
            os.getenv(
                "CHILD_CHANNEL_NAMES",
                "carmore依頼,オールマシンサービス SEEMORE",
            )
        )
        if not child_channel_names:
            raise ConfigError("CHILD_CHANNEL_NAMES requires at least one channel name.")

        try:
            lookback_days = int(os.getenv("LOOKBACK_DAYS", "60").strip())
        except ValueError as exc:
            raise ConfigError("LOOKBACK_DAYS must be an integer.") from exc
        if lookback_days <= 0:
            raise ConfigError("LOOKBACK_DAYS must be greater than zero.")

        dry_run = _parse_bool(os.getenv("DRY_RUN", "true"), "DRY_RUN")
        db_path = Path(os.getenv("DB_PATH", "./data/seemore_slack_links.sqlite3").strip())
        if not db_path.is_absolute():
            db_path = root / db_path
        db_path = db_path.resolve()
        if not db_path.parent.exists():
            raise ConfigError(
                f"DB_PATH parent folder does not exist: {db_path.parent}. "
                "Create it explicitly or fix DB_PATH."
            )

        log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper() or "INFO"

        return cls(
            slack_bot_token=slack_bot_token,
            slack_team_domain=slack_team_domain,
            parent_channel_name=parent_channel_name,
            child_channel_names=child_channel_names,
            lookback_days=lookback_days,
            dry_run=dry_run,
            db_path=db_path,
            log_level=log_level,
            project_dir=root,
        )
