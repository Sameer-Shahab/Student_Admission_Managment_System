import io
import os
import sqlite3

from PIL import Image


def _jpg_bytes(color=(10, 20, 30)):
    img = Image.new("RGB", (50, 50), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def test_upload_requires_roll(client):
    resp = client.post("/upload", data={}, content_type="multipart/form-data")
    assert resp.status_code == 200
    assert b"Roll number" in resp.data


def test_upload_creates_pdfs_and_db_rows(client, app, tmp_path):
    import server.app as appmod

    roll = "ME-23-001"

    data = {
        "full_roll": roll,
        "domicile_files": [
            (_jpg_bytes((200, 10, 10)), "d1.jpg"),
            (_jpg_bytes((210, 10, 10)), "d2.jpg"),
        ],
        "marksheet_files": [
            (_jpg_bytes((10, 200, 10)), "m1.jpg"),
            (_jpg_bytes((10, 210, 10)), "m2.jpg"),
        ],
        "optional_files": [
            (_jpg_bytes((10, 10, 200)), "o1.jpg"),
        ],
    }

    resp = client.post("/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 200
    assert b"Saved for" in resp.data

    # Check files on disk
    year_folder = os.path.join(appmod.UPLOAD_FOLDER, "2023", "ME", roll)
    domicile_pdf = os.path.join(year_folder, f"{roll}_domicile.pdf")
    marksheet_pdf = os.path.join(year_folder, f"{roll}_marksheet.pdf")
    opt_pdf = os.path.join(year_folder, f"{roll}_optional_1.pdf")

    assert os.path.isfile(domicile_pdf)
    assert os.path.isfile(marksheet_pdf)
    assert os.path.isfile(opt_pdf)

    # Check DB rows
    conn = sqlite3.connect(appmod.DATABASE)
    try:
        c = conn.execute("SELECT COUNT(*) FROM students WHERE roll_number = ?", (roll,))
        assert c.fetchone()[0] == 1

        c = conn.execute(
            "SELECT doc_type FROM student_documents WHERE roll_number = ? ORDER BY doc_type",
            (roll,),
        )
        types = [r[0] for r in c.fetchall()]
    finally:
        conn.close()

    assert "domicile" in types
    assert "marksheet" in types
    assert "optional_1" in types

