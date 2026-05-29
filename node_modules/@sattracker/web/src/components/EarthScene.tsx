import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { SatelliteWithPosition } from "@sattracker/shared";
import SatelliteMarker from "./SatelliteMarker";

type EarthSceneProps = {
  satellites: SatelliteWithPosition[];
  selected: SatelliteWithPosition | null;
  onSelect: (satellite: SatelliteWithPosition) => void;
};

function Earth() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[2, 96, 96]} />
        <meshPhongMaterial
          color="#0a2a5a"
          emissive="#03111f"
          specular="#1a4488"
          shininess={35}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.01, 36, 18]} />
        <meshBasicMaterial
          color="#00ffff"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#0055ff"
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}

export default function EarthScene({
  satellites,
  selected,
  onSelect
}: EarthSceneProps) {
  return (
    <Canvas camera={{ position: [0, 2.8, 7], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[8, 4, 6]} intensity={2.5} />
      <directionalLight position={[-8, -3, -6]} intensity={0.5} />

      <Stars radius={80} depth={40} count={3500} factor={4} fade />

      <Earth />

      {satellites.map((satellite) => (
        <SatelliteMarker
          key={`${satellite.noradId}-${satellite.name}`}
          satellite={satellite}
          selected={selected?.noradId === satellite.noradId}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={16}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}