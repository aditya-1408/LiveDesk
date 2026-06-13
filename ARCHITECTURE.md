# Architecture

```text
Agent Browser
  React + mediasoup-client
        |
        | HTTPS/REST + Socket.IO signaling
        v
Express + Socket.IO Server
        |
        | creates routers/transports/producers/consumers
        v
mediasoup SFU Worker
        ^
        | server-routed RTP media
        |
Customer Browser
  React + mediasoup-client

SQLite persists:
- agents
- sessions
- participants
- chat_messages
- recordings
- session_events
```

## Design Choices

mediasoup is used because the problem statement requires media to route through our own server and disallows hosted video SDKs. Socket.IO handles realtime signaling, chat, presence, and call lifecycle events. Express handles login, invite validation, session history, admin views, and recording status endpoints.

SQLite keeps the demo zero-setup and durable enough for judging. The schema separates sessions, participants, chat, recordings, and event logs so history remains queryable after calls end.

## Access Control

Agents authenticate with username/password and receive a JWT containing `role: agent` and `agentId`. Customers can only join through a valid invite token; the server exchanges that invite for a JWT containing `role: customer` and the single allowed `sessionId`.

REST routes and socket events validate role and session scope. Customers cannot create sessions or end the call for everyone. Agent-only actions check the session owner.

## Signaling Contract

Client to server:

- `join-room`
- `get-router-rtp-capabilities`
- `create-transport`
- `connect-transport`
- `produce`
- `consume`
- `consumer-resume`
- `toggle-media`
- `end-call`
- `leave`

Server to client:

- `joined`
- `router-rtp-capabilities`
- `transport-created`
- `transport-connected`
- `produced`
- `new-producer`
- `consumer-created`
- `peer-joined`
- `peer-left`
- `peer-media-toggled`
- `call-ended`
- `error`

## Production Path

For a production build, replace SQLite with Postgres, add Redis for distributed room/session state, run multiple mediasoup workers per host, put API instances behind a load balancer with sticky Socket.IO sessions, secure uploads with object storage, and complete recording by piping mediasoup PlainTransport RTP into ffmpeg with generated SDP files.
