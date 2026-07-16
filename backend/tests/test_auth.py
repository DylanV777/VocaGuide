import jwt
import pytest
from fastapi import HTTPException

from app.dependencies import get_current_user, require_role
from app.models import User
from app.security import create_access_token, decode_access_token


def make_user(role: str) -> User:
    return User(id=1, email="user@example.com", hashed_password="hash", role=role)


def test_create_and_decode_access_token_round_trip():
    token = create_access_token(email="user@example.com", role="usuario")
    payload = decode_access_token(token)

    assert payload["sub"] == "user@example.com"
    assert payload["role"] == "usuario"


def test_decode_access_token_rejects_invalid_token():
    with pytest.raises(jwt.PyJWTError):
        decode_access_token("token-invalido")


def test_get_current_user_rejects_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="token-invalido", db=None)

    assert exc_info.value.status_code == 401


def test_require_role_allows_matching_role():
    admin_user = make_user(role="admin")
    dependency = require_role("admin")

    assert dependency(current_user=admin_user) is admin_user


def test_require_role_rejects_non_matching_role():
    regular_user = make_user(role="usuario")
    dependency = require_role("admin")

    with pytest.raises(HTTPException) as exc_info:
        dependency(current_user=regular_user)

    assert exc_info.value.status_code == 403
