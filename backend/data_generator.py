"""Synthetic structured-clinical dataset generator (MedSynAI Section IV-A)."""
import numpy as np
import pandas as pd

FEATURE_ORDER = [
    "age", "bmi", "systolic_bp", "glucose", "cholesterol",
    "heart_rate", "smoking", "diabetes", "family_history",
    "chest_pain_type", "exercise_angina",
]

CATEGORICAL = ["smoking", "diabetes", "family_history",
               "chest_pain_type", "exercise_angina"]
NUMERICAL = ["age", "bmi", "systolic_bp", "glucose", "cholesterol", "heart_rate"]


def generate_dataset(n: int = 1200, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    age = rng.normal(54, 12, n).clip(29, 85)
    bmi = rng.normal(27, 5, n).clip(16, 45)
    systolic_bp = rng.normal(132, 20, n).clip(90, 200)
    glucose = rng.normal(105, 30, n).clip(60, 250)
    cholesterol = rng.normal(210, 45, n).clip(120, 380)
    heart_rate = rng.normal(72, 12, n).clip(45, 130)

    smoking = rng.binomial(1, 0.28, n)
    diabetes = rng.binomial(1, 0.18, n)
    family_history = rng.binomial(1, 0.35, n)
    chest_pain_type = rng.integers(0, 4, n)   # 0..3 (typical/atypical/non-anginal/asymptomatic)
    exercise_angina = rng.binomial(1, 0.22, n)

    # Synthetic outcome-generating mechanism (NOT a medical equation)
    logit = (
        -0.055 * (age - 54)
        + 0.045 * (bmi - 27)
        + 0.028 * (systolic_bp - 132)
        + 0.020 * (glucose - 105)
        + 0.012 * (cholesterol - 210)
        + 0.020 * (heart_rate - 72)
        + 0.9 * smoking
        + 0.8 * diabetes
        + 0.7 * family_history
        + 0.55 * (chest_pain_type == 3).astype(float)
        + 1.0 * exercise_angina
        - 3.2
    )
    prob = 1.0 / (1.0 + np.exp(-logit))
    target = rng.binomial(1, prob)

    df = pd.DataFrame({
        "age": age, "bmi": bmi, "systolic_bp": systolic_bp,
        "glucose": glucose, "cholesterol": cholesterol,
        "heart_rate": heart_rate, "smoking": smoking,
        "diabetes": diabetes, "family_history": family_history,
        "chest_pain_type": chest_pain_type,
        "exercise_angina": exercise_angina,
        "target": target,
    })

    # Controlled missingness on three numerical variables (Section IV-A)
    for col, frac in [("glucose", 0.06), ("cholesterol", 0.05), ("bmi", 0.04)]:
        idx = rng.choice(n, size=int(n * frac), replace=False)
        df.loc[idx, col] = np.nan

    return df[FEATURE_ORDER + ["target"]]
