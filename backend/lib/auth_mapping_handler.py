
"""
Lightweight request authentication helper.
Extracts a user identifier from either the query param `userId` or the header `x-user-id`.
Used by chat routes to associate sessions to a user while the full auth layer is not present.
"""

from fastapi import HTTPException, Request


async def verify_session_and_get_user_id(request: Request) -> str:
	"""
	Return the userId provided by the client. This is a temporary shim until
	proper auth/session mapping is restored.
	"""
	user_id = request.query_params.get("userId") or request.headers.get("x-user-id")
	if not user_id:
		raise HTTPException(status_code=401, detail="Missing userId")
	return user_id
