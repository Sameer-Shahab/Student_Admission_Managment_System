import sqlite3

from tests.conftest import sqlite_table_names


def test_init_db_creates_expected_tables(db_path):
    import server.app as appmod

    # Ensure fresh db
    if db_path.exists():
        db_path.unlink()

    appmod._db_inited = False
    appmod.init_db()

    names = sqlite_table_names(str(db_path))
    assert "students" in names
    assert "student_documents" in names


def test_init_db_migrates_missing_student_columns(tmp_path, monkeypatch):
    import server.app as appmod

    db_file = tmp_path / "legacy.db"
    monkeypatch.setattr(appmod, "DATABASE", str(db_file))
    appmod._db_inited = False

    conn = sqlite3.connect(str(db_file))
    try:
        # Simulate an older schema that was missing many columns.
        conn.execute(
            """
            CREATE TABLE students (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id TEXT UNIQUE NOT NULL,
              full_name TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()

    appmod.init_db()

    conn = sqlite3.connect(str(db_file))
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(students)").fetchall()]
    finally:
        conn.close()

    # A few key columns used across the app.
    assert "roll_number" in cols
    assert "batch" in cols
    assert "department" in cols
    assert "created_at" in cols
    assert "updated_at" in cols

