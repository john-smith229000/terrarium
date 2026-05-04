import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, PerspectiveCamera } from '@react-three/drei';
import { useGameStore } from '../store/useGameStore';

// Small 3D representations of each item type inside the jar
function TerrariumItem({ item, index, total }) {
  const ref = useRef();
  const angle = (index / total) * Math.PI * 2;
  const radius = Math.min(0.5, 0.15 * total);
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
    <mesh ref={ref} position={[x, -0.55 + index * 0.18, z]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      <Html position={[0, 0.18, 0]} center>
        <span style={{ fontSize: 14, pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>{item.icon}</span>
      </Html>
    </mesh>
  );
}

export default function DeskTerrarium() {
  const { inventory, terrariumItems, terrariumStats, placeItemInTerrarium } = useGameStore();
  const [hoverItem, setHoverItem] = useState(null);
  const jarRef = useRef();

  useFrame(({ clock }) => {
    if (jarRef.current) {
      jarRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.05;
    }
  });

  // Moss/fern tint on glass based on moisture
  const moistureTint = `hsl(${140 + terrariumStats.moisture * 0.4}, 60%, ${50 + terrariumStats.moisture * 0.2}%)`;
  const lightGlow = terrariumStats.light / 100;

  return (
    <>
      <ambientLight intensity={0.4 + lightGlow * 0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8 + lightGlow * 0.5} castShadow />
      <pointLight position={[0, 2, 0]} intensity={lightGlow * 1.2} color="#ffe8a0" distance={5} />
      <Environment preset="apartment" />

      {/* Desk surface */}
      <mesh position={[0, -1.1, 0]} receiveShadow>
        <boxGeometry args={[12, 0.15, 6]} />
        <meshStandardMaterial color="#6b3f1e" roughness={0.8} />
      </mesh>
      {/* Desk edge detail */}
      <mesh position={[0, -1.0, -2.9]} receiveShadow>
        <boxGeometry args={[12, 0.25, 0.1]} />
        <meshStandardMaterial color="#5a3318" roughness={0.9} />
      </mesh>

      {/* Books on desk */}
      {[[-3.5, -0.75, -1.2, '#c84b31'], [-3.2, -0.75, -1.2, '#2563eb'], [-2.9, -0.75, -1.2, '#16a34a']].map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0.1 * i, 0]}>
          <boxGeometry args={[0.18, 0.6, 0.5]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
      ))}

      {/* The terrarium jar — glass cylinder */}
      <group ref={jarRef} position={[0, 0.2, 0]}>
        {/* Glass walls */}
        <mesh castShadow>
          <cylinderGeometry args={[0.9, 0.9, 2, 32, 1, true]} />
          <meshPhysicalMaterial
            color={moistureTint}
            transmission={0.88}
            opacity={1}
            metalness={0.05}
            roughness={0.05}
            ior={1.5}
            side={2} // DoubleSide
          />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -1, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.05, 32]} />
          <meshStandardMaterial color="#8B6914" roughness={0.7} />
        </mesh>
        {/* Lid */}
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.92, 0.92, 0.08, 32]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Soil layer */}
        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.87, 0.87, 0.5, 32]} />
          <meshStandardMaterial color="#3d2409" roughness={1} />
        </mesh>

        {/* Placed items */}
        {terrariumItems.map((item, i) => (
          <TerrariumItem key={item.placedAt} item={item} index={i} total={terrariumItems.length} />
        ))}

        {/* Prompt to place items if inventory has something */}
        {inventory.length > 0 && terrariumItems.length === 0 && (
          <Html position={[0, 1.4, 0]} center>
            <div style={{
              background: 'rgba(10,15,10,0.8)',
              color: '#d1fae5',
              padding: '4px 10px',
              borderRadius: '6px',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(74,222,128,0.3)',
            }}>
              Click an item below to place it ↓
            </div>
          </Html>
        )}
      </group>

      {/* Inventory items as clickable cards floating above the desk */}
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
                roughness={0.5}
              />
            </mesh>
            <Html position={[0, 0, 0.06]} center>
              <div style={{
                fontSize: 18,
                pointerEvents: 'none',
                cursor: 'pointer',
                filter: isHovered ? 'drop-shadow(0 0 6px #4ade80)' : 'none',
                transition: 'filter 0.2s',
              }}>
                {item.icon}
              </div>
            </Html>
            {isHovered && (
              <Html position={[0, 0.45, 0.06]} center>
                <div style={{
                  background: 'rgba(10,20,10,0.9)',
                  color: '#86efac',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '10px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
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
        minDistance={2}
        maxDistance={8}
        target={[0, 0.2, 0]}
      />
    </>
  );
}