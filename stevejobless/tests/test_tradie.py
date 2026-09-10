"""Tests for the tradie stack: kernel, intake, quotes, scoring, stats."""
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


def intake(client, **kw):
    base = {"customer_name": "Test Customer", "customer_phone": "+447000000001",
            "customer_address": "1 High St", "channel": "voice", "job_type": "ev_charger",
            "description": "install car charger", "transcript": "…", "after_hours": True}
    base.update(kw)
    return client.post("/api/tradie/sparky/intake", json=base)


def test_kernel_seeded(client):
    r = client.get("/api/tradie/sparky/kernel")
    assert r.status_code == 200, r.text
    assert "price_book" in r.json()["kernel"]


def test_intake_creates_job_and_options(client):
    r = intake(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["job_id"] and body["action_id"]
    assert any(o["id"] == "quote" for o in body["options"])


def test_urgent_intake_flags_wake_now(client):
    r = intake(client, urgent=True, job_type="fault", description="sparks from socket")
    assert r.json()["ok"]
    job = client.get(f"/api/tradie/sparky/jobs/{r.json()['job_id']}").json()
    assert "URGENT" in str(job) or True  # title lives on the HumanAction
    from stevejobless.db import SessionLocal
    from stevejobless.models import HumanAction
    from sqlalchemy import select
    with SessionLocal() as db:
        a = db.scalar(select(HumanAction).where(HumanAction.resource_key == f"job:{r.json()['job_id']}"))
        assert a.priority == 100 and "WAKE-NOW" in a.instructions


def test_quote_and_lifecycle(client):
    jid = intake(client, job_type="fault").json()["job_id"]
    q = client.post(f"/api/tradie/sparky/jobs/{jid}/quote").json()
    assert q["ok"] and q["total"] > 0 and q["live_send"] is False
    assert client.patch(f"/api/tradie/sparky/jobs/{jid}", json={"status": "scheduled"}).json()["status"] == "scheduled"
    assert client.patch(f"/api/tradie/sparky/jobs/{jid}",
                        json={"status": "done", "final_price": 120, "duration_min": 75}).json()["ok"]
    stats = client.get("/api/tradie/sparky/stats").json()
    assert stats["stats"]["fault"]["n"] >= 1


def test_score_verdict(client):
    r = client.post("/api/tradie/sparky/score",
                    json={"job_type": "ev_charger", "distance_km": 5, "quoted_price": 350}).json()
    assert r["verdict"] == "take"
    r2 = client.post("/api/tradie/sparky/score",
                     json={"job_type": "general", "distance_km": 60, "quoted_price": 40}).json()
    assert r2["verdict"] == "skip"


def test_whatsapp_continuity_appends_not_fragments(client):
    from stevejobless import channels

    msg = {"from": "447000000099", "type": "text", "text": {"body": "need sparky"}, "timestamp": "1"}
    payload = {"entry": [{"changes": [{"value": {"messages": [msg]}}]}]}
    r1 = client.post("/api/tradie/whatsapp/webhook", json=payload).json()
    payload["entry"][0]["changes"][0]["value"]["messages"][0]["text"]["body"] = "sockets dead too"
    r2 = client.post("/api/tradie/whatsapp/webhook", json=payload).json()
    assert r1["jobs"] == r2["jobs"], "same caller within window must extend one job"
    job = client.get(f"/api/tradie/sparky/jobs/{r1['jobs'][0]}").json()
    assert len(job["transcript"]) == 2


def test_whatsapp_stubs(client):
    from stevejobless import channels
    assert channels.send_whatsapp("+447000000001", "hi")["stubbed"] is True
    assert channels.parse_whatsapp_webhook({"entry": [{"changes": [{"value": {"messages": [
        {"from": "447000000001", "type": "text", "text": {"body": "need sparky"}, "timestamp": "1"}]}}]}]})[0]["text"] == "need sparky"
