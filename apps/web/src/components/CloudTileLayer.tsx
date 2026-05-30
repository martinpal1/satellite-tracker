import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

type CloudTileLayerProps = {
  visible: boolean;
};

const TILE_ZOOM = 2;
const TILE_COUNT = 2 ** TILE_ZOOM;
const EARTH_RADIUS = 2.025;

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

  return {
    lonMin,
    lonMax,
    latMin,
    latMax
  };
}

function makeTileGeometry(x: number, y: number) {
  const { lonMin, lonMax, latMin, latMax } = tileBounds(x, y);

  const widthSegments = 24;
  const heightSegments = 24;

  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= heightSegments; row++) {
    const v = row / heightSegments;
    const lat = THREE.MathUtils.lerp(latMax, latMin, v);
    const latRad = THREE.MathUtils.degToRad(lat);

    for (let col = 0; col <= widthSegments; col++) {
      const u = col / widthSegments;
      const lon = THREE.MathUtils.lerp(lonMin, lonMax, u);
      const lonRad = THREE.MathUtils.degToRad(lon);

      const px = EARTH_RADIUS * Math.cos(latRad) * Math.cos(lonRad);
      const py = EARTH_RADIUS * Math.sin(latRad);
      const pz = -EARTH_RADIUS * Math.cos(latRad) * Math.sin(lonRad);

      positions.push(px, py, pz);
      uvs.push(u, 1 - v);
    }
  }

  const rowSize = widthSegments + 1;

  for (let row = 0; row < heightSegments; row++) {
    for (let col = 0; col < widthSegments; col++) {
      const a = row * rowSize + col;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export default function CloudTileLayer({ visible }: CloudTileLayerProps) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  const tiles = useMemo(() => {
    const result: { x: number; y: number; url: string }[] = [];

    for (let y = 0; y < TILE_COUNT; y++) {
      for (let x = 0; x < TILE_COUNT; x++) {
        result.push({
          x,
          y,
          url: tileUrl(x, y)
        });
      }
    }

    return result;
  }, []);

  const textures = useLoader(
    THREE.TextureLoader,
    tiles.map((tile) => tile.url)
  );

  if (!visible || !apiKey) {
    return null;
  }

  return (
    <group>
      {tiles.map((tile, index) => {
        const texture = textures[index];
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        return (
          <mesh key={`${tile.x}-${tile.y}`} geometry={makeTileGeometry(tile.x, tile.y)}>
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={0.72}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}