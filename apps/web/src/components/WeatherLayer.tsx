import type { WeatherPoint } from "@sattracker/shared";
import { latLonToScenePosition } from "../lib/satelliteMath";

type WeatherLayerProps = {
  points: WeatherPoint[];
  visible: boolean;
};

function weatherColour(point: WeatherPoint) {
  if (point.precipitation > 1) {
    return "#44aaff";
  }

  if (point.cloudCover > 75) {
    return "#ffffff";
  }

  if (point.cloudCover > 40) {
    return "#b7d7ff";
  }

  return "#88ccff";
}

function weatherOpacity(point: WeatherPoint) {
  if (point.precipitation > 1) return 0.75;
  return Math.max(0.08, point.cloudCover / 130);
}

export default function WeatherLayer({ points, visible }: WeatherLayerProps) {
  if (!visible) return null;

  return (
    <group>
      {points.map((point) => {
        const pos = latLonToScenePosition(
          point.latitude,
          point.longitude,
          2.045
        );

        const size =
          point.precipitation > 1
            ? 0.09
            : 0.035 + point.cloudCover / 1000;

        return (
          <mesh
            key={`${point.latitude}-${point.longitude}`}
            position={[pos.x, pos.y, pos.z]}
          >
            <sphereGeometry args={[size, 10, 10]} />
            <meshBasicMaterial
              color={weatherColour(point)}
              transparent
              opacity={weatherOpacity(point)}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}