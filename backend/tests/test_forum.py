import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from langchain_core.documents import Document

from app.core.config import settings
from app.models.user import RoleEnum, User
from tests.conftest import _ensure_test_schema


@pytest.fixture(autouse=True)
def mock_incremental_forum_indexing(monkeypatch):
    async def noop(*args, **kwargs):
        return None

    monkeypatch.setattr("app.api.routers.forum._safe_reindex_thread", noop)
    monkeypatch.setattr("app.api.routers.admin.users.reindex_one_forum_thread", noop)
    monkeypatch.setattr("app.api.routers.admin.forum.reindex_one_forum_thread", noop)


def _role_headers(email: str, role: RoleEnum, *, is_expert_verified: bool = False) -> dict:
    db = _ensure_test_schema()()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password="dummy_hashed_password",
                full_name=f"Forum {role.value}",
                role=role,
                is_expert_verified=is_expert_verified if role == RoleEnum.expert else False,
                is_active=True,
            )
            db.add(user)
        else:
            user.role = role
            user.is_expert_verified = is_expert_verified if role == RoleEnum.expert else False
            user.is_active = True
        db.commit()
        db.refresh(user)
        token = jwt.encode(
            {"sub": str(user.id), "type": "access"},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def _long_answer() -> str:
    return (
        "Bạn nên bắt đầu bằng việc ghi lại khẩu phần hiện tại, độ tuổi, cân nặng và phản ứng "
        "sau mỗi bữa ăn của thú cưng. Khi đổi thức ăn, hãy chuyển dần trong nhiều ngày, quan sát "
        "phân, mức năng lượng và tình trạng da lông. Nếu thú cưng có dị ứng đã biết, ưu tiên công "
        "thức có thành phần rõ ràng, ít nguồn đạm lạ, và trao đổi với chuyên gia khi triệu chứng "
        "kéo dài hoặc trở nên nghiêm trọng."
    )


def test_forum_categories_and_thread_search(client: TestClient, auth_headers: dict):
    categories = client.get("/api/v1/forum/categories")
    assert categories.status_code == 200
    assert {"value": "health", "label": "Sức khoẻ"} in categories.json()

    uid = uuid.uuid4().hex[:8]
    payload = {
        "title": f"Mèo con biếng ăn sau khi đổi hạt {uid}",
        "category": "pet_care",
        "body": "Mèo nhà mình mới đổi hạt và ăn ít hơn bình thường, mình muốn hỏi kinh nghiệm theo dõi.",
        "tags": ["meo-con", "doi-hat"],
    }
    created = client.post("/api/v1/forum/threads", json=payload, headers=auth_headers)
    assert created.status_code == 200
    thread = created.json()
    assert thread["slug"]
    assert thread["category"] == "pet_care"

    listing = client.get(f"/api/v1/forum/threads?q={uid}&category=pet_care")
    assert listing.status_code == 200
    data = listing.json()
    assert data["total"] >= 1
    assert any(item["id"] == thread["id"] for item in data["items"])

    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}")
    assert detail.status_code == 200
    assert detail.json()["title"] == payload["title"]


def test_forum_reply_vote_accept_and_ai_thread_eligibility(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(
        f"expert-{uuid.uuid4().hex[:8]}@petshop.dev",
        RoleEnum.expert,
        is_expert_verified=True,
    )
    uid = uuid.uuid4().hex[:8]
    created = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Chọn thức ăn cho mèo nhạy cảm {uid}",
            "category": "health",
            "body": "Mèo nhà mình khá nhạy cảm với một số loại thức ăn, nên chọn khẩu phần như thế nào?",
            "tags": ["dinh-duong"],
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    thread = created.json()

    reply_res = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": _long_answer()},
        headers=expert_headers,
    )
    assert reply_res.status_code == 200
    reply = reply_res.json()
    assert reply["is_expert_answer"]
    assert reply["author"]["is_expert_verified"]
    assert reply["knowledge_status"] == "not_eligible"
    assert reply["knowledge_score"] >= 100

    accepted = client.post(f"/api/v1/forum/replies/{reply['id']}/accept", headers=auth_headers)
    assert accepted.status_code == 200
    assert accepted.json()["accepted_reply_id"] == reply["id"]

    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}")
    assert detail.status_code == 200
    body = detail.json()
    accepted_reply = body["replies"][0]
    assert accepted_reply["is_accepted"]
    assert accepted_reply["knowledge_status"] == "not_eligible"
    assert accepted_reply["knowledge_score"] >= 100
    assert body["knowledge_status"] == "eligible"
    assert body["knowledge_score"] >= 9

    vote = client.post(f"/api/v1/forum/replies/{reply['id']}/votes", json={"value": 1}, headers=auth_headers)
    assert vote.status_code == 200
    assert vote.json()["upvote_count"] == 1


def test_forum_thread_vote_toggle_and_auth_required(client: TestClient, auth_headers: dict):
    uid = uuid.uuid4().hex[:8]
    created = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Review vòng cổ chống ve {uid}",
            "category": "product",
            "body": "Mình muốn hỏi trải nghiệm dùng vòng cổ chống ve cho chó khi đi dạo hằng ngày.",
            "tags": ["san-pham"],
        },
        headers=auth_headers,
    )
    thread = created.json()
    assert client.post(f"/api/v1/forum/threads/{thread['id']}/replies", json={"body": "Chưa đăng nhập"}).status_code == 401

    up = client.post(f"/api/v1/forum/threads/{thread['id']}/votes", json={"value": 1}, headers=auth_headers)
    assert up.status_code == 200
    assert up.json()["upvote_count"] == 1
    down = client.post(f"/api/v1/forum/threads/{thread['id']}/votes", json={"value": -1}, headers=auth_headers)
    assert down.status_code == 200
    assert down.json()["upvote_count"] == 0
    assert down.json()["downvote_count"] == 1


def test_forum_nested_reply_comment(client: TestClient, auth_headers: dict):
    uid = uuid.uuid4().hex[:8]
    thread = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Kinh nghiệm tập chó đi vệ sinh đúng chỗ {uid}",
            "category": "guide",
            "body": "Mình muốn hỏi cách tập chó đi vệ sinh đúng chỗ trong căn hộ nhỏ.",
            "tags": ["training"],
        },
        headers=auth_headers,
    ).json()
    parent = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": "Bạn có thể bắt đầu bằng lịch đi vệ sinh cố định và khen thưởng ngay sau khi bé làm đúng."},
        headers=auth_headers,
    ).json()
    child_res = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": "Cách này có áp dụng được cho chó con mới về nhà khoảng hai tuần không?", "parent_reply_id": parent["id"]},
        headers=auth_headers,
    )
    assert child_res.status_code == 200
    child = child_res.json()
    assert child["parent_reply_id"] == parent["id"]

    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    child_in_detail = next(reply for reply in detail["replies"] if reply["id"] == child["id"])
    assert child_in_detail["parent_reply_id"] == parent["id"]


def test_admin_forum_moderation_and_role_assignment(client: TestClient, admin_headers: dict):
    uid = uuid.uuid4().hex[:8]
    user_headers = _role_headers(f"moderated-{uid}@petshop.dev", RoleEnum.user)
    me = client.get("/api/v1/auth/me", headers=user_headers).json()

    role_res = client.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "expert"}, headers=admin_headers)
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "expert"
    assert role_res.json()["is_expert_verified"] is False
    assert client.get("/api/v1/auth/me", headers=user_headers).json()["role"] == "expert"

    created = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Lịch workshop chăm sóc chó mèo {uid}",
            "category": "event",
            "body": "Có sự kiện nào cho pet cuối tuần này không, mình muốn tham khảo lịch và cách đăng ký.",
            "tags": ["event"],
        },
        headers=user_headers,
    )
    thread = created.json()

    admin_threads = client.get("/api/v1/admin/forum/threads", headers=admin_headers)
    assert admin_threads.status_code == 200
    assert any(item["id"] == thread["id"] for item in admin_threads.json()["items"])

    patch_res = client.patch(
        f"/api/v1/admin/forum/threads/{thread['id']}",
        json={"status": "hidden", "is_locked": True, "is_ai_blocked": True},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "hidden"
    assert client.get(f"/api/v1/forum/threads/{thread['slug']}").status_code == 404


def test_expert_verification_recomputes_existing_forum_reply_quality(client: TestClient, admin_headers: dict):
    user_headers = _role_headers(f"future-expert-{uuid.uuid4().hex[:8]}@petshop.dev", RoleEnum.user)
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    uid = uuid.uuid4().hex[:8]
    thread = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Chọn lược chải lông cho mèo {uid}",
            "category": "pet_care",
            "body": "Mèo nhà mình lông dài và dễ rối, nên chọn lược và lịch chải như thế nào?",
            "tags": ["long"],
        },
        headers=user_headers,
    ).json()
    reply = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": _long_answer()},
        headers=user_headers,
    ).json()
    client.post(f"/api/v1/forum/replies/{reply['id']}/accept", headers=user_headers)
    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    assert detail["replies"][0]["knowledge_status"] == "not_eligible"
    assert detail["replies"][0]["is_expert_answer"] is False

    role_res = client.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "expert"}, headers=admin_headers)
    assert role_res.status_code == 200
    assert role_res.json()["is_expert_verified"] is False
    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    assert detail["replies"][0]["is_expert_answer"] is False

    verify_res = client.put(
        f"/api/v1/admin/users/{me['id']}/expert-verification",
        json={"is_expert_verified": True},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["is_expert_verified"] is True
    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    assert detail["replies"][0]["is_expert_answer"] is True
    assert detail["replies"][0]["author"]["is_expert_verified"] is True
    assert detail["replies"][0]["knowledge_status"] == "not_eligible"
    assert detail["replies"][0]["knowledge_score"] >= 100


def test_verified_expert_upvote_marks_community_answer_expert_like(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(
        f"upvote-expert-{uuid.uuid4().hex[:8]}@petshop.dev",
        RoleEnum.expert,
        is_expert_verified=True,
    )
    uid = uuid.uuid4().hex[:8]
    thread = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Chọn đồ chơi giảm stress cho mèo {uid}",
            "category": "product",
            "body": "Mèo nhà mình hay cào sofa, có loại đồ chơi nào giúp giảm stress và chuyển hướng hành vi không?",
            "tags": ["do-choi"],
        },
        headers=auth_headers,
    ).json()
    reply = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": "Nhà mình dùng trụ cào kết hợp đồ chơi câu mèo, đặt cạnh sofa và thưởng khi bé cào đúng chỗ."},
        headers=auth_headers,
    ).json()

    vote = client.post(f"/api/v1/forum/replies/{reply['id']}/votes", json={"value": 1}, headers=expert_headers)
    assert vote.status_code == 200
    assert vote.json()["expert_upvote_count"] == 1
    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    updated = next(item for item in detail["replies"] if item["id"] == reply["id"])
    assert updated["knowledge_score"] >= 12


def test_forum_reindex_adds_eligible_forum_metadata(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(
        f"reindex-expert-{uuid.uuid4().hex[:8]}@petshop.dev",
        RoleEnum.expert,
        is_expert_verified=True,
    )
    uid = uuid.uuid4().hex[:8]
    thread = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Chăm sóc lông mèo dài {uid}",
            "category": "pet_care",
            "body": "Mèo lông dài cần chải lông và chọn đồ dùng chăm sóc như thế nào để giảm rối lông?",
            "tags": ["grooming"],
        },
        headers=auth_headers,
    ).json()
    reply = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": _long_answer()},
        headers=expert_headers,
    ).json()
    client.post(f"/api/v1/forum/replies/{reply['id']}/accept", headers=auth_headers)

    store = MagicMock()
    with patch("app.services.indexing.get_knowledge_store", return_value=store), patch(
        "app.services.indexing._wipe_collection", new=AsyncMock()
    ):
        from app.database import AsyncSessionLocal
        from app.services.indexing import reindex_knowledge

        async def run_reindex():
            async with AsyncSessionLocal() as db:
                return await reindex_knowledge(db)

        count = asyncio.run(run_reindex())

    assert count >= 1
    assert store.add_documents.called
    docs = store.add_documents.call_args.args[0]
    forum_docs = [doc for doc in docs if doc.metadata.get("source_type") == "forum_thread"]
    assert forum_docs
    assert any(
        doc.metadata["thread_id"] == thread["id"]
        and doc.metadata["thread_slug"] == thread["slug"]
        and "reply_id" not in doc.metadata
        for doc in forum_docs
    )
    assert not any(_long_answer() in doc.page_content for doc in forum_docs)


def test_forum_discussion_search_uses_thread_vector_and_filters_answers(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(
        f"retrieval-expert-{uuid.uuid4().hex[:8]}@petshop.dev",
        RoleEnum.expert,
        is_expert_verified=True,
    )
    uid = uuid.uuid4().hex[:8]
    thread = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Mèo bị rối lông khi thay mùa {uid}",
            "category": "pet_care",
            "body": "Mèo lông dài nhà mình bị rối lông nhiều khi thay mùa, nên chải và chọn dụng cụ thế nào?",
            "tags": ["grooming"],
        },
        headers=auth_headers,
    ).json()
    expert_reply = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": _long_answer()},
        headers=expert_headers,
    ).json()
    normal_reply = client.post(
        f"/api/v1/forum/threads/{thread['id']}/replies",
        json={"body": "Mình chỉ chải khi rảnh thôi."},
        headers=auth_headers,
    ).json()

    store = MagicMock()
    store.similarity_search_with_score_by_vector.return_value = [
        (
            Document(
                page_content="thread vector",
                metadata={"source_type": "forum_thread", "thread_id": thread["id"]},
            ),
            0.05,
        )
    ]
    async def mock_embed(*args, **kwargs):
        return [0.1] * 1536

    with patch("app.services.retrieval.get_knowledge_store", return_value=store), \
         patch("app.services.embeddings.embed_query_cached", mock_embed):
        from app.database import AsyncSessionLocal
        from app.services.retrieval import search_forum_discussions

        async def run_search():
            async with AsyncSessionLocal() as db:
                return await search_forum_discussions(db, "mèo rối lông thay mùa", limit=2)

        results = asyncio.run(run_search())

    assert results
    assert results[0]["source_type"] == "forum_thread"
    assert results[0]["title"] == f"Forum: {thread['title']}"
    assert expert_reply["body"] in results[0]["content"]
    assert "chuyên gia đã xác minh" in results[0]["content"]
    assert normal_reply["body"] not in results[0]["content"]
