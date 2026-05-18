import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Live presence: players in the same world see each other move in real time.
// Each client runs its own physics; this layer only shares positions.

interface Peer {
  id: number;
  ws: WebSocket;
  gameId: number;
  name: string;
  color: string;
  x: number;
  y: number;
  face: number;
}

const PEER_COLORS = [
  "#ff6ba8",
  "#5ad1ff",
  "#ffce5c",
  "#7ee787",
  "#b96bff",
  "#ff9d5c",
];

const rooms = new Map<number, Set<Peer>>();
let nextPeerId = 1;

function snapshot(p: Peer) {
  return { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, face: p.face };
}

function broadcast(room: Set<Peer>, msg: unknown, except?: Peer) {
  const data = JSON.stringify(msg);
  for (const p of room) {
    if (p !== except && p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  }
}

export function attachPresence(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    let peer: Peer | null = null;

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.t === "join" && !peer) {
        const gameId = Number(msg.gameId);
        if (!Number.isInteger(gameId)) return;
        peer = {
          id: nextPeerId++,
          ws,
          gameId,
          name: String(msg.name || "Player").slice(0, 24),
          color: PEER_COLORS[nextPeerId % PEER_COLORS.length],
          x: 0,
          y: 0,
          face: 1,
        };
        let room = rooms.get(gameId);
        if (!room) {
          room = new Set();
          rooms.set(gameId, room);
        }
        ws.send(
          JSON.stringify({
            t: "welcome",
            id: peer.id,
            peers: [...room].map(snapshot),
          }),
        );
        broadcast(room, { t: "joined", peer: snapshot(peer) }, peer);
        room.add(peer);
      } else if (msg.t === "pos" && peer) {
        peer.x = Number(msg.x) || 0;
        peer.y = Number(msg.y) || 0;
        peer.face = Number(msg.face) || 1;
        const room = rooms.get(peer.gameId);
        if (room) {
          broadcast(
            room,
            { t: "pos", id: peer.id, x: peer.x, y: peer.y, face: peer.face },
            peer,
          );
        }
      }
    });

    ws.on("close", () => {
      if (!peer) return;
      const room = rooms.get(peer.gameId);
      if (!room) return;
      room.delete(peer);
      broadcast(room, { t: "left", id: peer.id });
      if (room.size === 0) rooms.delete(peer.gameId);
    });
  });

  console.log("Presence WebSocket server ready on /ws");
}
