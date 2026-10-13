import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ModelComparison({ activeModel, onSelectModel }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.modelComparison().then(setData).catch(e => setErr(String(e)));
  }, []);

  if (err) return <div className="panel">Model comparison error: {err}</div>;
  if (!data) return <div className="panel"><span className="spin"/>Loading comparison…</div>;

  const models = Object.keys(data.results);
  const bestAuc = Math.max(...models.map(m => data.results[m].roc_auc));

  const metricCols = ['accuracy', 'precision', 'recall', 'f1', 'specificity', 'roc_auc'];

  return (
    <div className="panel">
      <h3>Model comparison on synthetic test set</h3>
      <p className="footnote" style={{ marginTop: 0 }}>
        Train n = {data.train_size}, test n = {data.test_size}.
        Selected best model: <b>{data.selected_model}</b> (highest ROC-AUC).
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="metrics">
          <thead>
            <tr>
              <th>Model</th>
              {metricCols.map(m => <th key={m}>{m.replace('_', ' ')}</th>)}
              {onSelectModel && <th style={{ textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {models.map(m => {
              const r = data.results[m];
              const isBest = r.roc_auc === bestAuc;
              const isCurrent = activeModel === m;
              return (
                <tr key={m} className={isBest ? 'best' : ''}>
                  <td>
                    <strong>{m}</strong>
                    {isBest && <span className="badge good" style={{ marginLeft: 6 }}>Best AUC</span>}
                    {isCurrent && <span className="badge info" style={{ marginLeft: 6 }}>Active</span>}
                  </td>
                  {metricCols.map(k => <td key={k}>{r[k].toFixed(3)}</td>)}
                  {onSelectModel && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn secondary"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => onSelectModel(m)}
                      >
                        {isCurrent ? 'Active' : 'Use for prediction'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        These numbers reflect behaviour on the synthetic proof-of-concept dataset
        only and must not be interpreted as clinical performance.
      </p>
    </div>
  );
}
