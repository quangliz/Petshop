import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessageChunk

from app.api.routers.chat import _extract_products, _remove_invalid_product_tags


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


@pytest.fixture
def mock_agent_with_planner_and_duplicate():
    """Mock the real multi-generation flow that caused two bugs:

    1. The planner node streams structured-output JSON — must NOT reach the user.
    2. An intermediate agent answer (pre-enforcement) is regenerated — the final
       message must contain the answer exactly once, not concatenated.
    """

    async def fake_astream(*args, **kwargs):
        planner_meta = {"langgraph_node": "planner", "langgraph_step": 1}
        agent_meta = {"langgraph_node": "agent", "langgraph_step": 2}

        # Generation 1: planner structured-output JSON (must be suppressed)
        yield AIMessageChunk(content='{"required_tools": ["search_products_tool"]}'), planner_meta
        yield AIMessageChunk(
            content="",
            usage_metadata={"input_tokens": 10, "output_tokens": 8, "total_tokens": 18},
        ), planner_meta

        # Generation 2: agent draft answer (pre-enforcement)
        yield AIMessageChunk(content="Câu trả lời cuối cùng."), agent_meta
        yield AIMessageChunk(
            content="",
            usage_metadata={"input_tokens": 20, "output_tokens": 10, "total_tokens": 30},
        ), agent_meta

        # Generation 3: agent regenerates the same answer (the duplicate)
        yield AIMessageChunk(content="Câu trả lời cuối cùng."), agent_meta
        yield AIMessageChunk(
            content="",
            usage_metadata={"input_tokens": 25, "output_tokens": 10, "total_tokens": 35},
            response_metadata={"model_name": "gpt-4o-mini"},
        ), agent_meta

    agent = MagicMock()
    agent.astream = fake_astream
    return agent


def test_planner_output_suppressed_and_no_duplicate(
    client: TestClient, auth_headers: dict, mock_agent_with_planner_and_duplicate
):
    with patch(
        "app.api.routers.chat.build_agent",
        return_value=mock_agent_with_planner_and_duplicate,
    ):
        res = client.post(
            "/api/v1/chat/stream",
            json={"message": "tư vấn sản phẩm"},
            headers=auth_headers,
        )
        assert res.status_code == 200
        stream = res.text

    # Planner JSON must never be streamed to the user.
    assert "required_tools" not in stream
    # A reset must be emitted when the duplicate generation supersedes the first.
    assert "event: message_reset" in stream

    # The PERSISTED assistant message must contain the answer exactly once.
    sessions = client.get("/api/v1/chat/sessions", headers=auth_headers).json()
    session_id = sessions[0]["id"]
    msgs = client.get(
        f"/api/v1/chat/sessions/{session_id}/messages", headers=auth_headers
    ).json()["messages"]
    assistant = next(m for m in reversed(msgs) if m["role"] == "assistant")
    assert assistant["content"].count("Câu trả lời cuối cùng.") == 1
    assert "required_tools" not in assistant["content"]


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


class _FakeScalarResult:
    def __init__(self, values):
        self._values = values

    def all(self):
        return self._values


class _FakeDbResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return _FakeScalarResult(self._values)


class _FakeProductDb:
    def __init__(self):
        self.calls = 0

    async def execute(self, _stmt):
        self.calls += 1
        if self.calls == 1:
            return _FakeDbResult(["real-product"])
        product = MagicMock()
        product.slug = "real-product"
        product.name = "Real Product"
        product.brand = "Brand"
        product.price = 100000
        product.sale_price = None
        product.images = {"main": "https://example.com/product.jpg"}
        return _FakeDbResult([product])


def test_invalid_product_tags_are_not_extracted_or_persisted():
    db = _FakeProductDb()

    cleaned, removed = asyncio.run(
        _remove_invalid_product_tags(
            db,
            "Sai <product>slug</product>, đúng <product>real-product</product>.",
        )
    )
    products = asyncio.run(_extract_products(db, cleaned))

    assert "<product>slug</product>" not in cleaned
    assert "<product>real-product</product>" in cleaned
    assert removed == ["slug"]
    assert products == [{
        "slug": "real-product",
        "name": "Real Product",
        "brand": "Brand",
        "price": 100000.0,
        "sale_price": None,
        "thumbnail_url": "https://example.com/product.jpg",
    }]
