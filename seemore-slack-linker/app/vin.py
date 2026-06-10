from __future__ import annotations

import re


_LABEL_RE = re.compile(
    r"(?:車体番号|車台番号)\s*[:：]\s*"
    r"(?P<value>[A-Za-z0-9][A-Za-z0-9\s　\r\n]*-[A-Za-z0-9\s　\r\n]*[A-Za-z0-9])"
)
_TRAILING_PUNCTUATION = " \t\r\n.,;:、。．，；："
_VALID_VIN_RE = re.compile(r"^[A-Z0-9]+-[A-Z0-9]+$")


def normalize_vin(vin: str) -> str:
    normalized = vin.strip()
    normalized = normalized.replace("　", "")
    normalized = re.sub(r"[\r\n\s]+", "", normalized)
    normalized = normalized.upper()
    normalized = normalized.rstrip(_TRAILING_PUNCTUATION)
    return normalized


def extract_vins(text: str) -> list[str]:
    if not text:
        return []

    vins: list[str] = []
    seen: set[str] = set()
    for match in _LABEL_RE.finditer(text):
        vin = normalize_vin(match.group("value"))
        if not vin or not _VALID_VIN_RE.fullmatch(vin):
            continue
        if vin not in seen:
            seen.add(vin)
            vins.append(vin)
    return vins
