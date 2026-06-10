from app.database import Database


def test_same_parent_thread_and_child_url_is_duplicate(tmp_path) -> None:
    db = Database(tmp_path / "links.sqlite3")
    db.init_db()

    db.save_link(
        vin="ZVW30-1234567",
        parent_channel_id="C_PARENT",
        parent_thread_ts="111.222",
        parent_url="https://example.slack.com/archives/C_PARENT/p111222",
        child_channel_id="C_CHILD",
        child_thread_ts="333.444",
        child_url="https://example.slack.com/archives/C_CHILD/p333444",
        child_channel_name="carmore依頼",
    )

    assert db.is_already_linked(
        "C_PARENT",
        "111.222",
        "https://example.slack.com/archives/C_CHILD/p333444",
    )


def test_different_child_url_is_new(tmp_path) -> None:
    db = Database(tmp_path / "links.sqlite3")
    db.init_db()

    db.save_link(
        vin="ZVW30-1234567",
        parent_channel_id="C_PARENT",
        parent_thread_ts="111.222",
        parent_url=None,
        child_channel_id="C_CHILD",
        child_thread_ts="333.444",
        child_url="https://example.slack.com/archives/C_CHILD/p333444",
        child_channel_name="carmore依頼",
    )

    assert not db.is_already_linked(
        "C_PARENT",
        "111.222",
        "https://example.slack.com/archives/C_CHILD/p555666",
    )
