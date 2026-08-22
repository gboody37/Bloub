import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', marginBottom: '8px', marginTop: '16px' }}>
          <div style={{ width: 24, height: 40, backgroundColor: 'white', borderRadius: '12px' }} />
          <div style={{ width: 24, height: 40, backgroundColor: 'white', borderRadius: '12px' }} />
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    ),
    { ...size }
  );
}
