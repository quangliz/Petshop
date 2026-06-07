from __future__ import annotations

from dataclasses import dataclass

from app.models.forum import (
    ForumReply,
    ForumStatusEnum,
    ForumThread,
    KnowledgeStatusEnum,
)
from app.models.user import RoleEnum, User
from app.services.ai_safety import is_emergency_query, looks_like_prompt_injection


MIN_FORUM_THREAD_CHARS = 20


@dataclass(frozen=True)
class ForumKnowledgeDecision:
    status: KnowledgeStatusEnum
    score: int
    reason: str


def is_verified_expert(user: User | None) -> bool:
    return bool(user and user.role == RoleEnum.expert and user.is_expert_verified)


def forum_thread_source_text(thread: ForumThread) -> str:
    tags = ", ".join(thread.tags or [])
    return (
        f"Bài đăng forum: {thread.title}\n"
        f"Chủ đề: {thread.category.value}\n"
        f"Tags: {tags or 'không có'}\n\n"
        f"Nội dung bài đăng:\n{thread.body}"
    )


def forum_thread_quality_score(thread: ForumThread, replies: list[ForumReply] | None = None) -> int:
    replies = replies if replies is not None else list(getattr(thread, "replies", []) or [])
    score = int(thread.upvote_count or 0)
    if thread.accepted_reply_id:
        score += 5
    if any(reply.is_expert_answer and reply.status == ForumStatusEnum.published for reply in replies):
        score += 4
    if len([reply for reply in replies if reply.status == ForumStatusEnum.published]) >= 2:
        score += 2
    return score


def evaluate_forum_thread_knowledge(thread: ForumThread, replies: list[ForumReply] | None = None) -> ForumKnowledgeDecision:
    score = forum_thread_quality_score(thread, replies)
    if thread.status != ForumStatusEnum.published:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "hidden_or_deleted")
    if thread.is_ai_blocked:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "ai_blocked")
    if len((thread.body or "").strip()) < MIN_FORUM_THREAD_CHARS:
        return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "thread_too_short")
    source = f"{thread.title}\n{thread.body}"
    if looks_like_prompt_injection(source):
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "prompt_injection")
    if is_emergency_query(source):
        return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "case_specific_emergency")
    return ForumKnowledgeDecision(KnowledgeStatusEnum.eligible, score, "thread_indexable")


def apply_forum_thread_knowledge_decision(thread: ForumThread, replies: list[ForumReply] | None = None) -> ForumKnowledgeDecision:
    decision = evaluate_forum_thread_knowledge(thread, replies)
    thread.knowledge_status = decision.status
    thread.knowledge_score = decision.score
    return decision


def forum_reply_answer_score(reply: ForumReply, author: User | None) -> int:
    if reply.status != ForumStatusEnum.published or reply.is_ai_blocked:
        return -1
    if is_verified_expert(author):
        return 100 + int(reply.upvote_count or 0)
    score = int(reply.upvote_count or 0) * 2
    score += int(reply.expert_upvote_count or 0) * 12
    if reply.is_accepted:
        score += 20
    return score


def apply_forum_reply_quality(reply: ForumReply, author: User | None) -> ForumKnowledgeDecision:
    score = max(0, forum_reply_answer_score(reply, author))
    reply.knowledge_score = score
    reply.is_expert_answer = is_verified_expert(author)
    if reply.status != ForumStatusEnum.published or reply.is_ai_blocked:
        reply.knowledge_status = KnowledgeStatusEnum.blocked
        return ForumKnowledgeDecision(KnowledgeStatusEnum.blocked, score, "reply_hidden_or_blocked")
    reply.knowledge_status = KnowledgeStatusEnum.not_eligible
    return ForumKnowledgeDecision(KnowledgeStatusEnum.not_eligible, score, "reply_scored_not_embedded")
