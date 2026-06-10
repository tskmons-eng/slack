from app.vin import extract_vins, normalize_vin


def test_extract_vehicle_number_label_half_width_colon() -> None:
    assert extract_vins("車体番号: ZVW30-1234567") == ["ZVW30-1234567"]


def test_extract_vehicle_number_label_full_width_colon() -> None:
    assert extract_vins("車体番号：ZVW30-1234567") == ["ZVW30-1234567"]


def test_extract_chassis_number_label_half_width_colon() -> None:
    assert extract_vins("車台番号: DA17V-123456") == ["DA17V-123456"]


def test_extract_chassis_number_label_full_width_colon() -> None:
    assert extract_vins("車台番号：DA17V-123456") == ["DA17V-123456"]


def test_extract_multiple_vehicle_numbers() -> None:
    text = "車体番号: ZVW30-1234567\n車台番号：DA17V-123456"
    assert extract_vins(text) == ["ZVW30-1234567", "DA17V-123456"]


def test_extract_without_label_returns_empty_list() -> None:
    assert extract_vins("ZVW30-1234567") == []


def test_normalize_vehicle_number() -> None:
    assert normalize_vin("　zvw30-1234567。\n") == "ZVW30-1234567"
