import { ImageResponse } from 'next/og';
 
export const runtime = 'nodejs';
export const size = { width: 512, height: 512 };
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
          borderRadius: '114px',
          border: '12px solid #3d3128',
        }}
      >
        <div style={{ display: 'flex', gap: '54px', marginBottom: '20px', marginTop: '30px' }}>
          <div style={{ width: 44, height: 44, backgroundColor: '#f5efe6', borderRadius: '50%' }} />
          <div style={{ width: 44, height: 44, backgroundColor: '#f5efe6', borderRadius: '50%' }} />
        </div>
        <div style={{ width: 80, height: 16, backgroundColor: '#e07a38', borderRadius: '8px' }} />
      </div>
    ),
    { ...size }
  );
}
