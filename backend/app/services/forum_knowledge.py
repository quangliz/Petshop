from __future__ import annotations

from dataclasses import dataclass

from app.models.forum import (
    ForumCategoryEnum,
    ForumReply,
    ForumStatusEnum,
    ForumThread,
    KnowledgeStatusEnum,
)
from app.models.user import RoleEnum, User
from app.services.ai_safety import is_emergency_query, looks_like_prompt_injection


MIN_FORUM_KNOWLEDGE_CHARS = 180
INDEXABLE_CATEGORIES = {
    ForumCategoryEnum.health,
    ForumCategoryEnum.product,
    ForumCategoryEnum.guide,
    ForumCategoryEnum.pet_care,
}


@dataclass(frozen=True)
class ForumKnowledgeDecision:
    status: KnowledgeStatusEnum
    score: int
    reason: str


def forum_reply_source_text(thread: ForumThread, reply: ForumReply) -> str:
    tags = ", ".join(thread.tags or [])
    return (
        f"Câu hỏi forum: {thread.title}\n"
        f"Chủ đề: {thread.category.value}\n"
        f"Tags: {tags or 'không có'}\n\n"
        f"Nội dung câu hỏi:\n{thread.body}\n\n"
        f"Câu trả lời được chọn làm nguồn tham khảo:\n{reply.body}"
    )


def forum_reply_trust_level(reply: ForumReply, author: User | None) -> str:
    if author and author.role == RoleEnum.expert:
        return "expert"
    if reply.is_accepted:
        return "accepted"
    return "community"


def evaluate_forum_reply_knowledge(
    *,
    thread: ForumThread,
    reply: ForumReply,
    author: User | None,
) -> ForumKnowledgeDecision:
    score = int(reply.upvote_count or 0)
    if reply.is_accepted:
        score += 5
    if author and author.role == RoleEnum.expert:
        score += 4
    if (thread.upvote_count or 0) >= 3:
        score += 2

    if thread.status != ForumStatusEnum.published or reply.status != ForumStatusEnum.published:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "hidden_or_deleted")
    if thread.is_ai_blocked or reply.is_ai_blocked:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "ai_blocked")
    if thread.category not in INDEXABLE_CATEGORIES:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "category_not_indexed")
    if len((reply.body or "").strip()) < MIN_FORUM_KNOWLEDGE_CHARS:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "reply_too_short")

    source = f"{thread.title}\n{thread.body}\n{reply.body}"
    if looks_like_prompt_injection(source):
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "prompt_injection")
    if is_emergency_query(source):
        return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "case_specific_emergency")

    is_expert = bool(author and author.role == RoleEnum.expert)
    if thread.category == ForumCategoryEnum.health:
        if not is_expert:
            return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "health_requires_expert")
        if score < 8:
            return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "health_score_below_threshold")
        return ForumKnowledgeDecision(KnowledgeStatusEnum.eligible, score, "health_expert_threshold_met")

    has_quality_signal = reply.is_accepted or is_expert or (reply.upvote_count or 0) >= 5
    if score >= 6 and has_quality_signal:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.eligible, score, "community_threshold_met")
    return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "score_below_threshold")


def apply_forum_knowledge_decision(
    *,
    thread: ForumThread,
    reply: ForumReply,
    author: User | None,
) -> ForumKnowledgeDecision:
    decision = evaluate_forum_reply_knowledge(thread=thread, reply=reply, author=author)
    reply.knowledge_status = decision.status
    reply.knowledge_score = decision.score
    reply.is_expert_answer = bool(author and author.role == RoleEnum.expert)
    return decision
