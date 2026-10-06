'use client';

import { useEffect } from 'react';

// Sostituisce il root layout quando fallisce: stili inline perché globals.css potrebbe non essere caricato.
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? '', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>FrigoChef hit a snag</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Something went wrong while loading the app. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#10b981', color: '#000', border: 0, borderRadius: 12, padding: '12px 24px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
