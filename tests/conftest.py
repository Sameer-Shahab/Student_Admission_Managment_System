import os
import sqlite3

import pytest


def _reset_db_state(appmod):
    # The app keeps a module-level "initialized" flag; reset for isolated tests.
    appmod._db_inited = False


@pytest.fixture()
def app(tmp_path, monkeypatch):
    # Import after monkeypatching module globals to keep test isolation.
    import server.app as appmod

    test_db = tmp_path / "test.db"
    test_upload = tmp_path / "student_documents"
    test_upload.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(appmod, "DATABASE", str(test_db))
    monkeypatch.setattr(appmod, "UPLOAD_FOLDER", str(test_upload))

    # Avoid heavy image processing in tests; just keep the uploaded image as-is.
    monkeypatch.setattr(appmod, "scan_document", lambda p: p)

    _reset_db_state(appmod)
    appmod.ensure_db_initialized()

    appmod.app.config.update(TESTING=True)
    yield appmod.app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db_path(app, tmp_path):
    # Keep this in sync with conftest's DATABASE path.
    return tmp_path / "test.db"


def sqlite_table_names(db_file: str):
    conn = sqlite3.connect(db_file)
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()

