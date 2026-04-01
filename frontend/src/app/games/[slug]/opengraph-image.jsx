import { ImageResponse } from 'next/og';

export const alt = 'GameVesta Game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default async function OGImage({ params }) {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0b1a 0%, #12132d 50%, #1a1b3a 100%)',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 80, marginBottom: 20 }}>🎮</div>
        <div style={{
          fontSize: 48, fontWeight: 800, textAlign: 'center',
          background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
          backgroundClip: 'text', color: 'transparent',
          padding: '0 40px', lineHeight: 1.2,
        }}>
          {name}
        </div>
        <div style={{ fontSize: 22, color: '#9ca3af', marginTop: 16 }}>
          Play. Compete. Win — on GameVesta
        </div>
        <div style={{
          position: 'absolute', bottom: 30, fontSize: 16, color: '#6b7280',
        }}>
          gamevesta.com
        </div>
      </div>
    ),
    { ...size }
  );
}
