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
- Session history, participants, events, and chat storage
- Basic reconnect grace window
- Admin live/history dashboard
- Recording API/status scaffold

## Known Limitations

- Recording is scaffolded but the ffmpeg PlainTransport pipeline is not fully wired yet.
- Single mediasoup worker and SQLite are intended for the hackathon demo, not horizontal production scale.
- Local camera/mic testing is best in Chrome or Edge.
- If the demo is exposed beyond localhost, firewall rules must allow the RTC port range.
