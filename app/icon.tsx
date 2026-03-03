import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #09090b 0%, #18181b 55%, #27272a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 44,
            borderRadius: 120,
            border: '2px solid rgba(255,255,255,0.08)',
          }}
        />

        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            boxShadow: '0 24px 60px rgba(219,39,119,0.35)',
            color: 'white',
            fontSize: 170,
            fontWeight: 700,
            letterSpacing: '-0.04em',
          }}
        >
          U
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}