import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.models.user import RoleEnum, User
from tests.conftest import _ensure_test_schema


def _role_headers(email: str, role: RoleEnum) -> dict:
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
                is_active=True,
            )
            db.add(user)
        else:
            user.role = role
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


def test_forum_reply_vote_accept_and_ai_eligibility(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(f"expert-{uuid.uuid4().hex[:8]}@petshop.dev", RoleEnum.expert)
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
    assert reply["knowledge_status"] == "not_eligible"

    accepted = client.post(f"/api/v1/forum/replies/{reply['id']}/accept", headers=auth_headers)
    assert accepted.status_code == 200
    assert accepted.json()["accepted_reply_id"] == reply["id"]

    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}")
    assert detail.status_code == 200
    accepted_reply = detail.json()["replies"][0]
    assert accepted_reply["is_accepted"]
    assert accepted_reply["knowledge_status"] == "eligible"
    assert accepted_reply["knowledge_score"] >= 8

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


def test_admin_forum_moderation_and_role_assignment(client: TestClient, auth_headers: dict, admin_headers: dict):
    uid = uuid.uuid4().hex[:8]
    me = client.get("/api/v1/auth/me", headers=auth_headers).json()

    role_res = client.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "expert"}, headers=admin_headers)
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "expert"
    assert client.get("/api/v1/auth/me", headers=auth_headers).json()["role"] == "expert"

    created = client.post(
        "/api/v1/forum/threads",
        json={
            "title": f"Lịch workshop chăm sóc chó mèo {uid}",
            "category": "event",
            "body": "Có sự kiện nào cho pet cuối tuần này không, mình muốn tham khảo lịch và cách đăng ký.",
            "tags": ["event"],
        },
        headers=auth_headers,
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


def test_role_update_recomputes_existing_forum_reply_knowledge(client: TestClient, admin_headers: dict):
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

    role_res = client.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "expert"}, headers=admin_headers)
    assert role_res.status_code == 200
    detail = client.get(f"/api/v1/forum/threads/{thread['slug']}").json()
    assert detail["replies"][0]["knowledge_status"] == "eligible"


def test_forum_reindex_adds_eligible_forum_metadata(client: TestClient, auth_headers: dict):
    expert_headers = _role_headers(f"reindex-expert-{uuid.uuid4().hex[:8]}@petshop.dev", RoleEnum.expert)
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
    forum_docs = [doc for doc in docs if doc.metadata.get("source_type") == "forum"]
    assert forum_docs
    assert any(
        doc.metadata["reply_id"] == reply["id"] and doc.metadata["thread_slug"] == thread["slug"]
        for doc in forum_docs
    )
