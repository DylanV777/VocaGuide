import pytest

from app.routers.test import validate_submission


VALID_IDS = set(range(1, 21))


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
