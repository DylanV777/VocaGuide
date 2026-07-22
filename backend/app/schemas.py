import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    gender: Literal["hombre", "mujer"]

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
    first_name: str | None
    last_name: str | None
    country: str | None
    gender: str | None
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

    id: int
    code: str
    name: str
    description: str


class CareerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str


class CareerDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    profile: VocationalProfileOut


class TestSubmitOut(BaseModel):
    attempt_id: int
    result_id: int
    profile: VocationalProfileOut
    recommended_careers: list[CareerOut]
    message: str = "Test completado. Este es tu perfil vocacional y tus carreras recomendadas."


class ResultHistoryItemOut(BaseModel):
    id: int
    profile: VocationalProfileOut
    created_at: datetime


class QuestionCreate(BaseModel):
    text: str = Field(min_length=1)
    profile_id: int
    order: int | None = None


class QuestionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    profile_id: int | None = None
    order: int | None = None


class AdminQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    text: str
    profile_id: int


class CareerCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    profile_id: int


class CareerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    profile_id: int | None = None


class AdminAnalyticsOut(BaseModel):
    total_completed_tests: int
    most_frequent_profile: VocationalProfileOut | None
    most_recommended_career: CareerOut | None
