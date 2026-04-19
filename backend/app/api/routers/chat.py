from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid
import json

from sse_starlette.sse import EventSourceResponse

from app.api.deps import SessionDep, CurrentUser
from app.models.chat import ChatSession, ChatMessage, ChatRoleEnum
from app.models.user import Pet
from app.services.chat_agent import agent_executor

from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    pet_id: Optional[str] = None

@router.post("/stream")
def chat_stream(req: ChatRequest, db: SessionDep, current_user: CurrentUser):
    if req.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == uuid.UUID(req.session_id),
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
            
        pet_id = session.pet_id
    else:
        pet_id = uuid.UUID(req.pet_id) if req.pet_id else None
        session = ChatSession(
            user_id=current_user.id,
            pet_id=pet_id,
            title=req.message[:30] + "..."
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
    pet_context = ""
    if pet_id:
        pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
        if pet:
            pet_context = f"- Tên: {pet.name}\n- Loài: {pet.species.value}\n- Giống: {pet.breed or 'Không rõ'}\n- Tuổi: {pet.age_months or '?' } tháng\n- Ghi chú: {pet.health_notes or 'Không có'}\n- Dị ứng: {pet.allergies or 'Không có'}"

    hm = ChatMessage(
        session_id=session.id,
        role=ChatRoleEnum.user,
        content=req.message
    )
    db.add(hm)
    db.commit()
    
    past_msgs = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc()).all()
    history = []
    for msg in past_msgs:
        if msg.role == ChatRoleEnum.user:
            history.append(HumanMessage(content=msg.content))
        elif msg.role == ChatRoleEnum.assistant:
            history.append(AIMessage(content=msg.content))

    async def event_generator():
        state = {"messages": history, "pet_context": pet_context}
        full_content = ""
        total_tokens = 0
        try:
            async for chunk in agent_executor.astream(state, stream_mode="messages"):
                msg_chunk, metadata = chunk
                if msg_chunk.content:
                    full_content += msg_chunk.content
                    yield {
                        "event": "message",
                        "data": json.dumps({"content": msg_chunk.content})
                    }
                    
                # Optionally track usage if needed from metadata or chunk
                if hasattr(msg_chunk, "usage_metadata") and msg_chunk.usage_metadata is not None:
                    total_tokens += msg_chunk.usage_metadata.get("total_tokens", 0)

            am = ChatMessage(
                session_id=session.id,
                role=ChatRoleEnum.assistant,
                content=full_content,
                token_usage={"total_tokens": total_tokens} if total_tokens else None
            )
            db.add(am)
            db.commit()
            
            yield {
                "event": "done",
                "data": json.dumps({"session_id": str(session.id)})
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())
