"""Data-quality checks and coordination layer. Produces the evidence dashboard."""
from typing import Dict, List, Tuple

# Prototype supported ranges
RANGES = {
    "age": (18, 100), "bmi": (12, 60), "systolic_bp": (70, 250),
    "diastolic_bp": (40, 160), "glucose": (1, 400), "cholesterol": (1, 500),
    "heart_rate": (30, 200),
}

VALID_CATEGORICAL = {
    "smoking": {0, 1}, "diabetes": {0, 1}, "family_history": {0, 1},
    "exercise_angina": {0, 1}, "chest_pain_type": {0, 1, 2, 3},
    "gender": {1, 2}, "cholesterol": {1, 2, 3}, "glucose": {1, 2, 3},
    "alcohol": {0, 1}, "active": {0, 1},
}


def check_data_quality(patient: Dict, required_fields: List[str] = None) -> Dict:
    missing: List[str] = []
    out_of_range: List[str] = []
    invalid: List[str] = []

    req = required_fields if required_fields is not None else [
        "age", "bmi", "systolic_bp"
    ]

    for k in req:
        if k not in patient or patient[k] is None or patient[k] == "":
            missing.append(k)

    for k, (lo, hi) in RANGES.items():
        v = patient.get(k)
        if v is None or v == "":
            continue
        try:
            v = float(v)
        except (TypeError, ValueError):
            invalid.append(k)
            continue
        if not (lo <= v <= hi):
            out_of_range.append(k)

    for k, allowed in VALID_CATEGORICAL.items():
        v = patient.get(k)
        if v is None or v == "":
            continue
        try:
            if int(v) not in allowed:
                invalid.append(k)
        except (TypeError, ValueError):
            invalid.append(k)

    status = "ok"
    if missing:
        status = "incomplete"
    if out_of_range or invalid:
        status = "invalid"

    return {
        "status": status,
        "missing": missing,
        "out_of_range": out_of_range,
        "invalid": invalid,
        "message": {
            "ok": "All required fields present and within supported ranges.",
            "incomplete": "Some required fields are missing; predictions will use imputation.",
            "invalid": "One or more fields are outside supported ranges or invalid.",
        }[status],
    }


def coordinate(prediction: Dict, shap: Dict, rules: List[Dict], dq: Dict) -> Dict:
    """Assemble the review-oriented representation (Section III-F / Table)."""
    triggered = [r for r in rules if r["triggered"]]

    # Disagreement flag: model leans positive but no rule triggered, or vice versa
    model_positive = prediction["probability"] >= 0.5
    rule_signal = len(triggered) > 0
    disagreement = (model_positive != rule_signal)

    review_required = bool(
        dq["status"] != "ok" or disagreement or model_positive
    )

    reasons = []
    if dq["status"] != "ok":
        reasons.append(f"data-quality status = {dq['status']}")
    if disagreement:
        reasons.append("model and prototype rule signals disagree")
    if model_positive:
        reasons.append("model output is in the positive range")
    if not reasons:
        reasons.append("no escalation trigger detected in this prototype")

    top_feature = "n/a"
    if shap and shap.get("contributions") and len(shap["contributions"]) > 0:
        top_feature = shap["contributions"][0]["feature"]

    return {
        "review_required": review_required,
        "disagreement": disagreement,
        "reasons": reasons,
        "evidence_provenance": [
            {"component": "Model", "origin": "statistical model",
             "shown": f"class={prediction['class']}, p={prediction['probability']:.3f}"},
            {"component": "SHAP", "origin": "model-behaviour explanation",
             "shown": f"top: {top_feature}"},
            {"component": "Clinical rules", "origin": "explicit prototype rules",
             "shown": f"{len(triggered)} of {len(rules)} triggered"},
            {"component": "Data quality", "origin": "input validation subsystem",
             "shown": dq["status"]},
        ],
    }
