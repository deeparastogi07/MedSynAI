import React from 'react';

export default function ReviewBanner({ coordination }) {
  if (!coordination) return null;
  const { review_required, reasons, disagreement, evidence_provenance } = coordination;
  return (
    <>
      <div className={`review-banner ${review_required ? 'required' : 'clear'}`}>
        <div>
          <div style={{ fontWeight: 600 }}>
            {review_required ? 'Professional review required' : 'No escalation trigger'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {reasons ? reasons.join(' · ') : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {disagreement && <span className="badge bad">model / rule disagreement</span>}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Evidence provenance</h3>
        <table className="prov-table">
          <tbody>
            {(evidence_provenance || []).map((e, i) => (
              <tr key={i}>
                <td>{e.component}</td>
                <td style={{ color: 'var(--muted)' }}>{e.origin}</td>
                <td>{e.shown}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="footnote">
          MedSynAI is an assistant for evidence presentation, not an autonomous
          diagnostic system. The clinician remains responsible for the decision.
        </p>
      </div>
    </>
  );
}
