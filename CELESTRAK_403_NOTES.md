# CelesTrak 403 notes

CelesTrak can temporarily block an IP address when GP/TLE data is requested too often. Their current developer guidance says GP data is checked for updates about every 2 hours, so this project now avoids repeated requests for the same group within that window.

The API now includes:

- in-memory raw TLE caching
- disk-backed raw TLE caching in `.cache/tle`
- in-flight request deduplication so React development double-renders do not trigger duplicate CelesTrak calls
- a 2-hour cooldown after CelesTrak returns `403`, `404` or `429`
- stale cache fallback for up to 7 days when CelesTrak blocks or fails

If you already triggered a CelesTrak block, stop the dev server and wait before trying again. Repeated refreshes will not fix a 403 and can extend the temporary block.
