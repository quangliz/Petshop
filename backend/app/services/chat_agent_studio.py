import uuid
import contextvars
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.services.chat_agent import build_agent

_session_var = contextvars.ContextVar("studio_db_session", default=None)

class StudioAsyncSessionProxy:
    """A lazy proxy for AsyncSession that uses contextvars to manage a task-local session.
    
    This ensures that database connections are managed correctly during local development
    and testing in LangGraph Studio.
    """
    def _get_session(self) -> AsyncSession:
        session = _session_var.get()
        if session is None:
            session = AsyncSessionLocal()
            _session_var.set(session)
        return session

    def __getattr__(self, name):
        return getattr(self._get_session(), name)

db_proxy = StudioAsyncSessionProxy()

# Dummy configuration for LangGraph Studio initialization
dummy_user_id = None
dummy_session_id = uuid.uuid4()

agent = build_agent(
    db=db_proxy,
    user_id=dummy_user_id,
    session_id=dummy_session_id,
)
