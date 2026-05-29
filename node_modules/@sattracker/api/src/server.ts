import express from "express";
import cors from "cors";
import satellitesRouter from "./routes/satellites.js";

const app = express();

const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sattracker-api",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/satellites", satellitesRouter);

app.listen(PORT, () => {
  console.log(`SATTRACKER API running on http://localhost:${PORT}`);
});