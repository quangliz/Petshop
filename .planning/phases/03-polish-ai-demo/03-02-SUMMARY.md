---
plan: "03-02"
phase: 3
status: complete
self_check: PASSED
key-files:
  created:
    - backend/app/services/pets_service.py
  modified:
    - backend/app/api/routers/pets.py
    - backend/app/api/routers/chat.py
    - backend/app/services/chat_agent.py
---

## Summary

Extracted pet profile helpers into a standalone `pets_service.py` service module to avoid circular imports, then wired Redis-cached pet profiles into the chat system prompt. Added source URL citations to `search_knowledge_tool` output and a citation instruction to `SYSTEM_PROMPT_BASE`.

## What Was Built

- **`backend/app/services/pets_service.py`** (new): `_pet_profile_text`, `_pet_profile_hash`, and `get_pet_profile_cached` — computes a Vietnamese pet profile string and caches it in Redis (TTL 5 min) keyed by profile content hash.
- **`backend/app/api/routers/pets.py`**: Imports helpers from `pets_service` instead of defining them inline.
- **`backend/app/api/routers/chat.py`**: Replaces inline pet context construction with `get_pet_profile_cached`; system prompt now includes personalised pet profile.
- **`backend/app/services/chat_agent.py`**: `search_knowledge_tool` now appends `Nguồn: <url>` lines when source_url is present; `SYSTEM_PROMPT_BASE` instructs the model to cite sources.

## Requirement Coverage

- AI-09: Pet profile personalisation in system prompt ✓
- AI-10: Product link rendering confirmed already satisfied ✓
- AI-11: Source URL citations in knowledge tool ✓

## Self-Check

- [x] `pets_service.py` importable
- [x] `chat.py` router importable
- [x] `pets.py` router importable
- [x] `search_knowledge_tool` contains `r.get('source_url')` and `"Nguồn:"`
- [x] `SYSTEM_PROMPT_BASE` contains citation instruction
