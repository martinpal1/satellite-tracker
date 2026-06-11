import { Router } from "express";
import {
  clampSatelliteLimit,
  getSatellitesByGroup,
  lookupSatellite
} from "../services/celestrak.service.js";

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
  "goes",
  "last-30-days",
  "visual",
  "amateur",
  "cubesat",
  "engineering",
  "education",
  "military",
  "radar",
  "tle-new",
  "debris"
]);

router.get("/", async (req, res) => {
  try {
    const requestedGroup = String(req.query.group ?? "active").toLowerCase();
    const group = VALID_GROUPS.has(requestedGroup) ? requestedGroup : "active";

    const limit = clampSatelliteLimit(req.query.limit);
    const data = await getSatellitesByGroup(group, limit);

    res.json(data);
  } catch (error) {
    console.error(error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("CelesTrak returned HTTP") ? 503 : 500;

    res.status(status).json({
      error: "Failed to fetch satellite data",
      message
    });
  }
});

router.get("/lookup", async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim();

    if (!query) {
      res.status(400).json({
        error: "Missing lookup query",
        message: "Provide q as a NORAD ID, e.g. 25544, or COSPAR ID, e.g. 1998-067A."
      });
      return;
    }

    const data = await lookupSatellite(query);

    res.json(data);
  } catch (error) {
    console.error(error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("CelesTrak returned HTTP") ? 503 : 500;

    res.status(status).json({
      error: "Failed to look up satellite",
      message
    });
  }
});

export default router;