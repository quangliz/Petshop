import logging
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chat import ChatSession, ChatMessage, ChatRoleEnum

logger = logging.getLogger(__name__)

async def compact_history_if_needed(
    db: AsyncSession,
    session: ChatSession,
    past_msgs: List[ChatMessage],
    limit: int = 14,
    keep: int = 6,
) -> List[ChatMessage]:
    """Compacts the dialogue history if the number of messages exceeds the limit.
    
    Summarizes the oldest messages (excluding the last `keep` messages), deletes them
    from the database, and updates the ChatSession's `context_summary` field.
    """
    if len(past_msgs) < limit:
        return past_msgs

    # Keep the last `keep` messages intact
    to_compact = past_msgs[:-keep]
    to_keep = past_msgs[-keep:]

    # Format the dialogue that will be compacted
    dialogue_lines = []
    for msg in to_compact:
        role_name = "Người dùng" if msg.role == ChatRoleEnum.user else "Trợ lý AI"
        dialogue_lines.append(f"{role_name}: {msg.content}")
    dialogue_text = "\n".join(dialogue_lines)

    # Build prompt for summarization
    if session.context_summary:
        prompt = (
            "Hãy cập nhật bản tóm tắt cuộc hội thoại bằng tiếng Việt dựa trên tóm tắt cũ và diễn biến mới dưới đây.\n\n"
            f"Tóm tắt cũ:\n{session.context_summary}\n\n"
            f"Diễn biến mới tiếp theo:\n{dialogue_text}\n\n"
            "Yêu cầu:\n"
            "1. Viết một bản tóm tắt cực kỳ ngắn gọn, súc tích (khoảng 3-5 câu).\n"
            "2. Tập trung vào các chi tiết quan trọng nhất (ví dụ: loài thú cưng mèo/chó, độ tuổi, triệu chứng sức khỏe, nhu cầu dinh dưỡng, sản phẩm đã giới thiệu hoặc đã chọn).\n"
            "3. Không bịa đặt thông tin mới."
        )
    else:
        prompt = (
            "Hãy viết một bản tóm tắt nội dung cuộc hội thoại dưới đây bằng tiếng Việt.\n\n"
            f"Nội dung hội thoại:\n{dialogue_text}\n\n"
            "Yêu cầu:\n"
            "1. Viết một bản tóm tắt cực kỳ ngắn gọn, súc tích (khoảng 3-5 câu).\n"
            "2. Tập trung vào các chi tiết quan trọng nhất (ví dụ: loài thú cưng mèo/chó, độ tuổi, triệu chứng sức khỏe, nhu cầu dinh dưỡng, sản phẩm đã giới thiệu hoặc đã chọn).\n"
            "3. Không bịa đặt thông tin mới."
        )

    try:
        llm = ChatOpenAI(
            model=settings.CHAT_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
            timeout=15,
            max_retries=2,
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        new_summary = response.content.strip()

        # Update session summary in DB
        session.context_summary = new_summary
        db.add(session)

        # Delete compacted messages from DB
        for msg in to_compact:
            await db.delete(msg)
            
        await db.commit()
        logger.info(
            "Successfully compacted %d messages for session %s. New summary length: %d chars.",
            len(to_compact),
            session.id,
            len(new_summary),
        )
        return to_keep
    except Exception as e:
        logger.exception("Failed to compact chat history for session %s: %s", session.id, str(e))
        # In case of any error, fail gracefully and return the original history to avoid breaking the chat
        return past_msgs
