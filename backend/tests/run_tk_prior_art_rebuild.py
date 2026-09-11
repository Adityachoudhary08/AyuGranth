import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from test_tk_prior_art_rebuild import (
    test_exact_parser_preserves_user_facts_without_inference,
    test_planner_creates_separate_search_roles,
    test_combination_requires_one_supporting_passage,
    test_unknown_source_is_not_relabelled_as_tk,
    test_no_match_is_not_claimed_as_absence_of_tk,
)

for test in [
    test_exact_parser_preserves_user_facts_without_inference,
    test_planner_creates_separate_search_roles,
    test_combination_requires_one_supporting_passage,
    test_unknown_source_is_not_relabelled_as_tk,
    test_no_match_is_not_claimed_as_absence_of_tk,
]:
    test()
    print(f"PASS {test.__name__}")
print("TK_REBUILD_TESTS_PASS")
