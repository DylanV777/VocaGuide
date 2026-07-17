from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Answer, Question, TestAttempt, User
from app.schemas import QuestionOut, TestSubmitIn, TestSubmitOut

router = APIRouter(prefix="/test", tags=["test"])


def validate_submission(submitted_question_ids: list[int], valid_question_ids: set[int]) -> None:
    if len(submitted_question_ids) != len(set(submitted_question_ids)):
        raise ValueError("No puede haber preguntas repetidas en el envío")
    if set(submitted_question_ids) != valid_question_ids:
        raise ValueError("Debes responder exactamente las 20 preguntas del test, sin omitir ninguna")


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Question).order_by(Question.order).all()


@router.post("/submit", response_model=TestSubmitOut, status_code=status.HTTP_201_CREATED)
def submit_test(
    payload: TestSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_question_ids = {question_id for (question_id,) in db.query(Question.id).all()}
    submitted_question_ids = [answer.question_id for answer in payload.answers]

    try:
        validate_submission(submitted_question_ids, valid_question_ids)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))

    attempt = TestAttempt(user_id=current_user.id)
    db.add(attempt)
    db.flush()

    db.add_all(
        Answer(attempt_id=attempt.id, question_id=answer.question_id, value=answer.value)
        for answer in payload.answers
    )
    db.commit()

    return TestSubmitOut(attempt_id=attempt.id)
