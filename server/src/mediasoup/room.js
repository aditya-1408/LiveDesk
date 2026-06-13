import { mediaCodecs, webRtcTransportOptions } from "../config.js";

export class Room {
  constructor(sessionId, worker) {
    this.sessionId = sessionId;
    this.worker = worker;
    this.router = null;
    this.peers = new Map();
  }

  async init() {
    this.router = await this.worker.createRouter({ mediaCodecs });
    return this;
  }

  ensurePeer(socketId, role, clientId, participantId) {
    if (!this.peers.has(socketId)) {
      this.peers.set(socketId, {
        socketId,
        role,
        clientId,
        participantId,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        media: { audio: true, video: true }
      });
    }
    return this.peers.get(socketId);
  }

  getPeer(socketId) {
    return this.peers.get(socketId);
  }

  findActivePeerByRole(role) {
    return [...this.peers.values()].find((peer) => peer.role === role);
  }

  peerCount() {
    return this.peers.size;
  }

  async createWebRtcTransport(socketId, direction) {
    const peer = this.getPeer(socketId);
    if (!peer) throw new Error("Peer has not joined room");
    const transport = await this.router.createWebRtcTransport(webRtcTransportOptions);
    transport.appData = { direction };
    peer.transports.set(transport.id, transport);
    transport.on("dtlsstatechange", (state) => {
      if (state === "closed") transport.close();
    });
    return transport;
  }

  addProducer(socketId, producer) {
    const peer = this.getPeer(socketId);
    peer.producers.set(producer.id, producer);
    producer.on("transportclose", () => peer.producers.delete(producer.id));
  }

  addConsumer(socketId, consumer) {
    const peer = this.getPeer(socketId);
    peer.consumers.set(consumer.id, consumer);
    consumer.on("transportclose", () => peer.consumers.delete(consumer.id));
    consumer.on("producerclose", () => peer.consumers.delete(consumer.id));
  }

  getTransport(socketId, transportId) {
    return this.getPeer(socketId)?.transports.get(transportId);
  }

  findProducer(producerId) {
    for (const peer of this.peers.values()) {
      const producer = peer.producers.get(producerId);
      if (producer) return producer;
    }
    return null;
  }

  getProducersExcept(socketId) {
    const producers = [];
    for (const [peerId, peer] of this.peers.entries()) {
      if (peerId === socketId) continue;
      for (const producer of peer.producers.values()) {
        producers.push({ producerId: producer.id, peerId, kind: producer.kind });
      }
    }
    return producers;
  }

  getPeersExcept(socketId) {
    return [...this.peers.entries()]
      .filter(([peerId]) => peerId !== socketId)
      .map(([peerId, peer]) => ({
        peerId,
        role: peer.role,
        media: peer.media
      }));
  }

  removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) return null;
    for (const consumer of peer.consumers.values()) consumer.close();
    for (const producer of peer.producers.values()) producer.close();
    for (const transport of peer.transports.values()) transport.close();
    this.peers.delete(socketId);
    return peer;
  }

  close() {
    for (const socketId of [...this.peers.keys()]) this.removePeer(socketId);
    this.router?.close();
  }
}
