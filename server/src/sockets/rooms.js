import { Room } from "../mediasoup/room.js";
import { getWorker } from "../mediasoup/worker.js";

const rooms = new Map();

export async function getOrCreateRoom(sessionId) {
  if (rooms.has(sessionId)) return rooms.get(sessionId);
  const room = await new Room(sessionId, getWorker()).init();
  rooms.set(sessionId, room);
  return room;
}

export function getRoom(sessionId) {
  return rooms.get(sessionId);
}

export function closeRoom(sessionId) {
  const room = rooms.get(sessionId);
  if (room) {
    room.close();
    rooms.delete(sessionId);
  }
}

export function getLiveRoomStats() {
  const liveRooms = [...rooms.values()].filter((room) => room.peerCount() > 0);
  return {
    activeRooms: liveRooms.length,
    connectedPeers: liveRooms.reduce((total, room) => total + room.peerCount(), 0)
  };
}
