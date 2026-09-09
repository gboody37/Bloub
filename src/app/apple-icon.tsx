import { ImageResponse } from 'next/og';
 
export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'radial-gradient(circle at center, #2a221c, #14110f)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
          border: '4px solid #3d3128',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', marginBottom: '8px', marginTop: '10px' }}>
          <div style={{ width: 16, height: 16, backgroundColor: '#f5efe6', borderRadius: '50%' }} />
          <div style={{ width: 16, height: 16, backgroundColor: '#f5efe6', borderRadius: '50%' }} />
        </div>
        <div style={{ width: 30, height: 6, backgroundColor: '#e07a38', borderRadius: '4px' }} />
      </div>
    ),
    { ...size }
  );
}
