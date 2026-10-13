"""Prototype clinical rule engine.  Rules are NOT medical guidelines –
they are an inspectable reasoning channel for the technical proof of concept."""
from typing import Dict, List, Any


def _to_float(val: Any) -> float:
    if val is None or val == "":
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _to_int(val: Any) -> int:
    if val is None or val == "":
        return -1
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return -1


# Each rule: id, human-readable description, predicate on raw patient dict
RULES = [
    {
        "id": "R-01",
        "label": "Elevated systolic blood pressure",
        "message": "Systolic BP ≥ 140 mmHg (prototype clinical threshold).",
        "fn": lambda p: _to_float(p.get("systolic_bp")) >= 140 if p.get("systolic_bp") not in (None, "") else False,
    },
    {
        "id": "R-02",
        "label": "Hyperglycaemia flag",
        "message": "Fasting glucose elevated (Level ≥ 2 or ≥ 126 mg/dL).",
        "fn": lambda p: (_to_float(p.get("glucose")) >= 126 if _to_float(p.get("glucose")) > 10 else _to_float(p.get("glucose")) >= 2) if p.get("glucose") not in (None, "") else False,
    },
    {
        "id": "R-03",
        "label": "Elevated cholesterol",
        "message": "Total cholesterol elevated (Level ≥ 2 or ≥ 240 mg/dL).",
        "fn": lambda p: (_to_float(p.get("cholesterol")) >= 240 if _to_float(p.get("cholesterol")) > 10 else _to_float(p.get("cholesterol")) >= 2) if p.get("cholesterol") not in (None, "") else False,
    },
    {
        "id": "R-04",
        "label": "Current smoker",
        "message": "Self-reported smoking status is positive.",
        "fn": lambda p: _to_int(p.get("smoking")) == 1,
    },
    {
        "id": "R-05",
        "label": "Diastolic hypertension / Diabetes",
        "message": "Diastolic BP ≥ 90 mmHg or diabetes comorbidity.",
        "fn": lambda p: (_to_float(p.get("diastolic_bp")) >= 90 if p.get("diastolic_bp") not in (None, "") else False) or (_to_int(p.get("diabetes")) == 1 if p.get("diabetes") not in (None, "") else False),
    },
    {
        "id": "R-06",
        "label": "Physical inactivity / Family history",
        "message": "Self-reported physical inactivity (active=0) or family history of cardiac disease.",
        "fn": lambda p: (_to_int(p.get("active")) == 0 if p.get("active") not in (None, "") else False) or (_to_int(p.get("family_history")) == 1 if p.get("family_history") not in (None, "") else False),
    },
    {
        "id": "R-07",
        "label": "Alcohol intake / Exercise angina",
        "message": "Reported alcohol intake or exercise-induced angina.",
        "fn": lambda p: (_to_int(p.get("alcohol")) == 1 if p.get("alcohol") not in (None, "") else False) or (_to_int(p.get("exercise_angina")) == 1 if p.get("exercise_angina") not in (None, "") else False),
    },
    {
        "id": "R-08",
        "label": "High BMI / Atypical chest symptoms",
        "message": "BMI ≥ 30 (obesity category) or asymptomatic chest pain type.",
        "fn": lambda p: (_to_float(p.get("bmi")) >= 30 if p.get("bmi") not in (None, "") else False) or (_to_int(p.get("chest_pain_type")) == 3 if p.get("chest_pain_type") not in (None, "") else False),
    },
]


def evaluate_rules(patient: Dict) -> List[Dict]:
    out = []
    for r in RULES:
        try:
            triggered = bool(r["fn"](patient))
        except Exception:
            triggered = False
        out.append({
            "id": r["id"],
            "label": r["label"],
            "message": r["message"],
            "triggered": triggered,
        })
    return out
