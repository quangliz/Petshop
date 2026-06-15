import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessageChunk


@pytest.fixture
def mock_agent():
    """Mock agent that uses astream(stream_mode='messages') format."""

    async def fake_astream(*args, **kwargs):
        meta = {"langgraph_node": "agent", "langgraph_step": 1}
        # First content chunk
        yield AIMessageChunk(content="Xin chào, "), meta
        # Second content chunk
        yield AIMessageChunk(content="tôi có thể giúp gì cho bạn?"), meta
        # Final chunk with usage metadata
        yield AIMessageChunk(
            content="",
            usage_metadata={"input_tokens": 20, "output_tokens": 22, "total_tokens": 42},
            response_metadata={"model_name": "gpt-4o-mini"},
        ), meta

    agent = MagicMock()
    agent.astream = fake_astream
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
        assert "event: session" in content
        assert "event: status" in content
        assert content.index("event: session") < content.index("Xin ch")
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


def test_guest_chat_stream(client: TestClient, mock_agent):
    with patch("app.api.routers.chat.build_agent", return_value=mock_agent):
        res = client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello AI as guest"}
        )
        assert res.status_code == 200
        content = res.text
        assert "event: session" in content
        assert "event: status" in content
        assert content.index("event: session") < content.index("Xin ch")
        assert 'data: {"content": "Xin ch\\u00e0o, "}' in content or 'data: {"content": "Xin chào, "}' in content
        assert "done" in content
        assert "session_id" in content


def test_guest_chat_sessions(client: TestClient, mock_agent):
    with patch("app.api.routers.chat.build_agent", return_value=mock_agent):
        res = client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello guest"}
        )
        assert res.status_code == 200

        import re
        m = re.search(r'"session_id":\s*"([^"]+)"', res.text)
        assert m is not None, f"Could not find session_id in response: {res.text}"
        session_id = m.group(1)

    # Get session messages as guest (no auth header)
    res_msgs = client.get(f"/api/v1/chat/sessions/{session_id}/messages")
    assert res_msgs.status_code == 200
    msg_data = res_msgs.json()
    assert "messages" in msg_data
    messages = msg_data["messages"]
    assert len(messages) >= 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello guest"
    assert messages[1]["role"] == "assistant"
