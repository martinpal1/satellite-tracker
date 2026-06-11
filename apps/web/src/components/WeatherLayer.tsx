import type { WeatherPoint } from "@sattracker/shared";
import { latLonToScenePosition } from "../lib/satelliteMath";

type WeatherLayerProps = {
  points: WeatherPoint[];
  visible: boolean;
};

function getWeatherColor(point: WeatherPoint) {
  const precipitation = point.precipitation ?? 0;
  const cloudCover = point.cloudCover ?? 0;

  if (precipitation > 1) {
    return "#4fc3ff";
  }

  if (cloudCover > 75) {
    return "#d8d8d8";
  }

  if (cloudCover > 40) {
    return "#9aa7b1";
  }

  return "#ffffff";
}

function getWeatherOpacity(point: WeatherPoint) {
  const precipitation = point.precipitation ?? 0;
  const cloudCover = point.cloudCover ?? 0;

  if (precipitation > 1) {
    return 0.75;
  }

  return Math.max(0.08, cloudCover / 130);
}

export default function WeatherLayer({
  points,
  visible
}: WeatherLayerProps) {
  if (!visible) {
    return null;
  }

  return (
    <group>
      {points.map((point, index) => {
        const precipitation = point.precipitation ?? 0;
        const cloudCover = point.cloudCover ?? 0;

        const position = latLonToScenePosition(
          point.latitude,
          point.longitude,
          precipitation > 1 ? 2.09 : 2.035 + cloudCover / 1000
        );

        return (
          <mesh
            key={`${point.latitude}-${point.longitude}-${index}`}
            position={[position.x, position.y, position.z]}
          >
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial
              color={getWeatherColor(point)}
              transparent
              opacity={getWeatherOpacity(point)}
            />
          </mesh>
        );
      })}
    </group>
  );
}