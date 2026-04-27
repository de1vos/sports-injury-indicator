"""
Shared model utilities — imported by both train_model.py and predict_players.py.

Calibrator classes must live in a stable module (not __main__) so that
pickle can find the class definition when loading the model bundle.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression


class IsotonicCalibratedModel:
    """Wraps an XGBoost model with isotonic regression calibration."""

    def __init__(self, base_model, iso: IsotonicRegression):
        self._base  = base_model
        self._iso   = iso
        self.feature_importances_ = base_model.feature_importances_

    def predict_proba(self, X):
        raw = self._base.predict_proba(X)[:, 1]
        cal = self._iso.predict(raw)
        cal = np.clip(cal, 0, 1)
        return np.column_stack([1 - cal, cal])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


class SigmoidCalibrator:
    """
    Wraps a fitted base model with sigmoid (Platt scaling) calibration.

    XGBoost trained on 3 full retrospective seasons outputs over-inflated
    probabilities (~40% base rate vs ~30% in the live season).
    Sigmoid calibration fits a logistic regression on raw scores → actual labels,
    producing a smooth mapping that preserves ranking AND gives continuous variation
    in trends (unlike isotonic regression which creates step functions).
    """

    def __init__(self, base_model):
        self.base_model           = base_model
        self.calibrator           = LogisticRegression(C=1.0, solver="lbfgs")
        self.feature_importances_ = base_model.feature_importances_

    def fit(self, X_val, y_val):
        raw = self.base_model.predict_proba(X_val)[:, 1]
        self.calibrator.fit(raw.reshape(-1, 1), y_val)
        return self

    def predict_proba(self, X):
        raw = self.base_model.predict_proba(X)[:, 1]
        cal = self.calibrator.predict_proba(raw.reshape(-1, 1))[:, 1]
        return np.column_stack([1 - cal, cal])
