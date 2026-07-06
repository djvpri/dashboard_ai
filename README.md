# Z-Dashboard — Multi-Agent AI Chat UI

Chat interface untuk OpenClaw Gateway dengan multi-agent support.

## Setup

```bash
cp .env.example .env.local
# edit GATEWAY_URL & GATEWAY_TOKEN
npm run dev
```

## Env

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GATEWAY_URL` | ✅ | `http://localhost:18789` | OpenClaw Gateway URL |
| `GATEWAY_TOKEN` | ✅ | — | Bearer token (server-side only) |

## Deploy

```bash
npm run build
npm start
```
