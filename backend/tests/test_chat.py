import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

class MockChunk:
    def __init__(self, content):
        self.content = content

class MockOutput:
    def __init__(self):
        self.usage_metadata = {"total_tokens": 42}

@pytest.fixture
def mock_agent():
    async def fake_stream(*args, **kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MockChunk("Xin chào, ")}
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MockChunk("tôi có thể giúp gì cho bạn?")}
        }
        yield {
            "event": "on_chat_model_end",
            "data": {"output": MockOutput()}
        }

    agent = MagicMock()
    agent.astream_events = fake_stream
    return agent


def test_chat_stream(client: TestClient, auth_headers: dict, mock_agent):
    with patch("app.api.routers.chat.build_agent", return_value=mock_agent):
        res = client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello AI"},
            headers=auth_headers
        )
        assert res.status_code == 200
        content = res.text
        # SSE stream contains data lines
        assert 'data: {"content": "Xin ch\\u00e0o, "}' in content or 'data: {"content": "Xin chào, "}' in content
        assert "done" in content
        assert "session_id" in content

def test_chat_sessions(client: TestClient, auth_headers: dict, mock_agent):
    # First, create a chat to ensure we have a session
    with patch("app.api.routers.chat.build_agent", return_value=mock_agent):
        client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello AI"},
            headers=auth_headers
        )

    res = client.get("/api/v1/chat/sessions", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    session_id = data[0]["id"]

    # Get session messages
    res_msgs = client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=auth_headers)
    assert res_msgs.status_code == 200
    msg_data = res_msgs.json()
    assert "messages" in msg_data
    messages = msg_data["messages"]
    assert len(messages) >= 2 # 1 user, 1 assistant
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello AI"
    assert messages[1]["role"] == "assistant"
    assert "Xin chào," in messages[1]["content"]
