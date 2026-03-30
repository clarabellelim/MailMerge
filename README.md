## Fullstack NestJS + Vite Template

Monorepo template with:
- **Server**: NestJS (`server/`)
- **Client**: Vite + React (`client/`)
- **Build output**: `dist/`

### Requirements

- **Node.js**: >= 22
- **npm**: >= 10

### Quick start (development)

Install dependencies:

```bash
npm install
```

Start dev server + dev client (with auto-restart + logs):

```bash
npm run dev
```

Default ports (configurable via `.env`):
- **Server**: `http://localhost:3000`
- **API**: `http://localhost:3000/api`
- **Client dev**: `http://localhost:8080`

Dev logs are written to `logs/` (for example `logs/dev.std.log`).

### Environment variables

This repo uses a root `.env` file (loaded by `scripts/dev.js`).

Common variables:
- **`SERVER_HOST`**: server bind host (default: `localhost`)
- **`SERVER_PORT`**: server port (default: `3000`)
- **`CLIENT_DEV_PORT`**: Vite dev server port (default: `8080`)
- **`LOG_DIR`**: log directory (default: `logs`)
- **Feishu OAuth**:
  - `FEISHU_CLIENT_ID`
  - `FEISHU_CLIENT_SECRET`
  - `FEISHU_REDIRECT_URI` (e.g. `http://localhost:3000/api/auth/callback`)

Important:
- **Do not commit real secrets** (e.g. `FEISHU_CLIENT_SECRET`) to source control.

### Build (production)

Build server + client into `dist/`:

```bash
npm run build
```

The build script also prepares `dist/run.sh` so you can start the app from inside `dist/`.

### Run (production)

After building, start from the `dist/` directory:

```bash
cd dist
./run.sh
```

### Useful scripts

- **`npm run dev`**: run server + client in dev mode (supervised)
- **`npm run dev:server`**: run NestJS dev server only
- **`npm run dev:client`**: run Vite dev server only
- **`npm run build`**: build server + client, prepare `dist/`
- **`npm run test`** / **`npm run test:e2e`**: run tests
- **`npm run lint`**: eslint + typecheck + stylelint
- **`npm run format`**: prettier

### Project structure

- **`client/`**: frontend (Vite + React)
- **`server/`**: backend (NestJS)
- **`shared/`**: shared code (used by server/client depending on setup)
- **`scripts/`**: dev/build helpers
- **`dist/`**: production build output
