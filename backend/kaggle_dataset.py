"""Kaggle Cardiovascular Disease Dataset Loader & Processor."""
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "cardio_train.csv")

KAGGLE_FEATURE_ORDER = [
    "age", "bmi", "systolic_bp", "diastolic_bp", "gender",
    "cholesterol", "glucose", "smoking", "alcohol", "active"
]

KAGGLE_NUMERICAL = ["age", "bmi", "systolic_bp", "diastolic_bp"]
KAGGLE_CATEGORICAL = ["gender", "cholesterol", "glucose", "smoking", "alcohol", "active"]


def load_kaggle_dataset(n_samples: int = 12000, seed: int = 42) -> pd.DataFrame:
    """Load, clean, and sample the real Kaggle Cardiovascular Disease dataset."""
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Kaggle dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH, sep=";")

    # Convert age from days to years
    df["age"] = (df["age"] / 365.25).round(1)

    # Compute BMI from weight (kg) and height (cm)
    height_m = df["height"] / 100.0
    df["bmi"] = (df["weight"] / (height_m ** 2)).round(1)

    # Standardize column names
    df = df.rename(columns={
        "ap_hi": "systolic_bp",
        "ap_lo": "diastolic_bp",
        "gluc": "glucose",
        "smoke": "smoking",
        "alco": "alcohol",
        "cardio": "target",
    })

    # Clean realistic physiological outliers from clinical data entry errors
    clean_mask = (
        (df["systolic_bp"] >= 70) & (df["systolic_bp"] <= 240) &
        (df["diastolic_bp"] >= 40) & (df["diastolic_bp"] <= 160) &
        (df["bmi"] >= 14) & (df["bmi"] <= 55) &
        (df["age"] >= 25) & (df["age"] <= 80)
    )
    df_clean = df[clean_mask].copy()

    # Stratified sample if n_samples specified
    if n_samples and n_samples < len(df_clean):
        df_sample, _ = train_test_split(
            df_clean, train_size=n_samples, stratify=df_clean["target"], random_state=seed
        )
        df_sample = df_sample.reset_index(drop=True)
    else:
        df_sample = df_clean.reset_index(drop=True)

    return df_sample[KAGGLE_FEATURE_ORDER + ["target"]]
