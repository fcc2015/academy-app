import contextvars

# Global Context Variables to store authenticated user details across the request lifecycle
academy_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("academy_id", default=None)
user_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default=None)
role_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("role", default=None)
