import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { SatelliteWithPosition } from "@sattracker/shared";
import SatelliteMarker from "./SatelliteMarker";

type EarthSceneProps = {
  satellites: SatelliteWithPosition[];
  selected: SatelliteWithPosition | null;
  onSelect: (satellite: SatelliteWithPosition) => void;
};

function latLonToUnitVector(latitude: number, longitude: number) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;

  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

function getSunDirection(date: Date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear =
    (date.getTime() - startOfYear) / (1000 * 60 * 60 * 24);

  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  const axialTilt = 23.44;

  const solarDeclination =
    axialTilt *
    Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);

  const subsolarLongitude = (12 - utcHours) * 15;

  return latLonToUnitVector(solarDeclination, subsolarLongitude);
}

function Earth() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [dayTexture, nightTexture] = useTexture([
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg"
  ]);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;

  const uniforms = useMemo(
    () => ({
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: getSunDirection(new Date()) }
    }),
    [dayTexture, nightTexture]
  );

  useFrame(() => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.sunDirection.value = getSunDirection(
      new Date()
    );
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[2, 128, 128]} />

        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vNormalWorld;

            void main() {
              vUv = uv;

              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vNormalWorld = normalize(mat3(modelMatrix) * normal);

              gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
          `}
          fragmentShader={`
            uniform sampler2D dayTexture;
            uniform sampler2D nightTexture;
            uniform vec3 sunDirection;

            varying vec2 vUv;
            varying vec3 vNormalWorld;

            void main() {
              vec3 dayColor = texture2D(dayTexture, vUv).rgb;
              vec3 nightColor = texture2D(nightTexture, vUv).rgb;

              float sunlight = dot(normalize(vNormalWorld), normalize(sunDirection));

              float blend = smoothstep(-0.18, 0.18, sunlight);

              vec3 color = mix(nightColor * 1.25, dayColor, blend);

              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.015, 48, 24]} />
        <meshBasicMaterial
          color="#00ffff"
          wireframe
          transparent
          opacity={0.05}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#0055ff"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
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
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 4, 6]} intensity={1.4} />

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
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}