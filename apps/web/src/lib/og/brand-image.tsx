import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Immagine social condivisa da opengraph-image e twitter-image. */
export function brandImage(title = 'Turn your fridge into dinner.', subtitle = 'AI-powered kitchen assistant') {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 55%, #064e3b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: 'rgba(16,185,129,0.18)',
              color: '#10b981',
              fontSize: 48,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 28,
            }}
          >
            FC
          </div>
          <div style={{ fontSize: 80, fontWeight: 700, color: 'white' }}>FrigoChef</div>
        </div>
        <div style={{ fontSize: 44, color: '#10b981', fontWeight: 600, textAlign: 'center' }}>{title}</div>
        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.55)', marginTop: 20 }}>{subtitle}</div>
      </div>
    ),
    OG_SIZE,
  );
}
