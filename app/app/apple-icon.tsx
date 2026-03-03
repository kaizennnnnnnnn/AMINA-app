import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            color: 'white',
            fontSize: 68,
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