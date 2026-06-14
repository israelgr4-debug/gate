import re

_DIGITS = re.compile(r"\D+")


def normalize(raw: str) -> str | None:
    if not raw:
        return None
    digits = _DIGITS.sub("", raw)
    if 7 <= len(digits) <= 8:
        return digits
    return None
