"""MedSynAI FastAPI backend."""
import os, json
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import joblib
import numpy as np
import pandas as pd

from data_generator import FEATURE_ORDER, CATEGORICAL, NUMERICAL
from models import train_all
from explainability import local_explanation, global_importance_cached
from rules_engine import evaluate_rules, RULES
from coordination import check_data_quality, coordinate

ART_DIR = os.path.join(os.path.dirname(__file__), "artifacts")


def _ensure_artifacts():
    if not os.path.exists(os.path.join(ART_DIR, "selected_model.joblib")) or \
       not os.path.exists(os.path.join(ART_DIR, "metrics.json")):
        train_all()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_artifacts()
    yield


app = FastAPI(title="MedSynAI", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- request schema ----------
class Patient(BaseModel):
    age: Optional[float] = Field(None, description="years")
    bmi: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    glucose: Optional[float] = None
    cholesterol: Optional[float] = None
    heart_rate: Optional[float] = None
    gender: Optional[int] = None
    smoking: Optional[int] = None
    alcohol: Optional[int] = None
    active: Optional[int] = None
    diabetes: Optional[int] = None
    family_history: Optional[int] = None
    chest_pain_type: Optional[int] = None
    exercise_angina: Optional[int] = None


def _load(model_name: Optional[str] = None):
    _ensure_artifacts()
    pre = joblib.load(os.path.join(ART_DIR, "preprocessor.joblib"))
    meta = json.load(open(os.path.join(ART_DIR, "metrics.json")))

    if model_name:
        all_models = joblib.load(os.path.join(ART_DIR, "all_models.joblib"))
        if model_name in all_models:
            model = all_models[model_name]
            active_model_name = model_name
        else:
            model = joblib.load(os.path.join(ART_DIR, "selected_model.joblib"))
            active_model_name = meta["selected_model"]
    else:
        model = joblib.load(os.path.join(ART_DIR, "selected_model.joblib"))
        active_model_name = meta["selected_model"]

    return pre, model, meta, active_model_name


# ---------- endpoints ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/train")
def train(dataset: str = Query("kaggle")):
    meta = train_all(dataset_type=dataset)
    return {
        "message": "trained",
        "selected_model": meta["selected_model"],
        "dataset_type": meta.get("dataset_type", "kaggle"),
        "dataset_name": meta.get("dataset_name", ""),
    }


@app.get("/api/dataset-info")
def dataset_info():
    _, _, meta, _ = _load()
    return {
        "dataset_type": meta.get("dataset_type", "kaggle"),
        "dataset_name": meta.get("dataset_name", "Kaggle Cardiovascular Disease Dataset (Real Clinical Cohort)"),
        "feature_order": meta.get("feature_order", []),
        "train_size": meta.get("train_size", 0),
        "test_size": meta.get("test_size", 0),
    }


@app.get("/api/model-comparison")
def model_comparison():
    _, _, meta, _ = _load()
    return {
        "dataset_type": meta.get("dataset_type", "kaggle"),
        "dataset_name": meta.get("dataset_name", "Kaggle Cardiovascular Disease Dataset (Real Clinical Cohort)"),
        "selected_model": meta["selected_model"],
        "results": meta["results"],
        "train_size": meta["train_size"],
        "test_size": meta["test_size"],
        "positive_rate_train": meta["positive_rate_train"],
    }


@app.get("/api/models")
def list_models():
    _, _, meta, _ = _load()
    return {
        "selected_model": meta["selected_model"],
        "available_models": list(meta["results"].keys()),
    }


@app.get("/api/shap/global")
def shap_global(model: Optional[str] = None):
    return {"importance": global_importance_cached(model_name=model)}


@app.get("/api/rules")
def list_rules():
    return {"rules": [{"id": r["id"], "label": r["label"], "message": r["message"]}
                      for r in RULES]}


@app.post("/api/predict")
def predict(
    patient: Patient,
    model: Optional[str] = Query(None),
    retrain: bool = Query(False)
):
    if retrain:
        train_all()

    pre, active_model, meta, active_model_name = _load(model)
    p = patient.model_dump()
    feature_order = meta.get("feature_order", FEATURE_ORDER)

    # Coordinate pipeline
    dq = check_data_quality(p, required_fields=feature_order[:3])
    rules = evaluate_rules(p)

    # Preprocess only the fields for the active dataset
    row = pd.DataFrame([{k: p.get(k) for k in feature_order}])
    X = pre.transform(row)

    prob = float(active_model.predict_proba(X)[0, 1])
    cls = int(prob >= 0.5)

    prediction = {
        "class": cls,
        "probability": prob,
        "model": active_model_name,
    }

    # SHAP local explanation
    try:
        shap_local = local_explanation(p, model_name=active_model_name)
    except Exception as e:
        shap_local = {"contributions": [], "base_value": 0.0,
                      "note": f"SHAP unavailable: {e}"}

    coord = coordinate(prediction, shap_local, rules, dq)

    model_metrics = meta["results"].get(active_model_name, {})
    model_params = {}
    try:
        params_raw = active_model.get_params()
        # Keep key human-relevant hyperparameters
        interesting_keys = ["n_estimators", "max_depth", "learning_rate", "subsample", 
                            "colsample_bytree", "min_samples_leaf", "C", "max_iter", "penalty"]
        model_params = {k: params_raw[k] for k in interesting_keys if k in params_raw}
    except Exception:
        pass

    pipeline_lifecycle = {
        "was_retrained": retrain,
        "active_model": active_model_name,
        "algorithm_class": type(active_model).__name__,
        "hyperparameters": model_params,
        "dataset": {
            "type": meta.get("dataset_type", "kaggle"),
            "name": meta.get("dataset_name", "Kaggle Cardiovascular Disease Dataset (Real Clinical Cohort)"),
            "total_records": 70000 if meta.get("dataset_type") == "kaggle" else 1200,
            "train_records": meta.get("train_size", 9600),
            "test_records": meta.get("test_size", 2400),
            "positive_prevalence": f"{(meta.get('positive_rate_train', 0.5) * 100):.1f}%",
            "features_in": len(feature_order),
            "features_encoded": int(X.shape[1]),
        },
        "performance": {
            "accuracy": model_metrics.get("accuracy"),
            "roc_auc": model_metrics.get("roc_auc"),
            "f1": model_metrics.get("f1"),
            "recall": model_metrics.get("recall"),
            "specificity": model_metrics.get("specificity"),
            "confusion": model_metrics.get("confusion"),
        },
        "execution_steps": [
            {
                "id": "S1",
                "title": "Data Quality Audit",
                "summary": f"Audit of {len(feature_order)} patient features; Status: {dq['status']}.",
                "detail": f"{len(dq['missing'])} missing fields, {len(dq['out_of_range'])} out of bounds."
            },
            {
                "id": "S2",
                "title": "Preprocessing & Imputation",
                "summary": f"Transformed {len(feature_order)} features -> {X.shape[1]} pipeline features.",
                "detail": "Median imputation & Z-score scaling for numerics; Most-frequent & One-Hot for categoricals (fit on train)."
            },
            {
                "id": "S3",
                "title": f"Model Inference ({active_model_name})",
                "summary": f"Predicted Class {cls} ({'Positive' if cls == 1 else 'Negative'}) with probability {prob*100:.1f}%.",
                "detail": f"Evaluated using {type(active_model).__name__} on {meta.get('dataset_name', 'Cohort')}."
            },
            {
                "id": "S4",
                "title": "SHAP Explainability Calculation",
                "summary": f"Extracted top {len(shap_local.get('contributions', []))} feature contributions.",
                "detail": f"Used {type(active_model).__name__} explainer against train background to compute signed Shapley margins."
            },
            {
                "id": "S5",
                "title": "Clinical Rule Evaluation",
                "summary": f"{sum(1 for r in rules if r['triggered'])} of {len(rules)} prototype clinical rules triggered.",
                "detail": "Inspectable reasoning channel evaluated independently from statistical model weights."
            },
            {
                "id": "S6",
                "title": "Review Coordination & Safety Check",
                "summary": "Escalation: " + ("Review Required" if coord["review_required"] else "No Escalation"),
                "detail": "Disagreement status: " + ("Flagged" if coord["disagreement"] else "None") + "; " + (coord['reasons'][0] if coord['reasons'] else '')
            }
        ]
    }

    return {
        "prediction": prediction,
        "shap_local": shap_local,
        "rules": rules,
        "data_quality": dq,
        "coordination": coord,
        "pipeline_lifecycle": pipeline_lifecycle,
    }


@app.get("/api/sample-patient")
def sample_patient(dataset: Optional[str] = Query(None)):
    """Return a patient record from the active dataset."""
    _, _, meta, _ = _load()
    if not isinstance(dataset, str):
        dataset = None
    active_dataset = dataset or meta.get("dataset_type", "kaggle")

    if active_dataset == "kaggle":
        from kaggle_dataset import load_kaggle_dataset, KAGGLE_NUMERICAL, KAGGLE_FEATURE_ORDER
        df = load_kaggle_dataset(n_samples=2000)
        row = df.sample(1, random_state=int(np.random.randint(1, 10000))).iloc[0]
        return {k: (None if pd.isna(row[k]) else float(row[k]) if k in KAGGLE_NUMERICAL
                    else int(row[k])) for k in KAGGLE_FEATURE_ORDER}
    else:
        from data_generator import generate_dataset, NUMERICAL, FEATURE_ORDER
        df = generate_dataset()
        row = df.sample(1, random_state=int(np.random.randint(1, 10000))).iloc[0]
        return {k: (None if pd.isna(row[k]) else float(row[k]) if k in NUMERICAL
                    else int(row[k])) for k in FEATURE_ORDER}
