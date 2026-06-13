FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
RUN npm install --prefix server

COPY client/package*.json ./client/
RUN npm install --prefix client

COPY server ./server
COPY client ./client

RUN npm run build --prefix client

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/uploads /data/recordings

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

WORKDIR /app/server

ENV NODE_ENV=production \
  PORT=4000 \
  CLIENT_DIST_DIR=/app/client/dist \
  DATABASE_PATH=/data/support.db \
  UPLOAD_DIR=/data/uploads \
  RECORDING_DIR=/data/recordings

EXPOSE 4000
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]
