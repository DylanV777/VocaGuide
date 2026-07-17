import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Za-z]", value):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not re.search(r"\d", value):
            raise ValueError("La contraseña debe contener al menos un número")
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    created_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    text: str


class AnswerIn(BaseModel):
    question_id: int
    value: int = Field(ge=1, le=5)


class TestSubmitIn(BaseModel):
    answers: list[AnswerIn]


class VocationalProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str


class TestSubmitOut(BaseModel):
    attempt_id: int
    result_id: int
    profile: VocationalProfileOut
    message: str = "Test completado. Este es tu perfil vocacional."
