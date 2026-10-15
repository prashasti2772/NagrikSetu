"""Conservative near-text leakage groups; retain rows and their reviewed labels."""
import re
from collections import defaultdict
from difflib import SequenceMatcher


def near_text_pairs(items):
    """Yield exact/very close variants sharing a word trigram.

    Numeric differences are significant. Short text uses exact normalization only.
    This is a leakage heuristic, not proof that two civic reports share an incident.
    """
    index, previous, exact = defaultdict(set), {}, {}
    for identifier, text in sorted(items):
        normalized = " ".join(re.findall(r"\w+", text.casefold()))
        if normalized in exact:
            yield identifier, exact[normalized]
            continue
        exact[normalized] = identifier
        words = normalized.split()
        if len(words) < 6 or len(normalized) < 40:
            continue
        grams = {tuple(words[offset:offset + 3]) for offset in range(len(words) - 2)}
        numbers = tuple(re.findall(r"\d+", normalized))
        candidates = set().union(*(index[gram] for gram in grams)) if grams else set()
        for candidate in sorted(candidates):
            other, other_numbers = previous[candidate]
            if numbers != other_numbers or min(len(normalized), len(other)) / max(len(normalized), len(other)) < 0.90:
                continue
            if SequenceMatcher(None, normalized, other, autojunk=False).ratio() >= 0.95:
                yield identifier, candidate
        previous[identifier] = normalized, numbers
        for gram in grams:
            index[gram].add(identifier)
