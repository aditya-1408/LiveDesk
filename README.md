# AtomQuest Video Support Platform

Real-time browser support sessions for AtomQuest Hackathon 1.0. Agents create invite links, customers join without installing an app, audio/video routes through a self-hosted mediasoup SFU, chat is realtime and persisted, and session history is queryable.

## Stack

- Backend: Node.js, Express, Socket.IO, mediasoup
- Database: SQLite with `better-sqlite3`
- Frontend: React, Vite, plain CSS, `mediasoup-client`
- Auth: JWT for agents and short-lived invite-scoped customer tokens

## Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

Default agent credentials:

```text
username: agent
password: agent123
```

## Demo Flow

1. Sign in as the agent.
2. Click `New session`.
3. Copy the invite link.
4. Click `Join as agent`.
5. Open the invite link in another browser or incognito window.
6. Allow camera and microphone permissions in both windows.
7. Exchange video/audio and chat messages.
8. End the session from the agent room.

## Ports

- Client: `5173`
- API and Socket.IO: `4000`
- WebRTC RTP range: `40000-40100`

For LAN/ngrok demos, set `ANNOUNCED_IP` in `server/.env` to the reachable host/IP used by browsers.

## Implemented

- Agent login with seeded credentials
- Agent-created sessions and invite links
- Customer invite validation and scoped customer token
- mediasoup server-routed audio/video call flow
- Mute and camera toggle signaling
- Realtime in-call chat with persisted history
- Authenticated file sharing in chat with 10MB upload cap
- Session history, participants, events, and chat storage
- Basic reconnect grace window
- Customer leave hold-open window before auto-closing an abandoned session
- Admin live/history dashboard
- Admin ability to end active sessions
- Recording start/stop/download flow using browser MediaRecorder upload to server storage
- Prometheus-compatible `/metrics` endpoint

## Known Limitations

- Recording is implemented for demo via agent-browser MediaRecorder upload. A production SFU-side recorder would pipe mediasoup PlainTransport RTP into ffmpeg.
- Single mediasoup worker and SQLite are intended for the hackathon demo, not horizontal production scale.
- Local camera/mic testing is best in Chrome or Edge.
- If the demo is exposed beyond localhost, firewall rules must allow the RTC port range.
- Chat uploads allow common images, PDFs, DOC/DOCX, and text files up to 10MB.
- `RECONNECT_GRACE_MS` controls accidental disconnect recovery. `CUSTOMER_RETURN_WINDOW_MS` controls how long the agent room remains open after the customer leaves.
