import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

type CloudTileLayerProps = {
  visible: boolean;
};

const TILE_ZOOM = 2;
const TILE_COUNT = 2 ** TILE_ZOOM;
const EARTH_RADIUS = 2.026;
const TILE_SEGMENTS = 8;

function tileUrl(x: number, y: number) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  return `https://tile.openweathermap.org/map/clouds_new/${TILE_ZOOM}/${x}/${y}.png?appid=${apiKey}`;
}

function tileBounds(x: number, y: number) {
  const lonMin = (x / TILE_COUNT) * 360 - 180;
  const lonMax = ((x + 1) / TILE_COUNT) * 360 - 180;

  const n1 = Math.PI - (2 * Math.PI * y) / TILE_COUNT;
  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / TILE_COUNT;

  const latMax = (180 / Math.PI) * Math.atan(Math.sinh(n1));
  const latMin = (180 / Math.PI) * Math.atan(Math.sinh(n2));

  return { lonMin, lonMax, latMin, latMax };
}

function makeTileGeometry(x: number, y: number) {
  const { lonMin, lonMax, latMin, latMax } = tileBounds(x, y);
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= TILE_SEGMENTS; row++) {
    const v = row / TILE_SEGMENTS;
    const lat = THREE.MathUtils.lerp(latMax, latMin, v);
    const latRad = THREE.MathUtils.degToRad(lat);

    for (let col = 0; col <= TILE_SEGMENTS; col++) {
      const u = col / TILE_SEGMENTS;
      const lon = THREE.MathUtils.lerp(lonMin, lonMax, u);
      const lonRad = THREE.MathUtils.degToRad(lon);

      positions.push(
        EARTH_RADIUS * Math.cos(latRad) * Math.cos(lonRad),
        EARTH_RADIUS * Math.sin(latRad),
        -EARTH_RADIUS * Math.cos(latRad) * Math.sin(lonRad)
      );
      uvs.push(u, 1 - v);
    }
  }

  const rowSize = TILE_SEGMENTS + 1;

  for (let row = 0; row < TILE_SEGMENTS; row++) {
    for (let col = 0; col < TILE_SEGMENTS; col++) {
      const a = row * rowSize + col;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function CloudTiles() {
  const tiles = useMemo(() => {
    const result: { x: number; y: number; url: string; geometry: THREE.BufferGeometry }[] = [];

    for (let y = 0; y < TILE_COUNT; y++) {
      for (let x = 0; x < TILE_COUNT; x++) {
        result.push({ x, y, url: tileUrl(x, y), geometry: makeTileGeometry(x, y) });
      }
    }

    return result;
  }, []);

  const textures = useLoader(
    THREE.TextureLoader,
    tiles.map((tile) => tile.url)
  );

  return (
    <group>
      {tiles.map((tile, index) => {
        const texture = textures[index];
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        return (
          <mesh key={`${tile.x}-${tile.y}`} geometry={tile.geometry}>
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={0.68}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function CloudTileLayer({ visible }: CloudTileLayerProps) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  if (!visible || !apiKey) return null;

  return <CloudTiles />;
}
