import { useEffect, useMemo, useRef } from "react";
import {
  Canvas,
  ThreeEvent,
  useFrame,
  useThree
} from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { SatelliteWithPosition } from "@sattracker/shared";
import SatelliteMarker from "./SatelliteMarker";
import VisibilityCone from "./VisibilityCone";
import CloudTileLayer from "./CloudTileLayer";
import GroundMarker from "./GroundMarker";
import { latLonToScenePosition } from "../lib/satelliteMath";
import {
  scenePointToLatLon,
  type GroundStation
} from "../lib/visibilityMath";

type EarthSceneProps = {
  satellites: SatelliteWithPosition[];
  selected: SatelliteWithPosition | null;
  onSelect: (satellite: SatelliteWithPosition) => void;
  showWeather: boolean;
  showVisibilityCone: boolean;
  groundStation: GroundStation | null;
  visibleNoradIds: Set<number>;
  onPlaceGroundStation: (station: GroundStation) => void;
  earthViewActive: boolean;
};

function latLonToUnitVector(latitude: number, longitude: number) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);

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
    Math.sin(THREE.MathUtils.degToRad((360 / 365) * (dayOfYear - 81)));
  const subsolarLongitude = (12 - utcHours) * 15;

  return latLonToUnitVector(solarDeclination, subsolarLongitude);
}

type EarthProps = {
  onPlaceGroundStation: (station: GroundStation) => void;
};

function Earth({ onPlaceGroundStation }: EarthProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [dayTexture, nightTexture] = useTexture([
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg"
  ]);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  dayTexture.anisotropy = 4;
  nightTexture.anisotropy = 4;

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
    materialRef.current.uniforms.sunDirection.value = getSunDirection(new Date());
  });

  function handleEarthClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onPlaceGroundStation(scenePointToLatLon(event.point));
  }

  return (
    <mesh onClick={handleEarthClick}>
      <sphereGeometry args={[2, 64, 32]} />
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
            vec3 color = mix(nightColor * 1.2, dayColor, blend);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function localBasis(latitude: number, longitude: number) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);

  const up = new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon)
  ).normalize();

  const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon)).normalize();
  const north = new THREE.Vector3().crossVectors(up, east).normalize();

  return { up, east, north };
}

type CameraControllerProps = {
  groundStation: GroundStation | null;
  earthViewActive: boolean;
};

function CameraController({
  groundStation,
  earthViewActive
}: CameraControllerProps) {
  const { camera, gl } = useThree();
  const orbitControlsRef = useRef<any>(null);
  const defaultCamera = useRef(new THREE.Vector3(0, 2.8, 7));

  const viewState = useRef({
    yaw: 0,
    pitch: THREE.MathUtils.degToRad(45),
    dragging: false
  });

  useEffect(() => {
    if (!earthViewActive || !groundStation) return;

    const canvas = gl.domElement;

    function handlePointerDown() {
      viewState.current.dragging = true;
      canvas.style.cursor = "grabbing";
    }

    function handlePointerUp() {
      viewState.current.dragging = false;
      canvas.style.cursor = "grab";
    }

    function handlePointerMove(event: PointerEvent) {
      if (!viewState.current.dragging) return;

      viewState.current.yaw -= event.movementX * 0.004;
      viewState.current.pitch -= event.movementY * 0.004;
      viewState.current.pitch = THREE.MathUtils.clamp(
        viewState.current.pitch,
        THREE.MathUtils.degToRad(3),
        THREE.MathUtils.degToRad(88)
      );
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);
    canvas.style.cursor = "grab";

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
      canvas.style.cursor = "auto";
    };
  }, [earthViewActive, groundStation, gl.domElement]);

  useEffect(() => {
    if (earthViewActive) {
      viewState.current.yaw = 0;
      viewState.current.pitch = THREE.MathUtils.degToRad(45);
    }
  }, [earthViewActive, groundStation]);

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    if (earthViewActive && groundStation) {
      const surface = latLonToScenePosition(
        groundStation.latitude,
        groundStation.longitude,
        2.005
      );
      const cameraPosition = new THREE.Vector3(surface.x, surface.y, surface.z);
      const { up, east, north } = localBasis(
        groundStation.latitude,
        groundStation.longitude
      );

      const yaw = viewState.current.yaw;
      const pitch = viewState.current.pitch;
      const horizontalDirection = new THREE.Vector3()
        .addScaledVector(north, Math.cos(yaw))
        .addScaledVector(east, Math.sin(yaw))
        .normalize();
      const lookDirection = new THREE.Vector3()
        .addScaledVector(horizontalDirection, Math.cos(pitch))
        .addScaledVector(up, Math.sin(pitch))
        .normalize();

      camera.position.copy(cameraPosition);
      camera.up.copy(up);
      camera.fov = 82;
      camera.near = 0.0005;
      camera.lookAt(cameraPosition.clone().addScaledVector(lookDirection, 10));
      camera.updateProjectionMatrix();

      if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
      return;
    }

    camera.up.set(0, 1, 0);
    camera.fov = 45;
    camera.near = 0.01;
    camera.updateProjectionMatrix();

    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
      orbitControlsRef.current.target.set(0, 0, 0);
      orbitControlsRef.current.update();
    }

    if (camera.position.length() < 3.2) {
      camera.position.lerp(defaultCamera.current, 0.08);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <OrbitControls
      ref={orbitControlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={14}
      autoRotate={!earthViewActive}
      autoRotateSpeed={0.15}
    />
  );
}

export default function EarthScene({
  satellites,
  selected,
  onSelect,
  showWeather,
  showVisibilityCone,
  groundStation,
  visibleNoradIds,
  onPlaceGroundStation,
  earthViewActive
}: EarthSceneProps) {
  return (
    <Canvas camera={{ position: [0, 2.8, 7], fov: 45, near: 0.01, far: 1000 }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} />

      <Earth onPlaceGroundStation={onPlaceGroundStation} />
      <CloudTileLayer visible={showWeather && !earthViewActive} />

      {!earthViewActive && <GroundMarker station={groundStation} />}

      <VisibilityCone
        satellite={selected}
        visible={showVisibilityCone && !earthViewActive}
      />

      {satellites.map((satellite) => (
        <SatelliteMarker
          key={`${satellite.noradId}-${satellite.name}`}
          satellite={satellite}
          selected={selected?.noradId === satellite.noradId}
          visibleFromStation={visibleNoradIds.has(satellite.noradId)}
          earthViewActive={earthViewActive}
          onSelect={onSelect}
        />
      ))}

      <CameraController
        groundStation={groundStation}
        earthViewActive={earthViewActive}
      />
    </Canvas>
  );
}
