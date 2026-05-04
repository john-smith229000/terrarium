import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

import { useGameStore, forestKeys, getTimeOfDayLighting } from '../store/useGameStore';

const FORAGEABLES = [
  { id: 'moss',   z: -4,  xWorld: 6,   icon: '🌿', name: 'Star Moss',    color: '#4ade80', statEffect: { moisture: +15 } },
  { id: 'fern',   z: -6,  xWorld: -5,  icon: '🌱', name: 'Tiny Fern',    color: '#22c55e', statEffect: { moisture: +10, light: -5 } },
  { id: 'bug',    z: -3,  xWorld: 10,  icon: '🪲', name: 'Pill Bug',      color: '#a78bfa', statEffect: { moisture: +5 } },
  { id: 'stone',  z: -5,  xWorld: -12, icon: '🪨', name: 'Smooth Pebble', color: '#94a3b8', statEffect: { light: +5 } },
  { id: 'shroom', z: -7,  xWorld: 16,  icon: '🍄', name: 'Tiny Mushroom', color: '#fb923c', statEffect: { moisture: +8, light: -8 } },
];

const X_MIN = -16;
const X_MAX = 22;
const WALK_SPEED = 6;
const COLLECT_DIST = 2.5;

const TREES = [
  ...[...Array(12)].map((_, i) => ({ x: -18 + i * 5 + Math.sin(i * 1.7) * 1.5, z: -12, scale: 1.4, shade: '#0a1c07' })),
  ...[...Array(14)].map((_, i) => ({ x: -18 + i * 4.5 + Math.cos(i * 2.1) * 1,  z: -7,  scale: 1.0, shade: '#0f2a0b' })),
  ...[...Array(10)].map((_, i) => ({ x: -16 + i * 6 + Math.sin(i * 0.9) * 2,    z: -4,  scale: 0.7, shade: '#162f10' })),
];

// ─── Time-driven sky background ──────────────────────────────────────────

function SkyBackground() {
  const meshRef = useRef();
  useFrame(() => {
    if (!meshRef.current) return;
    const lighting = getTimeOfDayLighting(useGameStore.getState().timeOfDay);
    meshRef.current.material.color.set(lighting.skyColor);
  });
  return (
    <mesh ref={meshRef} position={[3, 5, -30]}>
      <planeGeometry args={[200, 80]} />
      <meshBasicMaterial color="#060a18" depthWrite={false} />
    </mesh>
  );
}

// ─── Time-driven lights ───────────────────────────────────────────────────

function ForestTimeLights() {
  const ambRef  = useRef();
  const dir1Ref = useRef();
  const dir2Ref = useRef();
  const fogRef  = useRef();

  useFrame(({ scene }) => {
    const lighting = getTimeOfDayLighting(useGameStore.getState().timeOfDay);
    if (ambRef.current) {
      ambRef.current.color.set(lighting.ambientColor);
      ambRef.current.intensity = lighting.ambientIntensity;
    }
    if (dir1Ref.current) {
      dir1Ref.current.color.set(lighting.dirColor);
      dir1Ref.current.intensity = lighting.dirIntensity;
    }
    if (dir2Ref.current) {
      dir2Ref.current.intensity = lighting.dirIntensity * 0.25;
    }
    if (scene.fog) {
      scene.fog.color.set(lighting.fogColor);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} color="#b8d4a0" intensity={0.55} />
      <directionalLight ref={dir1Ref} position={[5, 12, -4]} intensity={0.7} color="#e8f5c8" castShadow />
      <directionalLight ref={dir2Ref} position={[-8, 6, 2]} intensity={0.2} color="#4ade80" />
      <fogExp2 attach="fog" color="#0a1a07" density={0.032} />
    </>
  );
}

// ─── Forageable item with respawn support ────────────────────────────────

function ForageableItem({ item, cameraX, onCollect }) {
  const [near, setNear] = useState(false);
  const [collected, setCollected] = useState(false);
  const [respawnRemaining, setRespawnRemaining] = useState(0);
  const meshRef = useRef();
  const nearRef = useRef(false);

  const { respawnTimers, clearRespawnTimer } = useGameStore();

  // Poll respawn timer
  useEffect(() => {
    const timer = setInterval(() => {
      const readyAt = useGameStore.getState().respawnTimers[item.id];
      if (!readyAt) {
        setRespawnRemaining(0);
        return;
      }
      const remaining = Math.max(0, readyAt - Date.now());
      setRespawnRemaining(remaining);
      if (remaining === 0) {
        // Item is ready to respawn
        setCollected(false);
        clearRespawnTimer(item.id);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item.id, clearRespawnTimer]);

  useFrame(({ clock }) => {
    if (!meshRef.current || collected) return;
    meshRef.current.position.y = 0.25 + Math.sin(clock.elapsedTime * 1.8 + item.xWorld) * 0.06;
    const dist = Math.abs(cameraX.current - item.xWorld);
    const isNear = dist < COLLECT_DIST;
    if (isNear !== nearRef.current) {
      nearRef.current = isNear;
      setNear(isNear);
    }
  });

  const formatTime = (ms) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Show respawn indicator
  if (collected) {
    return (
      <group position={[item.xWorld, 0, item.z]}>
        {respawnRemaining > 0 && (
          <Html position={[0, 0.8, 0]} center occlude={false}>
            <div style={{
              background: 'rgba(5,15,5,0.7)',
              color: 'rgba(134,239,172,0.5)',
              padding: '3px 8px',
              borderRadius: 4,
              fontFamily: '"Courier New", monospace',
              fontSize: 10,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(74,222,128,0.15)',
            }}>
              🌱 {formatTime(respawnRemaining)}
            </div>
          </Html>
        )}
        {/* Ghost marker on the ground */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 6]} />
          <meshBasicMaterial color={item.color} transparent opacity={0.15} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[item.xWorld, 0, item.z]}>
      <mesh ref={meshRef} position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color={item.color}
          emissive={item.color}
          emissiveIntensity={near ? 0.5 : 0.1}
          flatShading
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

// ─── Main forest scene ────────────────────────────────────────────────────

export default function ForestLevel() {
  const cameraXRef = useRef(0);
  const { addToInventory, startRespawnTimer } = useGameStore();
  const keys = { current: forestKeys };
  const actionConsumed = useRef(false);

  // Item collection state (tracks per-item collected status)
  const [itemStates, setItemStates] = useState(() =>
    Object.fromEntries(FORAGEABLES.map(f => [f.id, { collected: false }]))
  );

  const handleCollect = useCallback((item) => {
    addToInventory({
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      icon: item.icon,
      statEffect: item.statEffect,
    });
    startRespawnTimer(item.id);
    setItemStates(prev => ({ ...prev, [item.id]: { collected: true } }));
  }, [addToInventory, startRespawnTimer]);

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
      if (e.key === 'e' || e.key === 'E') {
        keys.current.action = false;
        actionConsumed.current = false;
      }
    };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      forestKeys.left = false;
      forestKeys.right = false;
      forestKeys.action = false;
    };
  }, []);

  useFrame(({ camera }, delta) => {
    if (keys.current.left)  cameraXRef.current -= WALK_SPEED * delta;
    if (keys.current.right) cameraXRef.current += WALK_SPEED * delta;
    cameraXRef.current = Math.max(X_MIN, Math.min(X_MAX, cameraXRef.current));

    camera.position.x = cameraXRef.current;
    camera.position.y = 1.65;
    camera.position.z = 0;

    if (keys.current.action && !actionConsumed.current) {
      FORAGEABLES.forEach(item => {
        if (itemStates[item.id]?.collected) return;
        const readyAt = useGameStore.getState().respawnTimers[item.id];
        if (readyAt && Date.now() < readyAt) return; // still respawning
        const dist = Math.abs(cameraXRef.current - item.xWorld);
        if (dist < COLLECT_DIST) {
          actionConsumed.current = true;
          handleCollect(item);
        }
      });
    }

    // Advance global time
    useGameStore.getState().tickTime(delta);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.65, 0]} fov={75} near={0.1} far={200} />

      <ForestTimeLights />
      <SkyBackground />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0, -6]} receiveShadow>
        <planeGeometry args={[80, 30, 4, 4]} />
        <meshStandardMaterial color="#1a3510" roughness={1} flatShading />
      </mesh>

      {/* Ground bumps */}
      {[...Array(30)].map((_, i) => (
        <mesh key={`g${i}`} rotation={[-Math.PI/2,0,0]} position={[-15 + i*2.5 + Math.sin(i)*0.8, 0.01, -4 + Math.cos(i*1.3)*2]}>
          <circleGeometry args={[0.3 + (i%3)*0.15, 5]} />
          <meshBasicMaterial color={i%3===0 ? '#1e3f12' : '#152d0e'} />
        </mesh>
      ))}

      {/* Trees */}
      {TREES.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.scale * 2.5, 0]}>
            <coneGeometry args={[t.scale * 0.9, t.scale * 4, 5]} />
            <meshStandardMaterial color={t.shade} roughness={1} flatShading />
          </mesh>
          <mesh position={[0, t.scale * 0.5, 0]}>
            <cylinderGeometry args={[t.scale * 0.12, t.scale * 0.15, t.scale * 1.2, 4]} />
            <meshStandardMaterial color="#2a1204" roughness={1} flatShading />
          </mesh>
        </group>
      ))}

      {/* Foreground grass */}
      {[...Array(20)].map((_, i) => (
        <mesh key={`grass${i}`} position={[-10 + i*2.2, 0.3, -1.5 + Math.sin(i)*0.5]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#2d5518" roughness={1} flatShading />
        </mesh>
      ))}

      {/* Forageable items */}
      {FORAGEABLES.map(item => (
        <ForageableItem
          key={item.id}
          item={item}
          cameraX={cameraXRef}
          onCollect={handleCollect}
        />
      ))}
    </>
  );
}