# Local Deployment Reference

Use this reference before changing deployment-sensitive code.

## Target

- V1 target deployment is Docker Full Local Mode on one LAN server.
- Frontend is static React/Vite served by Nginx.
- Nginx proxies `/api` to the internal backend container.
- Backend and PostgreSQL stay internal to the Docker network.

## Do Not Change Casually

- Do not expose backend `3000` or PostgreSQL `5432` to LAN for local production.
- Do not hardcode local IP addresses or cloud URLs in source code.
- Do not make Vercel/Railway the default V1 target.
- Do not delete database volumes during cleanup unless the user explicitly asks and confirms the exact volume.

## Expected Defaults

- Frontend local production API base: `VITE_API_BASE_URL=/api`.
- Backend listen host in container: `0.0.0.0`.
- Backend health path through frontend proxy: `http://localhost/api/health`.
