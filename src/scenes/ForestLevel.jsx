import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Html } from '@react-three/drei';

import { useGameStore, forestKeys } from '../store/useGameStore';

const FORAGEABLES = [
  { id: 'moss',   z: -4,  xWorld: 6,   icon: '🌿', name: 'Star Moss',    color: '#4ade80', statEffect: { moisture: +15 } },
  { id: 'fern',   z: -6,  xWorld: -5,  icon: '🌱', name: 'Tiny Fern',    color: '#22c55e', statEffect: { moisture: +10, light: -5 } },
  { id: 'bug',    z: -3,  xWorld: 10,  icon: '🪲', name: 'Pill Bug',      color: '#a78bfa', statEffect: { moisture: +5 } },
  { id: 'stone',  z: -5,  xWorld: -12, icon: '🪨', name: 'Smooth Pebble', color: '#94a3b8', statEffect: { light: +5 } },
  { id: 'shroom', z: -7,  xWorld: 16,  icon: '🍄', name: 'Tiny Mushroom', color: '#fb923c', statEffect: { moisture: +8, light: -8 } },
];

// World bounds in X (camera/player travel range)
const X_MIN = -16;
const X_MAX = 22;
const WALK_SPEED = 6;
const COLLECT_DIST = 2.5; // world-X distance to trigger collect prompt

// Trees distributed across the world
const TREES = [
  ...[...Array(12)].map((_, i) => ({ x: -18 + i * 5 + Math.sin(i * 1.7) * 1.5, z: -12, scale: 1.4, shade: '#0a1c07' })),
  ...[...Array(14)].map((_, i) => ({ x: -18 + i * 4.5 + Math.cos(i * 2.1) * 1,  z: -7,  scale: 1.0, shade: '#0f2a0b' })),
  ...[...Array(10)].map((_, i) => ({ x: -16 + i * 6 + Math.sin(i * 0.9) * 2,    z: -4,  scale: 0.7, shade: '#162f10' })),
];

function ForageableItem({ item, cameraX, onCollect }) {
  const [near, setNear] = useState(false);
  const [collected, setCollected] = useState(false);
  const meshRef = useRef();
  const nearRef = useRef(false);

  useFrame(({ clock }) => {
    if (!meshRef.current || collected) return;
    // Bob gently
    meshRef.current.position.y = 0.25 + Math.sin(clock.elapsedTime * 1.8 + item.xWorld) * 0.06;
    // Check proximity to camera (= player position in this first-person setup)
    const dist = Math.abs(cameraX.current - item.xWorld);
    const isNear = dist < COLLECT_DIST;
    if (isNear !== nearRef.current) {
      nearRef.current = isNear;
      setNear(isNear);
    }
  });

  if (collected) return null;

  return (
    <group position={[item.xWorld, 0, item.z]}>
      <mesh ref={meshRef} position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color={item.color}
          emissive={item.color}
          emissiveIntensity={near ? 0.5 : 0.1}
        />
      </mesh>
      {near && (
        <Html position={[0, 1.1, 0]} center occlude={false}>
          <div style={{
            background: 'rgba(5,15,5,0.88)',
            color: '#d1fae5',
            padding: '4px 10px',
            borderRadius: 5,
            fontFamily: '"Courier New", monospace',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(74,222,128,0.4)',
            boxShadow: '0 0 12px rgba(74,222,128,0.2)',
          }}>
            {item.icon} {item.name} — <b>E</b>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function ForestLevel() {
  // In first-person the camera IS the player — we track its X position
  const cameraXRef = useRef(0);
  const { addToInventory } = useGameStore();
  const keys = { current: forestKeys }; // shared with App.jsx UI buttons
  const actionConsumed = useRef(false);
  const [items, setItems] = useState(() => FORAGEABLES.map(f => ({ ...f })));

  const handleCollect = useCallback((item) => {
    addToInventory({ id: `${item.id}-${Date.now()}`, name: item.name, icon: item.icon, statEffect: item.statEffect });
    setItems(prev => prev.filter(i => i.id !== item.id));
  }, [addToInventory]);

  useEffect(() => {
    const onDown = (e) => {
      if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (e.key === 'a' || e.key === 'ArrowLeft')  keys.current.left   = true;
      if (e.key === 'd' || e.key === 'ArrowRight') keys.current.right  = true;
      if (e.key === 'e' || e.key === 'E')          keys.current.action = true;
    };
    const onUp = (e) => {
      if (e.key === 'a' || e.key === 'ArrowLeft')  keys.current.left   = false;
      if (e.key === 'd' || e.key === 'ArrowRight') keys.current.right  = false;
      if (e.key === 'e' || e.key === 'E') { keys.current.action = false; actionConsumed.current = false; }
    };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      // Reset all keys on unmount so stale presses don't bleed into other scenes
      forestKeys.left = false;
      forestKeys.right = false;
      forestKeys.action = false;
    };
  }, []);

  useFrame(({ camera }, delta) => {
    // Clamp and move — never touch rotation or call lookAt (causes NaN / white screen)
    if (keys.current.left)  cameraXRef.current -= WALK_SPEED * delta;
    if (keys.current.right) cameraXRef.current += WALK_SPEED * delta;
    cameraXRef.current = Math.max(X_MIN, Math.min(X_MAX, cameraXRef.current));

    // Apply to camera position only — rotation is fixed by the Camera component
    camera.position.x = cameraXRef.current;
    camera.position.y = 1.65;
    camera.position.z = 0;

    // Collect action
    if (keys.current.action && !actionConsumed.current) {
      items.forEach(item => {
        const dist = Math.abs(cameraXRef.current - item.xWorld);
        if (dist < COLLECT_DIST) {
          actionConsumed.current = true;
          handleCollect(item);
        }
      });
    }
  });

  return (
    <>
      {/* Camera — makeDefault resets properly each time this scene mounts */}
      <PerspectiveCamera makeDefault position={[0, 1.65, 0]} fov={75} near={0.1} far={200} />

      {/* Lighting — warm dappled forest feel */}
      <ambientLight intensity={0.55} color="#b8d4a0" />
      <directionalLight position={[5, 12, -4]} intensity={0.7} color="#e8f5c8" castShadow />
      <directionalLight position={[-8, 6, 2]}  intensity={0.2} color="#4ade80" />
      <fogExp2 attach="fog" color="#0a1a07" density={0.032} />

      {/* Sky */}
      <mesh position={[0, 0, -40]}>
        <planeGeometry args={[400, 80]} />
        <meshBasicMaterial color="#05120300" />
      </mesh>

      {/* Ground — long strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0, -6]} receiveShadow>
        <planeGeometry args={[80, 30]} />
        <meshStandardMaterial color="#1a3510" roughness={1} />
      </mesh>
      {/* Ground texture bumps */}
      {[...Array(30)].map((_, i) => (
        <mesh key={`g${i}`} rotation={[-Math.PI/2,0,0]} position={[-15 + i*2.5 + Math.sin(i)*0.8, 0.01, -4 + Math.cos(i*1.3)*2]}>
          <circleGeometry args={[0.3 + Math.random()*0.3, 6]} />
          <meshBasicMaterial color={i%3===0 ? '#1e3f12' : '#152d0e'} />
        </mesh>
      ))}

      {/* Layered trees */}
      {TREES.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.scale * 2.5, 0]}>
            <coneGeometry args={[t.scale * 0.9, t.scale * 4, 7]} />
            <meshStandardMaterial color={t.shade} roughness={1} />
          </mesh>
          <mesh position={[0, t.scale * 0.5, 0]}>
            <cylinderGeometry args={[t.scale * 0.12, t.scale * 0.15, t.scale * 1.2, 6]} />
            <meshStandardMaterial color="#2a1204" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Foreground grass blades */}
      {[...Array(20)].map((_, i) => (
        <mesh key={`grass${i}`} position={[-10 + i*2.2, 0.3, -1.5 + Math.sin(i)*0.5]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#2d5518" roughness={1} />
        </mesh>
      ))}

      {/* Forageable items */}
      {items.map(item => (
        <ForageableItem key={item.id} item={item} cameraX={cameraXRef} onCollect={handleCollect} />
      ))}

    </>
  );
}