import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, getTimeOfDayLighting } from '../store/useGameStore';

useGLTF.preload('/mason_jar.glb');
useGLTF.preload('/mason_jar_lid.glb');
useGLTF.preload('/desk.glb');
useGLTF.preload('/mushroom.glb');
useGLTF.preload('/isopod.glb');


const glassMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#d4ede8'),
  transparent: true,
  opacity: 0.13,
  roughness: 0.08,
  metalness: 0.15,
  side: THREE.FrontSide,
  depthWrite: true,
});

const lidMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#b5c4b1'),
  roughness: 0.55,
  metalness: 0.75,
  flatShading: true,
});

function applyMaterial(scene, mat) {
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material = mat;
      child.castShadow = false;
    }
  });
}

function fitScene(scene, targetSize = 3.0) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = targetSize / maxDim;
  return { fitScale: s, yOffset: -box.min.y * s };
}

// ─── Spore / dust-mote particle system ────────────────────────────────────

const PARTICLE_COUNT = 60;

function TerrariumParticles({ active }) {
  const meshRef = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 1.2;
      arr[i * 3 + 1] = Math.random() * 2.2 - 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    return arr;
  }, []);

  // Per-particle phase offsets so they don't all move in sync
  const phases = useMemo(() =>
    Float32Array.from({ length: PARTICLE_COUNT }, () => Math.random() * Math.PI * 2), []);
  const speeds = useMemo(() =>
    Float32Array.from({ length: PARTICLE_COUNT }, () => 0.04 + Math.random() * 0.06), []);

  // Working copy we mutate each frame
  const pos = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !active) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ph = phases[i];
      // Drift upward, wander sideways
      pos[i * 3]     = positions[i * 3]     + Math.sin(t * 0.4 + ph) * 0.18;
      pos[i * 3 + 1] = ((positions[i * 3 + 1] + t * speeds[i]) % 2.4) - 0.2;
      pos[i * 3 + 2] = positions[i * 3 + 2] + Math.cos(t * 0.3 + ph) * 0.18;
    }
    meshRef.current.geometry.attributes.position.array.set(pos);
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef} renderOrder={10}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c8ffd4"
        size={0.028}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Pill bug critter ──────────────────────────────────────────────────────

function PillBug() {
  const { scene } = useGLTF('/isopod.glb');
  const groupRef = useRef();
  const stateRef = useRef({
    x: 0,
    z: 0,
    angle: Math.random() * Math.PI * 2,
    nextTurn: 0,
  });

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const s = stateRef.current;

    if (t > s.nextTurn) {
      s.angle += (Math.random() - 0.5) * 0.5;
      s.nextTurn = t + 3 + Math.random() * 4;
    }

    const speed = 0.004;
    const RADIUS = 0.7;
    const dist = Math.sqrt(s.x * s.x + s.z * s.z);

    if (dist > RADIUS * 0.7) {
      const toCenter = Math.atan2(-s.z, -s.x);
      let diff = toCenter - s.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.angle += diff * 0.02;
    }

    s.x += Math.cos(s.angle) * speed;
    s.z += Math.sin(s.angle) * speed;

    groupRef.current.position.set(s.x, -0.47, s.z);
    groupRef.current.rotation.y = s.angle;
    groupRef.current.position.y = -0.47 + Math.abs(Math.sin(t * 6)) * 0.008;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={0.002} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

// ─── Mason jar ────────────────────────────────────────────────────────────

function Desk() {
  const { scene } = useGLTF('/desk.glb');
  return <primitive object={scene} scale={5} position={[0, -5.2, 0]} />;
}

function MasonJar({ lidOn, children }) {
  const { scene: jarScene } = useGLTF('/mason_jar.glb');
  const { scene: lidScene } = useGLTF('/mason_jar_lid.glb');
  const jarRef = useRef();

  const { fitScale, yOffset } = useMemo(() => fitScene(jarScene, 3.0), [jarScene]);

  const { fitScale: lidScale, yOffset: lidYOffset, lidHeight } = useMemo(() => {
    const { fitScale: ls, yOffset: ly } = fitScene(lidScene, 3.0);
    const box = new THREE.Box3().setFromObject(lidScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    return { fitScale: ls, yOffset: ly, lidHeight: size.y * ls };
  }, [lidScene]);

  useEffect(() => { applyMaterial(jarScene, glassMaterial); }, [jarScene]);
  useEffect(() => { applyMaterial(lidScene, lidMaterial); }, [lidScene]);

  const jarTopY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(jarScene);
    return box.max.y * fitScale;
  }, [jarScene, fitScale]);

  useFrame(({ clock }) => {
    if (jarRef.current) {
      jarRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={jarRef} position={[0, -1.0, 0]}>
      <primitive object={jarScene} scale={fitScale} position={[0, yOffset, 0]} />

      {lidOn && (
        <primitive
          object={lidScene}
          scale={fitScale * 0.80}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, jarTopY + 2.55, 0]}
        />
      )}

      {/* Soil */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.80, 0.80, 0.18, 8]} />
        <meshStandardMaterial color="#3d2409" roughness={1} flatShading />
      </mesh>

      {/* Critter roams on the soil */}
      <PillBug />

      {/* Spore particles inside jar */}
      <TerrariumParticles active />

      {children}
    </group>
  );
}

function DeskBook({ position, rotation }) {
  const { scene } = useGLTF('/book.glb');
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position} rotation={rotation}>
      <primitive object={clone} scale={4.0} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]} />
    </group>
  );
}

function MushroomModel({ position, growthScale }) {
  const { scene } = useGLTF('/mushroom.glb');
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position} scale={[growthScale, growthScale, growthScale]}>
      <primitive object={clone} scale={0.25} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]} />
    </group>
  );
}

// ─── Terrarium item with growth animation ─────────────────────────────────

function TerrariumItem({ item, index, total }) {
  const ref = useRef();
  const angle = (index / total) * Math.PI * 2;
  const radius = Math.min(0.28, 0.08 * total);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const position = [x, -0.6 + index * 0.18, z];

  // Growth: items scale from 0.3 → 1.0 over the first 5 real minutes
  const GROW_DURATION_MS = 5 * 60 * 1000;
  const age = Date.now() - (item.placedAt || Date.now());
  const growthScale = Math.min(1, 0.3 + (age / GROW_DURATION_MS) * 0.7);

  // Continuously update scale so it actually grows while in view
  useFrame(() => {
    if (!ref.current) return;
    const currentAge = Date.now() - (item.placedAt || Date.now());
    const s = Math.min(1, 0.3 + (currentAge / GROW_DURATION_MS) * 0.7);
    ref.current.scale.setScalar(s);
  });

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.4 + angle;
  });

  const isShroom = item.id.startsWith('shroom');
  if (isShroom) {
    return <MushroomModel position={position} growthScale={growthScale} />;
  }

  const colorMap = {
    '🌿': '#4ade80', '🌱': '#22c55e', '🪲': '#a78bfa',
    '🪨': '#94a3b8', '🍄': '#fb923c',
  };
  const color = colorMap[item.icon] || '#ffffff';

  return (
    <mesh ref={ref} position={position} scale={growthScale}>
      <sphereGeometry args={[0.09, 4, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} flatShading />
      <Html position={[0, 0.18, 0]} center>
        <span style={{ fontSize: 14, pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>{item.icon}</span>
      </Html>
    </mesh>
  );
}

// ─── Time-driven lights ───────────────────────────────────────────────────

function TimeLights() {
  const ambRef = useRef();
  const dirRef = useRef();
  const ptRef  = useRef();
  const { timeOfDay, terrariumStats } = useGameStore();

  useFrame(() => {
    const lighting = getTimeOfDayLighting(useGameStore.getState().timeOfDay);
    const lightGlow = useGameStore.getState().terrariumStats.light / 100;

    if (ambRef.current) {
      ambRef.current.color.set(lighting.ambientColor);
      ambRef.current.intensity = lighting.ambientIntensity + lightGlow * 0.3;
    }
    if (dirRef.current) {
      dirRef.current.color.set(lighting.dirColor);
      dirRef.current.intensity = lighting.dirIntensity + lightGlow * 0.4;
    }
    if (ptRef.current) {
      ptRef.current.intensity = lightGlow * 1.2 * lighting.dayness;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} />
      <directionalLight ref={dirRef} position={[5, 5, 5]} castShadow />
      <pointLight ref={ptRef} position={[0, 2, 0]} color="#ffe8a0" distance={5} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function DeskTerrarium() {
  const { inventory, terrariumItems, placeItemInTerrarium } = useGameStore();
  const [hoverItem, setHoverItem] = useState(null);
  const [lidOn, setLidOn] = useState(false);

  return (
    <>
      <TimeLights />
      <Environment preset="dawn" environmentRotation={[0, Math.PI * 0.75, 0]} />

      <Desk />

      <DeskBook position={[-3.5, -1.13, -1.2]} rotation={[0, 1.5, 0]} />
      <DeskBook position={[-3.1, -1.13, -1.2]} rotation={[0, 1.6, 0]} />
      <DeskBook position={[-2.7, -1.13, -1.2]} rotation={[0, 1.65, 0]} />

      <Html position={[0, 3.2, 0]} center>
        <button
          onClick={() => setLidOn(v => !v)}
          style={{
            padding: '5px 14px',
            background: lidOn ? 'rgba(134,239,172,0.15)' : 'rgba(5,12,4,0.7)',
            color: lidOn ? '#86efac' : 'rgba(134,239,172,0.5)',
            border: `1px solid ${lidOn ? 'rgba(74,222,128,0.4)' : 'rgba(74,222,128,0.15)'}`,
            borderRadius: 6,
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            cursor: 'pointer',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
          }}
        >
          {lidOn ? '🫙 Remove Lid' : '🫙 Put On Lid'}
        </button>
      </Html>

      <MasonJar lidOn={lidOn}>
        {terrariumItems.map((item, i) => (
          <TerrariumItem key={item.placedAt} item={item} index={i} total={terrariumItems.length} />
        ))}
        {inventory.length > 0 && terrariumItems.length === 0 && (
          <Html position={[0, 1.4, 0]} center>
            <div style={{
              background: 'rgba(10,15,10,0.8)', color: '#e7fffe',
              padding: '4px 10px', borderRadius: '6px',
              fontFamily: '"Courier New", monospace', fontSize: '11px',
              pointerEvents: 'none', whiteSpace: 'nowrap',
              border: '1px solid rgba(74,222,128,0.3)',
            }}>
              Click an item below to place it ↓
            </div>
          </Html>
        )}
      </MasonJar>

      {inventory.map((item, i) => {
        const total = inventory.length;
        const spacing = Math.min(1.2, 5 / Math.max(total, 1));
        const startX = -(total - 1) * spacing * 0.5;
        const x = startX + i * spacing;
        const isHovered = hoverItem === item.id;

        return (
          <group key={item.id} position={[x, isHovered ? -0.55 : -0.65, 1.5]}>
            <mesh
              onClick={() => placeItemInTerrarium(item)}
              onPointerOver={() => setHoverItem(item.id)}
              onPointerOut={() => setHoverItem(null)}
            >
              <boxGeometry args={[0.5, 0.5, 0.08]} />
              <meshStandardMaterial
                color={isHovered ? '#1a3320' : '#111a12'}
                emissive={isHovered ? '#2d6640' : '#000'}
                emissiveIntensity={isHovered ? 0.4 : 0}
                roughness={1} flatShading
              />
            </mesh>
            <Html position={[0, 0, 0.06]} center>
              <div style={{ fontSize: 18, pointerEvents: 'none' }}>{item.icon}</div>
            </Html>
            {isHovered && (
              <Html position={[0, 0.45, 0.06]} center>
                <div style={{
                  background: 'rgba(10,20,10,0.9)', color: '#86efac',
                  padding: '2px 7px', borderRadius: '4px',
                  fontFamily: '"Courier New", monospace', fontSize: '10px',
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <OrbitControls
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={1}
        maxDistance={18}
        target={[0, 1.0, 0]}
      />
    </>
  );
}