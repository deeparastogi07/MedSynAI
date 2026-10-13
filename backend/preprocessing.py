"""Preprocessing pipeline – median imputation + standardization for numerics,
most-frequent imputation + one-hot for categoricals. Fit on train only."""
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

from data_generator import NUMERICAL, CATEGORICAL


def build_pipeline(num_cols=None, cat_cols=None) -> ColumnTransformer:
    if num_cols is None:
        num_cols = NUMERICAL
    if cat_cols is None:
        cat_cols = CATEGORICAL
    num_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    cat_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, num_cols),
        ("cat", cat_pipe, cat_cols),
    ])
