import React from 'react';

export default function ShapPanel({ shap }) {
  if (!shap) return null;
  const contributions = shap.contributions || [];
  const maxAbs = Math.max(0.0001, ...contributions.map(c => Math.abs(c.shap)));

  return (
    <div className="panel">
      <h3>SHAP · patient-level model behaviour</h3>
      {contributions.length === 0
        ? <p className="footnote">{shap.note || 'No SHAP values available.'}</p>
        : contributions.map((c, i) => {
            const ratio = Math.abs(c.shap) / maxAbs;
            const color = c.shap >= 0 ? 'var(--bad)' : 'var(--good)';
            return (
              <div className="shap-bar-wrap" key={i}>
                <div className="shap-bar-label" title={c.raw}>{c.feature}</div>
                <div className="shap-bar-track">
                  <div className="shap-bar-fill"
                       style={{ width: `${(ratio * 100).toFixed(1)}%`, background: color }}/>
                </div>
                <div className="shap-bar-val" style={{ color }}>
                  {c.shap >= 0 ? '+' : ''}{c.shap.toFixed(3)}
                </div>
              </div>
            );
          })}
      <p className="footnote">
        Positive SHAP values push the model output towards the positive class,
        negative values push it away. This describes <b>model behaviour</b>, not causality.
      </p>
    </div>
  );
}
