import { Canvas } from '@react-three/fiber';
import { useGameStore, forestKeys } from './store/useGameStore';
import DeskTerrarium from './scenes/DeskTerrarium';
import ForestLevel from './scenes/ForestLevel';
import { MainMenuUI } from './scenes/MainMenu';
import { PS1Effect } from './PS1Effect';

function StatBar({ label, icon, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: '"Courier New", monospace', letterSpacing: '0.05em' }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: 12, color, fontFamily: '"Courier New", monospace' }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease', boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
}

function InventorySlot({ item }) {
  return (
    <div title={item.name} style={{
      width: 44, height: 44,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, position: 'relative',
    }}>
      {item.icon}
      <div style={{
        position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: '"Courier New", monospace',
        whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        {item.name.split(' ')[0]}
      </div>
    </div>
  );
}

function HudPanel({ children, style }) {
  return (
    <div style={{
      background: 'rgba(5, 12, 4, 0.65)',
      border: '1px solid rgba(74,222,128,0.12)',
      borderRadius: 10, backdropFilter: 'blur(8px)',
      padding: '12px 14px', ...style,
    }}>
      {children}
    </div>
  );
}

function NavButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', cursor: 'pointer',
      background: 'rgba(74,222,128,0.08)', color: '#86efac',
      border: '1px solid rgba(74,222,128,0.25)', borderRadius: 7,
      fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.05em',
      backdropFilter: 'blur(4px)', transition: 'background 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.18)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}
    >
      {children}
    </button>
  );
}

function ForestControls() {
  const btn = {
    width: 54, height: 54,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, color: 'white', fontSize: 20,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
  };
  const press   = (k) => { forestKeys[k] = true; };
  const release = (k) => { forestKeys[k] = false; };
  const bind = (k) => ({
    onPointerDown:  (e) => { e.preventDefault(); press(k); },
    onPointerUp:    (e) => { e.preventDefault(); release(k); },
    onPointerLeave: ()  => release(k),
  });
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={btn} {...bind('left')}>◀</div>
      <div style={{ ...btn, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac', fontSize: 13, fontFamily: 'monospace' }} {...bind('action')}>E</div>
      <div style={btn} {...bind('right')}>▶</div>
    </div>
  );
}

export default function App() {
  const { currentScene, setScene, inventory, terrariumStats, terrariumItems } = useGameStore();
  const isMenu = currentScene === 'menu';

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative', backgroundColor: '#060d04' }}>

      {/* ── Main Menu (pure HTML) ── */}
      {isMenu && <MainMenuUI />}

      {/* ── HUD — shown in terrarium and forest ── */}
      {!isMenu && (
        <>
          {/* Top-left nav */}
          <div style={{ position: 'absolute', top: 18, left: 18, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <HudPanel style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px' }}>
              <span style={{ fontFamily: '"Georgia", serif', fontSize: 18, color: '#d1fae5', letterSpacing: '0.1em', textShadow: '0 0 12px rgba(74,222,128,0.4)' }}>
                terrarium
              </span>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: 'rgba(134,239,172,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {currentScene === 'terrarium' ? '🫙 Desk' : '🌿 Forest'}
              </span>
            </HudPanel>

            <div style={{ display: 'flex', gap: 8 }}>
              <NavButton onClick={() => setScene(currentScene === 'terrarium' ? 'forest' : 'terrarium')}>
                {currentScene === 'terrarium' ? '→ Go Foraging' : '→ Visit Terrarium'}
              </NavButton>
              <NavButton onClick={() => setScene('menu')}>Menu</NavButton>
            </div>

            {currentScene === 'terrarium' && (
              <HudPanel style={{ minWidth: 170, marginTop: 2 }}>
                <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: 'rgba(134,239,172,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Ecosystem
                </div>
                <StatBar label="Moisture" icon="💧" value={terrariumStats.moisture} color="#38bdf8" />
                <StatBar label="Light"    icon="☀️" value={terrariumStats.light}    color="#fbbf24" />
                <div style={{ marginTop: 10, fontFamily: '"Courier New", monospace', fontSize: 10, color: 'rgba(134,239,172,0.4)' }}>
                  {terrariumItems.length === 0 ? 'Empty — go forage!' : `${terrariumItems.length} species inside`}
                </div>
              </HudPanel>
            )}

            {currentScene === 'forest' && (
              <HudPanel style={{ padding: '7px 12px' }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: 'rgba(134,239,172,0.45)', letterSpacing: '0.1em' }}>
                  A / D &nbsp;·&nbsp; Arrows &nbsp;·&nbsp; E to collect
                </span>
              </HudPanel>
            )}
          </div>

          {/* Bottom: movement buttons + inventory */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {currentScene === 'forest' && <ForestControls />}
            <HudPanel style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 120, padding: '10px 14px' }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: 'rgba(134,239,172,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginRight: 4, whiteSpace: 'nowrap' }}>
                Pack
              </span>
              {inventory.length === 0 ? (
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '0 6px' }}>empty...</span>
              ) : (
                <div style={{ display: 'flex', gap: 8, paddingBottom: 20 }}>
                  {inventory.map((item) => <InventorySlot key={item.id} item={item} />)}
                </div>
              )}
            </HudPanel>
          </div>
        </>
      )}

      {/* ── Single persistent Canvas ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, visibility: isMenu ? 'hidden' : 'visible' }}>
        {/*
          imageRendering: pixelated ensures the browser doesn't smooth the
          low-res canvas back out when it's displayed at full size
        */}
        <Canvas
          gl={{ antialias: false, alpha: false }}
          shadows
          style={{ imageRendering: 'pixelated' }}
        >
          <color attach="background" args={['#060d04']} />

          {/* PS1 low-res render pass — renders scene at ~15% res then upscales */}
          {!isMenu && <PS1Effect resolution={0.25} />}

          {currentScene === 'terrarium' && <DeskTerrarium />}
          {currentScene === 'forest'    && <ForestLevel />}
        </Canvas>
      </div>

    </div>
  );
}