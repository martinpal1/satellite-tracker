import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type DiskCacheRead<T> = {
  value: T;
  ageMs: number;
};

type DiskCacheEntry<T> = {
  savedAt: number;
  value: T;
};

const DEFAULT_CACHE_DIR = path.join(process.cwd(), ".cache", "tle");

function cacheDir() {
  return process.env.TLE_CACHE_DIR || DEFAULT_CACHE_DIR;
}

function cacheFilePath(key: string) {
  const filename = `${createHash("sha256").update(key).digest("hex")}.json`;
  return path.join(cacheDir(), filename);
}

export async function readDiskCache<T>(key: string): Promise<DiskCacheRead<T> | null> {
  try {
    const raw = await readFile(cacheFilePath(key), "utf8");
    const entry = JSON.parse(raw) as DiskCacheEntry<T>;

    if (!entry || typeof entry.savedAt !== "number") {
      return null;
    }

    return {
      value: entry.value,
      ageMs: Date.now() - entry.savedAt
    };
  } catch {
    return null;
  }
}

export async function writeDiskCache<T>(key: string, value: T): Promise<void> {
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(
      cacheFilePath(key),
      JSON.stringify({ savedAt: Date.now(), value }),
      "utf8"
    );
  } catch {
    // Disk caching is an optimisation. The API should still work if the cache
    // directory cannot be written, for example on a read-only deployment.
  }
}
