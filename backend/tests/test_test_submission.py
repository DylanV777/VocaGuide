import pytest

from app.routers.test import calculate_profile, select_recommended_careers, validate_submission
from app.schemas import AnswerIn


VALID_IDS = set(range(1, 21))

# Mapa sintético de 4 preguntas repartidas en 2 perfiles (10 y 20), independiente
# de los datos semilla reales, para probar calculate_profile de forma aislada.
QUESTION_PROFILE_MAP = {1: 10, 2: 10, 3: 20, 4: 20}


def make_answers(values: dict[int, int]) -> list[AnswerIn]:
    return [AnswerIn(question_id=question_id, value=value) for question_id, value in values.items()]


def test_validate_submission_accepts_exactly_the_valid_question_ids():
    validate_submission(list(VALID_IDS), VALID_IDS)


def test_validate_submission_rejects_missing_questions():
    incomplete = list(range(1, 20))  # falta la pregunta 20

    with pytest.raises(ValueError, match="Debes responder exactamente"):
        validate_submission(incomplete, VALID_IDS)


def test_validate_submission_rejects_unknown_question_ids():
    with_unknown = list(range(1, 20)) + [999]

    with pytest.raises(ValueError, match="Debes responder exactamente"):
        validate_submission(with_unknown, VALID_IDS)


def test_validate_submission_rejects_duplicate_questions():
    with_duplicate = list(range(1, 20)) + [1]

    with pytest.raises(ValueError, match="repetidas"):
        validate_submission(with_duplicate, VALID_IDS)


def test_calculate_profile_picks_the_profile_with_the_highest_total_score():
    answers = make_answers({1: 5, 2: 5, 3: 1, 4: 1})  # perfil 10: 10 puntos, perfil 20: 2 puntos

    assert calculate_profile(answers, QUESTION_PROFILE_MAP) == 10


def test_calculate_profile_breaks_ties_with_the_lowest_profile_id():
    answers = make_answers({1: 3, 2: 3, 3: 3, 4: 3})  # empate: 6 puntos cada perfil

    assert calculate_profile(answers, QUESTION_PROFILE_MAP) == 10


def test_select_recommended_careers_returns_exactly_three():
    careers = ["Carrera A", "Carrera B", "Carrera C", "Carrera D"]

    assert select_recommended_careers(careers) == ["Carrera A", "Carrera B", "Carrera C"]


def test_select_recommended_careers_raises_when_profile_has_too_few_careers():
    careers = ["Carrera A", "Carrera B"]

    with pytest.raises(ValueError, match="no tiene suficientes carreras"):
        select_recommended_careers(careers)
