import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

// Dummy R3F mesh — keeps the scene valid
export default function MainMenu() {
  return <mesh visible={false} />;
}

// ─── Main Menu UI (rendered outside Canvas in App.jsx) ────────────────────

export function MainMenuUI() {
  const { setScene, resetSave, timeOfDay, terrariumItems, inventory } = useGameStore();
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const hasSave = terrariumItems.length > 0 || inventory.length > 0;

  const handleReset = () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      return;
    }
    resetSave();
    setShowConfirmReset(false);
  };

  const handleSaveNow = () => {
    useGameStore.getState().saveGame();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  };

  // Display current in-game time
  const hour   = Math.floor(timeOfDay) % 24;
  const minute = Math.floor((timeOfDay % 1) * 60);
  const ampm   = hour < 12 ? 'AM' : 'PM';
  const h12    = hour % 12 === 0 ? 12 : hour % 12;
  const timeStr = `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;

  // Sky colour hint based on time
  const isNight = timeOfDay < 5 || timeOfDay > 21;
  const isDawn  = timeOfDay >= 5 && timeOfDay < 8;
  const isDusk  = timeOfDay >= 18 && timeOfDay <= 21;
  const skyEmoji = isNight ? '🌙' : isDawn || isDusk ? '🌅' : '☀️';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 70%, #0d2208 0%, #060d04 60%, #020702 100%)',
      fontFamily: 'Georgia, serif',
    }}>
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

      {/* In-game clock */}
      <div style={{
        position: 'absolute', top: 20, right: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 12,
        color: 'rgba(134,239,172,0.45)',
        letterSpacing: '0.15em',
        zIndex: 3,
      }}>
        {skyEmoji} {timeStr}
      </div>

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

      {/* Nav buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 2 }}>
        <MenuButton onClick={() => setScene('forest')} primary>
          🌿&nbsp;&nbsp;Enter the Forest
        </MenuButton>
        <MenuButton onClick={() => setScene('terrarium')}>
          🫙&nbsp;&nbsp;View Your Terrarium
        </MenuButton>
      </div>

      {/* Save / Reset controls */}
      <div style={{
        position: 'relative', zIndex: 2,
        marginTop: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        {/* Save now button */}
        <button
          onClick={handleSaveNow}
          style={{
            padding: '7px 22px',
            background: saveFlash ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.03)',
            color: saveFlash ? '#86efac' : 'rgba(134,239,172,0.35)',
            border: `1px solid ${saveFlash ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            transition: 'all 0.3s',
          }}
        >
          {saveFlash ? '✓ Saved' : '💾 Save Now'}
        </button>

        {/* Reset save */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 18px',
              background: showConfirmReset ? 'rgba(239,68,68,0.12)' : 'transparent',
              color: showConfirmReset ? '#fca5a5' : 'rgba(134,239,172,0.2)',
              border: `1px solid ${showConfirmReset ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: '"Courier New", monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
          >
            {showConfirmReset ? '⚠️ Confirm Reset?' : '🗑 Reset Save'}
          </button>
          {showConfirmReset && (
            <button
              onClick={() => setShowConfirmReset(false)}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: 'rgba(134,239,172,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: '"Courier New", monospace',
                fontSize: 11,
              }}
            >
              Cancel
            </button>
          )}
        </div>
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
    left: `${5 + (i * 37.3) % 90}%`,
    top: `${10 + (i * 29.7) % 70}%`,
    delay: `${(i * 0.7) % 4}s`,
    duration: `${3 + (i * 0.4) % 3}s`,
    dx: i % 2 === 0 ? '+8px' : '-8px',
  }));

  return (
    <>
      <style>{`
        @keyframes ff0 { 0%,100%{opacity:0;transform:translate(0,0) scale(0.8)} 50%{opacity:0.85;transform:translate(8px,-10px) scale(1.2)} }
        @keyframes ff1 { 0%,100%{opacity:0;transform:translate(0,0) scale(0.8)} 50%{opacity:0.85;transform:translate(-8px,-10px) scale(1.2)} }
      `}</style>
      {flies.map(f => (
        <div key={f.id} style={{
          position: 'absolute',
          left: f.left, top: f.top,
          width: 4, height: 4,
          borderRadius: '50%',
          background: '#a3e635',
          boxShadow: '0 0 6px 2px rgba(163,230,53,0.6)',
          animation: `${f.id % 2 === 0 ? 'ff0' : 'ff1'} ${f.duration} ${f.delay} infinite ease-in-out`,
          zIndex: 1,
        }} />
      ))}
    </>
  );
}