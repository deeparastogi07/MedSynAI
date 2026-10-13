import React from 'react';

export default function PredictionPanel({ result }) {
  if (!result) return null;
  const { prediction, data_quality } = result;
  const pct = (prediction.probability * 100).toFixed(1);
  const pos = prediction.class === 1;

  return (
    <div className="panel">
      <h3>Model prediction</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Predicted class</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: pos ? 'var(--bad)' : 'var(--good)' }}>
            {pos ? 'Positive' : 'Negative'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Probability</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{pct}%</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Model</div>
          <div><span className="badge info">{prediction.model}</span></div>
        </div>
      </div>

      <div style={{
        height: 8, background: 'var(--panel-2)', borderRadius: 4,
        marginTop: 14, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pos ? 'var(--bad)' : 'var(--good)',
          transition: 'width .4s ease',
        }} />
      </div>

      <p className="footnote">
        Prototype threshold: 0.5. In clinical deployment the operating threshold must
        be selected with domain experts and weighed against error costs.
        Data-quality status: <b>{data_quality.status}</b>.
      </p>
    </div>
  );
}
