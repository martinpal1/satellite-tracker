import { Router } from "express";
import { getGlobalWeather } from "../services/weather.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await getGlobalWeather();
    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch weather data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;