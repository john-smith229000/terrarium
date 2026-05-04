import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

// Pure HTML/CSS menu — no R3F camera fighting, no require() hacks
export default function MainMenu() {
  const { setScene } = useGameStore();

  return (
    <mesh visible={false}>
      {/* Dummy mesh so R3F scene doesn't complain, actual UI is in App.jsx portal */}
    </mesh>
  );
}

// Exported separately so App.jsx can render it outside the Canvas
export function MainMenuUI() {
  const { setScene } = useGameStore();

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 70%, #0d2208 0%, #060d04 60%, #020702 100%)',
      fontFamily: 'Georgia, serif',
    }}>
      {/* Animated firefly particles */}
      <Fireflies />

      {/* Silhouette trees */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '45%', opacity: 0.8 }} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
        {[
          [0,   280, 60, 180], [80,  260, 50, 160], [180, 270, 70, 200],
          [300, 250, 55, 170], [420, 265, 65, 190], [550, 255, 50, 160],
          [660, 272, 72, 210], [780, 248, 58, 175], [880, 268, 62, 185],
          [980, 258, 48, 155], [1080,275, 68, 195], [1160,262, 54, 165],
        ].map(([x, baseY, w, h], i) => (
          <polygon key={i}
            points={`${x},${baseY} ${x + w/2},${baseY - h} ${x + w},${baseY}`}
            fill={i % 3 === 0 ? '#0a1e07' : i % 3 === 1 ? '#081a06' : '#0c2309'}
          />
        ))}
      </svg>

      {/* Title */}
      <div style={{
        fontSize: 'clamp(52px, 10vw, 90px)',
        color: '#d1fae5',
        letterSpacing: '0.18em',
        fontWeight: 400,
        textShadow: '0 0 60px rgba(74,222,128,0.35), 0 0 120px rgba(74,222,128,0.15)',
        marginBottom: 8,
        position: 'relative', zIndex: 2,
      }}>
        terrarium
      </div>

      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 'clamp(10px, 1.8vw, 13px)',
        color: '#6ee7b7',
        letterSpacing: '0.45em',
        textTransform: 'uppercase',
        opacity: 0.55,
        marginBottom: 60,
        position: 'relative', zIndex: 2,
      }}>
        a tiny living world
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 2 }}>
        <MenuButton onClick={() => setScene('forest')} primary>
          🌿&nbsp;&nbsp;Enter the Forest
        </MenuButton>
        <MenuButton onClick={() => setScene('terrarium')}>
          🫙&nbsp;&nbsp;View Your Terrarium
        </MenuButton>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        color: 'rgba(134,239,172,0.3)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        zIndex: 2,
      }}>
        A / D · Arrow Keys · E to collect
      </div>
    </div>
  );
}

function MenuButton({ children, onClick, primary }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '13px 40px',
        background: hovered
          ? (primary ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)')
          : (primary ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)'),
        color: primary ? '#86efac' : '#8aad88',
        border: `1px solid ${primary ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: '"Courier New", monospace',
        fontSize: 14,
        letterSpacing: '0.1em',
        transition: 'all 0.2s',
        transform: hovered ? 'scale(1.03) translateY(-1px)' : 'scale(1)',
        minWidth: 240,
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </button>
  );
}

function Fireflies() {
  const flies = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    top: `${10 + Math.random() * 70}%`,
    delay: `${Math.random() * 4}s`,
    duration: `${3 + Math.random() * 3}s`,
  }));

  return (
    <>
      <style>{`
        @keyframes firefly {
          0%, 100% { opacity: 0; transform: translate(0,0) scale(0.8); }
          50% { opacity: 0.85; transform: translate(${Math.random() > 0.5 ? '+' : '-'}8px, -10px) scale(1.2); }
        }
      `}</style>
      {flies.map(f => (
        <div key={f.id} style={{
          position: 'absolute',
          left: f.left, top: f.top,
          width: 4, height: 4,
          borderRadius: '50%',
          background: '#a3e635',
          boxShadow: '0 0 6px 2px rgba(163,230,53,0.6)',
          animation: `firefly ${f.duration} ${f.delay} infinite ease-in-out`,
          zIndex: 1,
        }} />
      ))}
    </>
  );
}