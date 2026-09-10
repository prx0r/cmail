"""Tests for the cmail bridge: POST /api/observations/email."""
import os
import tempfile

_fd, _db = tempfile.mkstemp(suffix=".db")
os.close(_fd)
os.environ["STEVE_DB_URL"] = f"sqlite:///{_db}"

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from stevejobless.main import app

    with TestClient(app) as c:
        yield c


def _obs(**kw):
    base = {"message_id": "m1", "domain": "feedify.dev", "mailbox": "support@feedify.dev",
            "sender": "a@b.com", "subject": "help", "summary": "s",
            "classification": "needs_reply", "importance": 8, "needs_reply": True}
    base.update(kw)
    return base


def test_ingest_creates_action(client: TestClient):
    r = client.post("/api/observations/email", json=_obs(message_id="e2e-1"))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] and body["project"] == "feedify"


def test_ingest_dedupes(client: TestClient):
    client.post("/api/observations/email", json=_obs(message_id="e2e-2"))
    r = client.post("/api/observations/email", json=_obs(message_id="e2e-2"))
    assert r.json()["deduped"] is True


def test_ingest_unknown_domain_falls_back(client: TestClient):
    r = client.post("/api/observations/email", json=_obs(message_id="e2e-3", domain="nope.zzz"))
    assert r.status_code == 200 and r.json()["ok"]
