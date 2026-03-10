def test_root_redirects_to_login(client):
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302)
    assert "/login" in resp.headers.get("Location", "")


def test_login_page_loads(client):
    resp = client.get("/login")
    assert resp.status_code == 200


def test_admin_requires_login(client):
    resp = client.get("/admin", follow_redirects=False)
    assert resp.status_code in (301, 302)
    assert "/login" in resp.headers.get("Location", "")


def test_admin_after_login(client):
    # Default creds are fine for tests (they are env-overridable in production).
    resp = client.post(
        "/login",
        data={"username": "admin", "password": "ned@admin123"},
        follow_redirects=False,
    )
    assert resp.status_code in (301, 302)

    resp = client.get("/admin")
    assert resp.status_code == 200

