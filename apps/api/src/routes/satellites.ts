import { Router } from "express";
import { getSatellitesByGroup } from "../services/celestrak.service.js";

const router = Router();

const VALID_GROUPS = new Set([
  "active",
  "stations",
  "weather",
  "gps-ops",
  "starlink",
  "geo",
  "science",
  "noaa",
  "goes"
]);

router.get("/", async (req, res) => {
  try {
    const requestedGroup = String(req.query.group ?? "active").toLowerCase();
    const group = VALID_GROUPS.has(requestedGroup) ? requestedGroup : "active";

    const limitRaw = Number(req.query.limit ?? 80);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 500)
      : 80;

    const data = await getSatellitesByGroup(group, limit);

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch satellite data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;