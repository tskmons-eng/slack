from __future__ import annotations

import sys

from .config import Config, ConfigError
from .database import Database
from .linker import SlackThreadLinker
from .logger import setup_logging
from .slack_client import SlackClient


def main() -> int:
    try:
        config = Config.from_env()
        logger = setup_logging(config.project_dir / "logs", config.log_level)
        database = Database(config.db_path)
        database.init_db()
        slack_client = SlackClient(config.slack_bot_token)
        linker = SlackThreadLinker(
            config=config,
            slack_client=slack_client,
            database=database,
            logger=logger,
        )
        stats = linker.run()
        return 1 if stats.error_count else 0
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
