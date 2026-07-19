from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models import Career, Question, VocationalProfile
from app.routers.test import RECOMMENDED_CAREERS_COUNT
from app.schemas import (
    AdminQuestionOut,
    CareerCreate,
    CareerDetailOut,
    CareerUpdate,
    QuestionCreate,
    QuestionUpdate,
    VocationalProfileOut,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])


def would_break_minimum_careers(current_count_for_profile: int, minimum_required: int = RECOMMENDED_CAREERS_COUNT) -> bool:
    """True si borrar una carrera de un perfil que hoy tiene `current_count_for_profile`
    carreras dejaría a ese perfil por debajo del mínimo necesario para poder recomendar
    (ver select_recommended_careers en routers/test.py)."""
    return (current_count_for_profile - 1) < minimum_required


def _get_profile_or_400(db: Session, profile_id: int) -> VocationalProfile:
    profile = db.get(VocationalProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El perfil vocacional indicado no existe")
    return profile


def _career_to_detail_out(db: Session, career: Career) -> CareerDetailOut:
    profile = db.get(VocationalProfile, career.profile_id)
    return CareerDetailOut(id=career.id, name=career.name, description=career.description, profile=profile)


# --- Perfiles (solo lectura, para poblar selects en la UI de administración) ---


@router.get("/profiles", response_model=list[VocationalProfileOut])
def list_profiles_admin(db: Session = Depends(get_db)):
    return db.query(VocationalProfile).order_by(VocationalProfile.id).all()


# --- Preguntas ---


@router.get("/questions", response_model=list[AdminQuestionOut])
def list_questions_admin(db: Session = Depends(get_db)):
    return db.query(Question).order_by(Question.order).all()


@router.post("/questions", response_model=AdminQuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    _get_profile_or_400(db, payload.profile_id)

    order = payload.order
    if order is None:
        max_order = db.query(func.max(Question.order)).scalar() or 0
        order = max_order + 1
    elif db.query(Question).filter(Question.order == order).first() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una pregunta con ese order")

    question = Question(text=payload.text, profile_id=payload.profile_id, order=order)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=AdminQuestionOut)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada")

    if payload.profile_id is not None:
        _get_profile_or_400(db, payload.profile_id)
        question.profile_id = payload.profile_id

    if payload.text is not None:
        question.text = payload.text

    if payload.order is not None and payload.order != question.order:
        if db.query(Question).filter(Question.order == payload.order).first() is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una pregunta con ese order")
        question.order = payload.order

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada")

    try:
        db.delete(question)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar: esta pregunta ya tiene respuestas registradas",
        )


# --- Carreras ---


@router.get("/careers", response_model=list[CareerDetailOut])
def list_careers_admin(db: Session = Depends(get_db)):
    careers = db.query(Career).order_by(Career.name).all()
    return [_career_to_detail_out(db, career) for career in careers]


@router.post("/careers", response_model=CareerDetailOut, status_code=status.HTTP_201_CREATED)
def create_career(payload: CareerCreate, db: Session = Depends(get_db)):
    _get_profile_or_400(db, payload.profile_id)

    if db.query(Career).filter(Career.name == payload.name).first() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una carrera con ese nombre")

    career = Career(name=payload.name, description=payload.description, profile_id=payload.profile_id)
    db.add(career)
    db.commit()
    db.refresh(career)
    return _career_to_detail_out(db, career)


@router.put("/careers/{career_id}", response_model=CareerDetailOut)
def update_career(career_id: int, payload: CareerUpdate, db: Session = Depends(get_db)):
    career = db.get(Career, career_id)
    if career is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")

    if payload.profile_id is not None:
        _get_profile_or_400(db, payload.profile_id)
        career.profile_id = payload.profile_id

    if payload.name is not None:
        existing = db.query(Career).filter(Career.name == payload.name, Career.id != career_id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una carrera con ese nombre")
        career.name = payload.name

    if payload.description is not None:
        career.description = payload.description

    db.commit()
    db.refresh(career)
    return _career_to_detail_out(db, career)


@router.delete("/careers/{career_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_career(career_id: int, db: Session = Depends(get_db)):
    career = db.get(Career, career_id)
    if career is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")

    current_count = db.query(Career).filter(Career.profile_id == career.profile_id).count()
    if would_break_minimum_careers(current_count):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar: el perfil se quedaría con menos de {RECOMMENDED_CAREERS_COUNT} carreras",
        )

    db.delete(career)
    db.commit()
