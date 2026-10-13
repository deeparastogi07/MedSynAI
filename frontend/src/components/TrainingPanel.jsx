import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function TrainingPanel({ availableModels }) {
  const [shap, setShap] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState(null);

  const load = (model) => {
    setShap(null);
    api.shapGlobal(model).then(setShap).catch((err) => {
      console.error(err);
      setShap({ importance: [] });
    });
  };

  useEffect(() => { load(selectedModel); }, [selectedModel]);

  const retrain = async () => {
    setBusy(true); setMsg('Retraining…');
    try {
      const r = await api.train();
      setMsg(`Trained. Best selected model: ${r.selected_model}`);
      await load(selectedModel);
    } catch (e) {
      setMsg(`Error: ${e}`);
    } finally { setBusy(false); }
  };

  const maxImp = shap && shap.importance && shap.importance.length > 0
    ? Math.max(0.0001, ...shap.importance.map(i => i.importance))
    : 1;

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Global SHAP feature importance</h3>
        {availableModels && availableModels.length > 0 && (
          <div className="model-picker" style={{ margin: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="">Default (Selected Best)</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {shap ? (
        <>
          {shap.importance && shap.importance.length > 0 ? (
            shap.importance.map((i, idx) => (
              <div className="shap-bar-wrap" key={idx}>
                <div className="shap-bar-label">{i.feature}</div>
                <div className="shap-bar-track">
                  <div className="shap-bar-fill" style={{
                    width: `${(i.importance / maxImp * 100).toFixed(1)}%`,
                    background: 'var(--accent)',
                  }}/>
                </div>
                <div className="shap-bar-val">{i.importance.toFixed(4)}</div>
              </div>
            ))
          ) : (
            <p className="footnote">No feature importances returned.</p>
          )}
          <p className="footnote">
            Mean absolute SHAP value across the training set — which variables the
            model relies on most strongly. Not causal, not medical importance.
          </p>
        </>
      ) : <span className="spin"/>}

      <div style={{ marginTop: 16 }}>
        <button className="btn secondary" disabled={busy} onClick={retrain}>
          {busy ? <><span className="spin"/>Retraining…</> : 'Retrain all four models'}
        </button>
        {msg && <div className="footnote" style={{ marginTop: 8 }}>{msg}</div>}
      </div>
    </div>
  );
}
