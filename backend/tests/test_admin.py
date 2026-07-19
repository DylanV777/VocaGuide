from app.routers.admin import would_break_minimum_careers


def test_would_break_minimum_careers_when_profile_is_at_the_minimum():
    assert would_break_minimum_careers(3) is True


def test_would_not_break_minimum_careers_with_a_comfortable_margin():
    assert would_break_minimum_careers(4) is False


def test_would_break_minimum_careers_respects_a_custom_minimum():
    assert would_break_minimum_careers(5, minimum_required=5) is True
    assert would_break_minimum_careers(6, minimum_required=5) is False
