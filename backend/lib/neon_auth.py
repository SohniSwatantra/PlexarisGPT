import os
import time
import logging
import requests
from jose import jwk, jwt
from jose.utils import base64url_decode

logger = logging.getLogger(__name__)

_jwks_cache = {"keys": None, "expires": 0.0}


def _get_jwks():
    """Fetch and cache JWKS keys from Neon Auth."""
    jwks_url = os.getenv("NEON_AUTH_JWKS_URL")
    if not jwks_url:
        raise ValueError("NEON_AUTH_JWKS_URL is not configured")

    now = time.time()
    if _jwks_cache["keys"] and _jwks_cache["expires"] > now:
        return _jwks_cache["keys"]

    response = requests.get(jwks_url, timeout=5)
    response.raise_for_status()
    jwks = response.json()
    # Cache for 10 minutes
    _jwks_cache["keys"] = jwks
    _jwks_cache["expires"] = now + 600
    return jwks


def verify_neon_jwt(token: str) -> dict:
    """
    Verify a Neon Auth JWT using the configured JWKS.

    Returns the decoded claims if verification succeeds; raises on failure.
    """
    if not token:
        raise ValueError("Missing JWT")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise ValueError(f"Invalid token header: {exc}") from exc

    jwks = _get_jwks()
    keys = jwks.get("keys", [])
    key_data = next((k for k in keys if k.get("kid") == unverified_header.get("kid")), None)
    if not key_data:
        raise ValueError("Unable to find matching JWKS key for token")

    public_key = jwk.construct(key_data)

    # Verify signature manually before full decode
    message, encoded_sig = str(token).rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode())
    if not public_key.verify(message.encode(), decoded_sig):
        raise ValueError("Invalid token signature")

    issuer = os.getenv("NEON_AUTH_ISSUER") or os.getenv("NEON_AUTH_URL")
    audience = os.getenv("NEON_AUTH_AUDIENCE")

    options = {"verify_aud": bool(audience)}

    decoded = jwt.decode(
        token,
        key_data,
        algorithms=[unverified_header.get("alg", "RS256")],
        audience=audience if audience else None,
        issuer=issuer if issuer else None,
        options=options,
    )
    return decoded
