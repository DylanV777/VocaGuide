from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Answer, Career, Question, Result, TestAttempt, User, VocationalProfile
from app.schemas import AnswerIn, QuestionOut, TestSubmitIn, TestSubmitOut

router = APIRouter(prefix="/test", tags=["test"])

RECOMMENDED_CAREERS_COUNT = 3


def validate_submission(submitted_question_ids: list[int], valid_question_ids: set[int]) -> None:
    if len(submitted_question_ids) != len(set(submitted_question_ids)):
        raise ValueError("No puede haber preguntas repetidas en el envío")
    if set(submitted_question_ids) != valid_question_ids:
        raise ValueError("Debes responder exactamente las 20 preguntas del test, sin omitir ninguna")


def calculate_profile(answers: list[AnswerIn], question_profile_map: dict[int, int]) -> int:
    """Suma el valor de cada respuesta al perfil de su pregunta y devuelve el id del
    perfil con mayor puntaje. En caso de empate, gana el perfil con menor id (regla
    determinista simple; no hay ningún criterio de negocio que priorice un perfil
    sobre otro más allá de tener un desempate reproducible)."""
    scores: dict[int, int] = {}
    for answer in answers:
        profile_id = question_profile_map[answer.question_id]
        scores[profile_id] = scores.get(profile_id, 0) + answer.value

    max_score = max(scores.values())
    winning_profile_ids = sorted(profile_id for profile_id, score in scores.items() if score == max_score)
    return winning_profile_ids[0]


def select_recommended_careers(profile_careers: list, limit: int = RECOMMENDED_CAREERS_COUNT) -> list:
    """Toma las carreras asociadas al perfil ganador (ya ordenadas) y devuelve
    exactamente `limit`. Lanza un error si no hay suficientes carreras cargadas
    para ese perfil, ya que eso significaría datos semilla incompletos, no una
    situación esperable en operación normal."""
    if len(profile_careers) < limit:
        raise ValueError(
            f"El perfil no tiene suficientes carreras registradas para recomendar "
            f"{limit} (tiene {len(profile_careers)})"
        )
    return profile_careers[:limit]


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Question).order_by(Question.order).all()


@router.post("/submit", response_model=TestSubmitOut, status_code=status.HTTP_201_CREATED)
def submit_test(
    payload: TestSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question_profile_map = dict(db.query(Question.id, Question.profile_id).all())
    submitted_question_ids = [answer.question_id for answer in payload.answers]

    try:
        validate_submission(submitted_question_ids, set(question_profile_map.keys()))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))

    attempt = TestAttempt(user_id=current_user.id)
    db.add(attempt)
    db.flush()

    db.add_all(
        Answer(attempt_id=attempt.id, question_id=answer.question_id, value=answer.value)
        for answer in payload.answers
    )

    winning_profile_id = calculate_profile(payload.answers, question_profile_map)
    result = Result(user_id=current_user.id, attempt_id=attempt.id, profile_id=winning_profile_id)
    db.add(result)
    db.flush()

    profile = db.get(VocationalProfile, winning_profile_id)

    profile_careers = (
        db.query(Career).filter(Career.profile_id == winning_profile_id).order_by(Career.id).all()
    )
    recommended_careers = select_recommended_careers(profile_careers)

    db.commit()

    return TestSubmitOut(
        attempt_id=attempt.id,
        result_id=result.id,
        profile=profile,
        recommended_careers=recommended_careers,
    )
