import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

useGLTF.preload('/mason_jar.glb');

function MasonJar({ children }) {
  const { scene } = useGLTF('/mason_jar.glb');
  const jarRef = useRef();

  // Auto-fit: scale to ~6 units tall (3x the original 2)
  const { fitScale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 3.0 / maxDim;
    return { fitScale: s, yOffset: -box.min.y * s };
  }, [scene]);

  // Glass material with transmission for real transparency
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#a8d4c8'),
          transparent: true,
          opacity: 0.18,
          roughness: 0.05,
          metalness: 0.3,
          side: THREE.FrontSide,
          depthWrite: true,
        });
        child.castShadow = false;
      }
    });
  }, [scene]);

  useFrame(({ clock }) => {
    if (jarRef.current) {
      jarRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={jarRef} position={[0, -1.0, 0]}>
      <primitive object={scene} scale={fitScale} position={[0, yOffset, 0]} />
      {/* Soil layer — tweak y to sit inside the jar mouth */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.80, 0.80, 0.18, 8]} />
        <meshStandardMaterial color="#3d2409" roughness={1} flatShading />
      </mesh>
      {children}
    </group>
  );
}

function TerrariumItem({ item, index, total }) {
  const ref = useRef();
  const angle = (index / total) * Math.PI * 2;
  const radius = Math.min(0.28, 0.08 * total);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.4 + angle;
    }
  });

  const colorMap = {
    '🌿': '#4ade80', '🌱': '#22c55e', '🪲': '#a78bfa',
    '🪨': '#94a3b8', '🍄': '#fb923c',
  };
  const color = colorMap[item.icon] || '#ffffff';

  return (
    <mesh ref={ref} position={[x, -0.6 + index * 0.18, z]}>
      <sphereGeometry args={[0.09, 4, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} flatShading />
      <Html position={[0, 0.18, 0]} center>
        <span style={{ fontSize: 14, pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>{item.icon}</span>
      </Html>
    </mesh>
  );
}

export default function DeskTerrarium() {
  const { inventory, terrariumItems, terrariumStats, placeItemInTerrarium } = useGameStore();
  const [hoverItem, setHoverItem] = useState(null);
  const lightGlow = terrariumStats.light / 100;

  return (
    <>
      <ambientLight intensity={0.4 + lightGlow * 0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8 + lightGlow * 0.5} castShadow />
      <pointLight position={[0, 2, 0]} intensity={lightGlow * 1.2} color="#ffe8a0" distance={5} />
      <Environment preset="dawn" environmentRotation={[0, Math.PI * 0.75, 0]} />


      {/* Desk surface */}
      <mesh position={[0, -1.1, 0]} receiveShadow>
        <boxGeometry args={[12, 0.15, 6]} />
        <meshStandardMaterial color="#6b3f1e" roughness={1} flatShading />
      </mesh>

      {/* Books */}
      {[[-3.5, '#c84b31'], [-3.1, '#2563eb'], [-2.7, '#16a34a']].map(([x, c], i) => (
        <mesh key={i} position={[x, -0.75, -1.2]} rotation={[0, 0.08 * i, 0]}>
          <boxGeometry args={[0.18, 0.6, 0.5]} />
          <meshStandardMaterial color={c} roughness={1} flatShading />
        </mesh>
      ))}

      {/* Mason jar from GLB — auto-fitted to scene */}
      <MasonJar>
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

      {/* Inventory cards */}
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
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        minDistance={4}
        maxDistance={18}
        target={[0, 1.0, 0]}
      />
    </>
  );
}