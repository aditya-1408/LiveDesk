# LiveDesk - Real-Time Video Support Platform

LiveDesk is a browser-based support call system for AtomQuest Hackathon 1.0. A call agent creates a support session, shares an invite link with a customer, and both join from a browser with no app installation.

## Important Architecture Note

This project uses **self-hosted open-source mediasoup** as the SFU.

It does **not** use LiveKit Cloud, Twilio, Agora, Daily, or any hosted video SDK. Audio/video is routed through our own Node.js mediasoup server, satisfying the requirement that media must route through a server and not direct peer-to-peer.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Socket.IO
- Media server: self-hosted mediasoup SFU
- Database: SQLite via `better-sqlite3`
- Auth: JWT for agent/admin and invite-scoped customer tokens
- Observability: JSON `/api/metrics` and Prometheus `/metrics`

## Default Credentials

Agent:

```text
username: agent
password: agent123
```

Admin:

```text
username: admin
password: admin123
```

Admin signup code:

```text
admin123
```

## Local Setup For Evaluators

Requirements:

- Node.js 20+ or 22+
- Chrome or Edge browser
- Laptop and phone on the same Wi-Fi for real two-device testing

Clone:

```bash
git clone https://github.com/aditya-1408/LiveDesk.git
cd LiveDesk
```

Install dependencies:

```bash
npm install --prefix server
npm install --prefix client
```

Create backend environment file:

```bash
cd server
copy .env.example .env
```

If `.env.example` is unavailable, create `server/.env` with:

```text
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
CLIENT_ORIGINS=http://localhost:5173,https://localhost:5173,http://YOUR_LAPTOP_IP:5173,https://YOUR_LAPTOP_IP:5173
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_SIGNUP_CODE=admin123
DATABASE_PATH=./support.db
UPLOAD_DIR=./uploads
RECORDING_DIR=./recordings
ANNOUNCED_IP=YOUR_LAPTOP_IP
RTC_MIN_PORT=40000
RTC_MAX_PORT=40100
RECONNECT_GRACE_MS=30000
CUSTOMER_RETURN_WINDOW_MS=300000
```

Replace `YOUR_LAPTOP_IP` with the laptop Wi-Fi IPv4 address. On Windows:

```bash
ipconfig
```

Look for the Wi-Fi IPv4 address, for example:

```text
10.62.43.31
```

Start backend:

```bash
cd server
npm start
```

Start frontend in another terminal:

```bash
cd client
npm run dev:https
```

Open on laptop:

```text
https://localhost:5173
```

Open on phone:

```text
https://YOUR_LAPTOP_IP:5173
```

Accept the local HTTPS certificate warning on phone if shown.

## Demo/Test Flow

1. Open `https://localhost:5173/login` on laptop.
2. Select `Call Agent`, login with agent credentials.
3. Click `New session`.
4. Copy the customer invite link.
5. On phone, replace `localhost` in the invite link with `YOUR_LAPTOP_IP`.
6. Open that link on phone Chrome.
7. Allow camera and microphone on both devices.
8. Click `Join as agent` on laptop.
9. Verify:
   - two-way audio/video
   - mute/camera indicators
   - realtime chat
   - file upload in chat
   - recording start/stop/download
   - customer leave and reconnect window
   - agent/admin ending session
10. Login as admin at `/login`, select `Administrator`, and verify dashboard/history.

## Observability

JSON metrics:

```text
http://localhost:4000/api/metrics
```

Prometheus-compatible metrics:

```text
http://localhost:4000/metrics
```

Example JSON keys:

```json
{
  "activeSessions": 1,
  "connectedParticipants": 2,
  "totalSessions": 10,
  "failedConnections": 0,
  "errorRatePercent": "0%",
  "serverUptime": "5m 12s"
}
```

## Implemented Features

- Agent/admin role-based login and signup
- Customer invite-only access with scoped token
- Agent session creation and shareable invite links
- Browser join without installing any app
- Server-routed WebRTC audio/video via self-hosted mediasoup
- Real-time presence tracking
- Clean session end and socket/media cleanup
- Customer leave with 5-minute reconnect window
- Audio mute and camera toggle with visible status badges
- Real-time in-call chat
- Persisted chat history
- File sharing in chat
- Session history with participants, events, duration, chat, and recordings
- Agent-controlled call recording with final downloadable WebM
- Admin dashboard for live sessions and history
- Admin ability to end active sessions
- JSON and Prometheus metrics endpoints

## Network/Deployment Note

This project is not a simple Vercel-style static deployment because mediasoup needs public WebRTC RTP ports.

For full public deployment, use a VPS/public server and open:

```text
TCP 80/443 for HTTPS app access
UDP 40000-40100 for WebRTC media
TCP 40000-40100 for WebRTC TCP fallback
```

Set:

```text
ANNOUNCED_IP=<public server IP>
```

For hackathon evaluation, the app can be cloned and tested locally using the steps above.
