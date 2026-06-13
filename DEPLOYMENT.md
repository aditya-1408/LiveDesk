# LiveDesk Deployment

## Recommended Hackathon Deployment

Use a small Ubuntu VPS with a public IPv4 address. Do not use Vercel for the full app: LiveDesk runs a mediasoup SFU and needs a long-running Node process, WebSockets, HTTPS, and public RTC ports.

The included Docker setup runs:

- Node/Express/Socket.IO/mediasoup app
- built React frontend served by the same backend
- Caddy HTTPS reverse proxy
- persistent SQLite/uploads/recordings volume

## What You Need

- Ubuntu 22.04 or 24.04 VPS
- Public IPv4 address
- SSH access
- Ports open in the provider firewall:
  - TCP `80`
  - TCP `443`
  - UDP `40000-40100`
  - TCP `40000-40100`

A domain is best. If there is no domain, use the free wildcard DNS pattern:

```text
https://<SERVER_PUBLIC_IP>.sslip.io
```

Example:

```text
https://203.0.113.10.sslip.io
```

## VPS Commands

Install Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Clone the project:

```bash
git clone https://github.com/aditya-1408/LiveDesk.git
cd LiveDesk
```

Create deployment env:

```bash
cp .env.deploy.example .env.deploy
nano .env.deploy
```

Set:

```text
PUBLIC_HOST=<SERVER_PUBLIC_IP>.sslip.io
PUBLIC_ORIGIN=https://<SERVER_PUBLIC_IP>.sslip.io
CLIENT_ORIGIN=https://<SERVER_PUBLIC_IP>.sslip.io
CLIENT_ORIGINS=https://<SERVER_PUBLIC_IP>.sslip.io
ANNOUNCED_IP=<SERVER_PUBLIC_IP>
JWT_SECRET=<any-long-random-string>
ADMIN_SIGNUP_CODE=admin123
```

Start:

```bash
docker compose up -d --build
```

Check:

```bash
docker compose logs -f app
docker compose logs -f caddy
```

Open:

```text
https://<SERVER_PUBLIC_IP>.sslip.io
```

## Judge Test URLs

- App: `https://<SERVER_PUBLIC_IP>.sslip.io`
- Health: `https://<SERVER_PUBLIC_IP>.sslip.io/health`
- JSON metrics: `https://<SERVER_PUBLIC_IP>.sslip.io/api/metrics`
- Prometheus metrics: `https://<SERVER_PUBLIC_IP>.sslip.io/metrics`

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

## Troubleshooting

If login works but video does not connect:

1. Check `ANNOUNCED_IP` equals the VPS public IP.
2. Confirm UDP `40000-40100` is open in the cloud firewall.
3. Confirm TCP `40000-40100` is open too.
4. Rebuild and restart:

```bash
docker compose up -d --build
```

If HTTPS does not work:

1. Confirm ports `80` and `443` are open.
2. Confirm `PUBLIC_HOST` is only the host, without `https://`.
3. Check Caddy logs:

```bash
docker compose logs -f caddy
```
