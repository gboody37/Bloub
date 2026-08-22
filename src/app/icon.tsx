import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
export const size = { width: 512, height: 512 };
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
          borderRadius: '114px',
        }}
      >
        <div style={{ display: 'flex', gap: '68px', marginBottom: '22px', marginTop: '45px' }}>
          <div style={{ width: 68, height: 114, backgroundColor: 'white', borderRadius: '34px' }} />
          <div style={{ width: 68, height: 114, backgroundColor: 'white', borderRadius: '34px' }} />
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="227" height="227" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    ),
    { ...size }
  );
}
