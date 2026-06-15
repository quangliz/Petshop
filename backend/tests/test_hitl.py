import pytest
import re
import uuid
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.models.chat import ChatRoutingStatusEnum, ChatSession

class MockChunk:
    def __init__(self, content):
        self.content = content

class MockOutput:
    def __init__(self):
        self.usage_metadata = {"total_tokens": 10}

@pytest.fixture
def mock_agent():
    async def fake_stream(*args, **kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MockChunk("AI response")}
        }
        yield {
            "event": "on_chat_model_end",
            "data": {"output": MockOutput()}
        }

    agent = MagicMock()
    agent.astream_events = fake_stream
    return agent

def test_hitl_flow(client: TestClient, auth_headers: dict, admin_headers: dict, mock_agent):
    # 1. Start a new session by sending a message
    with patch("app.api.routers.chat.build_agent", return_value=mock_agent):
        res = client.post(
            "/api/v1/chat/stream",
            json={"message": "Tôi cần gặp nhân viên hỗ trợ gấp!"},
            headers=auth_headers
        )
        assert res.status_code == 200
        content = res.text
        assert "session_id" in content

        # Extract the session_id
        m = re.search(r'"session_id":\s*"([^"]+)"', content)
        assert m is not None
        session_id = m.group(1)

    # 2. Set status in DB to test routing.
    from tests.conftest import _ensure_test_schema
    db_session = _ensure_test_schema()()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id)).first()
        assert session is not None
        session.routing_status = ChatRoutingStatusEnum.pending_human
        db_session.commit()
    finally:
        db_session.close()

    # 3. User sends another message to this session. It should bypass AI and get wait notification.
    res_bypass = client.post(
        "/api/v1/chat/stream",
        json={"message": "Alo?", "session_id": session_id},
        headers=auth_headers
    )
    assert res_bypass.status_code == 200
    assert "Trò chuyện đang được chuyển tiếp/xử lý bởi nhân viên hỗ trợ" in res_bypass.text

    # 4. Admin lists pending sessions
    res_pending = client.get("/api/v1/chat/admin/sessions/pending", headers=admin_headers)
    assert res_pending.status_code == 200
    pending_list = res_pending.json()
    assert isinstance(pending_list, list)
    matching_sessions = [s for s in pending_list if s["id"] == session_id]
    assert len(matching_sessions) == 1
    assert matching_sessions[0]["routing_status"] == "pending_human"

    # 5. Admin claims the session
    res_claim = client.post(f"/api/v1/chat/admin/sessions/{session_id}/claim", headers=admin_headers)
    assert res_claim.status_code == 200
    assert res_claim.json()["status"] == "claimed"

    # 6. Verify status updated to human
    db_session = _ensure_test_schema()()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id)).first()
        assert session.routing_status == ChatRoutingStatusEnum.human
    finally:
        db_session.close()

    # 7. Admin sends a message to the user
    res_msg = client.post(
        f"/api/v1/chat/admin/sessions/{session_id}/messages",
        json={"message": "Chào bạn, mình là nhân viên đây. Bạn cần giúp gì ạ?"},
        headers=admin_headers
    )
    assert res_msg.status_code == 200
    msg_data = res_msg.json()
    assert msg_data["content"] == "Chào bạn, mình là nhân viên đây. Bạn cần giúp gì ạ?"
    assert msg_data["is_from_human"] is True

    # 8. User gets session messages, should see admin's message with is_from_human=True
    res_messages = client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=auth_headers)
    assert res_messages.status_code == 200
    msgs_data = res_messages.json()["messages"]
    admin_msg = [m for m in msgs_data if m.get("is_from_human") is True]
    assert len(admin_msg) == 1
    assert admin_msg[0]["content"] == "Chào bạn, mình là nhân viên đây. Bạn cần giúp gì ạ?"

    # 9. Admin closes session
    res_close = client.post(f"/api/v1/chat/admin/sessions/{session_id}/close", headers=admin_headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "closed"

    # 10. Check that routing_status is back to ai
    db_session = _ensure_test_schema()()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id)).first()
        assert session.routing_status == ChatRoutingStatusEnum.ai
    finally:
        db_session.close()
