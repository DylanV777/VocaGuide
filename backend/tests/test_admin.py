from app.routers.admin import most_frequent, most_recommended_career_id, would_break_minimum_careers


def test_would_break_minimum_careers_when_profile_is_at_the_minimum():
    assert would_break_minimum_careers(3) is True


def test_would_not_break_minimum_careers_with_a_comfortable_margin():
    assert would_break_minimum_careers(4) is False


def test_would_break_minimum_careers_respects_a_custom_minimum():
    assert would_break_minimum_careers(5, minimum_required=5) is True
    assert would_break_minimum_careers(6, minimum_required=5) is False


def test_most_frequent_returns_none_when_there_is_no_data():
    assert most_frequent([]) is None


def test_most_frequent_picks_the_clear_winner():
    assert most_frequent([1, 1, 2, 3, 1]) == 1


def test_most_frequent_breaks_ties_with_the_lowest_value():
    assert most_frequent([2, 2, 1, 1]) == 1


def test_most_recommended_career_id_returns_none_without_results():
    careers_by_profile = {1: [10, 11, 12, 13]}
    assert most_recommended_career_id([], careers_by_profile) is None


def test_most_recommended_career_id_tallies_across_the_top_n_of_each_result():
    # perfil 1 -> carreras [10, 11, 12, 13] (se recomiendan las primeras 3: 10, 11, 12)
    # perfil 2 -> carreras [20, 21, 22]     (se recomiendan las 3: 20, 21, 22)
    careers_by_profile = {1: [10, 11, 12, 13], 2: [20, 21, 22]}
    # tres resultados con perfil 1 (suman 3 al 10, 11 y 12) y un resultado con perfil 2
    result_profile_ids = [1, 1, 1, 2]

    assert most_recommended_career_id(result_profile_ids, careers_by_profile) == 10


def test_most_recommended_career_id_breaks_ties_with_the_lowest_career_id():
    # perfil 1 aporta 1 aparición para la carrera 30; perfil 2 aporta 1 aparición
    # para la carrera 10. Quedan empatadas en 1; debe ganar la de menor id.
    careers_by_profile = {1: [30], 2: [10]}
    result_profile_ids = [1, 2]

    assert most_recommended_career_id(result_profile_ids, careers_by_profile) == 10
