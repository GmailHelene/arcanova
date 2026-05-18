import { useEffect, useRef, useState } from "react";
import { Arena, TILE, A_EMPTY, A_WALL, A_GEM, A_ENEMY, A_EXIT } from "./arena";
import { getTheme } from "./level";
import { sfx, music } from "./sound";

interface Peer {
  name: string;
  color: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

interface Props {
  arena: Arena;
  onWin?: (score: number) => void;
  // When set, the runtime joins a live-presence room for this world.
  gameId?: number;
  playerName?: string;
}

type Dir = "up" | "down" | "left" | "right";

// Plays a top-down arena: move in any direction, collect every gem, avoid
// the enemies, then reach the exit. Full keyboard control (WASD / arrows).
export default function ArenaRuntime({ arena, onWin, gameId, playerName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef({ up: false, down: false, left: false, right: false });
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<number, Peer>>(new Map());
  const [runId, setRunId] = useState(0);
  const [won, setWon] = useState<{ score: number } | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches === true,
  );

  useEffect(() => {
    if (!musicOn) return;
    music.start();
    return () => music.stop();
  }, [musicOn]);

  // Live presence: connect to the world's room and track other players.
  useEffect(() => {
    if (!gameId) return;
    const peers = peersRef.current;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ t: "join", gameId, name: playerName || "Guest" }));
    };
    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === "welcome") {
        peers.clear();
        for (const p of msg.peers) peers.set(p.id, { ...p, tx: p.x, ty: p.y });
      } else if (msg.t === "joined") {
        const p = msg.peer;
        peers.set(p.id, { ...p, tx: p.x, ty: p.y });
      } else if (msg.t === "pos") {
        const p = peers.get(msg.id);
        if (p) {
          p.tx = msg.x;
          p.ty = msg.y;
        }
      } else if (msg.t === "left") {
        peers.delete(msg.id);
      }
    };

    return () => {
      wsRef.current = null;
      peers.clear();
      ws.close();
    };
  }, [gameId, playerName]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cols = arena.cols;
    const rows = arena.rows;
    canvas.width = cols * TILE;
    canvas.height = rows * TILE;
    const theme = getTheme(arena.theme);
    const tiles = arena.tiles.slice();

    const PW = 22;
    const SPEED = 3;

    const keys: Record<string, boolean> = {};
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const player = { x: 0, y: 0 };
    function spawnPlayer() {
      player.x = arena.spawn.col * TILE + (TILE - PW) / 2;
      player.y = arena.spawn.row * TILE + (TILE - PW) / 2;
    }
    spawnPlayer();

    const enemies: { x: number; y: number }[] = [];
    let gemsTotal = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = tiles[r * cols + c];
        if (t === A_ENEMY) {
          enemies.push({
            x: c * TILE + (TILE - PW) / 2,
            y: r * TILE + (TILE - PW) / 2,
          });
        }
        if (t === A_GEM) gemsTotal++;
      }
    }
    let gemsGot = 0;
    let deaths = 0;
    let frames = 0;
    let finished = false;

    function isWall(c: number, r: number) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
      return tiles[r * cols + c] === A_WALL;
    }

    // Moves a PW x PW box, resolving collisions against wall tiles.
    function tryMove(b: { x: number; y: number }, vx: number, vy: number) {
      b.x += vx;
      const top = Math.floor(b.y / TILE);
      const bot = Math.floor((b.y + PW - 1) / TILE);
      if (vx > 0) {
        const c = Math.floor((b.x + PW) / TILE);
        for (let r = top; r <= bot; r++)
          if (isWall(c, r)) {
            b.x = c * TILE - PW;
            break;
          }
      } else if (vx < 0) {
        const c = Math.floor(b.x / TILE);
        for (let r = top; r <= bot; r++)
          if (isWall(c, r)) {
            b.x = (c + 1) * TILE;
            break;
          }
      }
      b.y += vy;
      const lft = Math.floor(b.x / TILE);
      const rgt = Math.floor((b.x + PW - 1) / TILE);
      if (vy > 0) {
        const r = Math.floor((b.y + PW) / TILE);
        for (let c = lft; c <= rgt; c++)
          if (isWall(c, r)) {
            b.y = r * TILE - PW;
            break;
          }
      } else if (vy < 0) {
        const r = Math.floor(b.y / TILE);
        for (let c = lft; c <= rgt; c++)
          if (isWall(c, r)) {
            b.y = (r + 1) * TILE;
            break;
          }
      }
    }

    function update() {
      frames++;
      const t = touchRef.current;
      let dx =
        (keys["arrowright"] || keys["d"] || t.right ? 1 : 0) -
        (keys["arrowleft"] || keys["a"] || t.left ? 1 : 0);
      let dy =
        (keys["arrowdown"] || keys["s"] || t.down ? 1 : 0) -
        (keys["arrowup"] || keys["w"] || t.up ? 1 : 0);
      if (dx && dy) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
      }
      tryMove(player, dx * SPEED, dy * SPEED);

      for (const e of enemies) {
        const ex = player.x - e.x;
        const ey = player.y - e.y;
        const dist = Math.hypot(ex, ey) || 1;
        tryMove(e, (ex / dist) * 1.4, (ey / dist) * 1.4);
        if (
          player.x < e.x + PW &&
          player.x + PW > e.x &&
          player.y < e.y + PW &&
          player.y + PW > e.y
        ) {
          deaths++;
          sfx.die();
          spawnPlayer();
          return;
        }
      }

      const c0 = Math.floor(player.x / TILE);
      const c1 = Math.floor((player.x + PW - 1) / TILE);
      const r0 = Math.floor(player.y / TILE);
      const r1 = Math.floor((player.y + PW - 1) / TILE);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tt = tiles[r * cols + c];
          if (tt === A_GEM) {
            tiles[r * cols + c] = A_EMPTY;
            gemsGot++;
            sfx.coin();
          }
          if (tt === A_EXIT && !finished && gemsGot >= gemsTotal) {
            finished = true;
            const score = gemsTotal * 500 + Math.max(0, 12000 - frames);
            sfx.win();
            setWon({ score });
            onWin?.(score);
          }
        }
      }

      // Broadcast our position to peers in the room (throttled).
      if (gameId && frames % 4 === 0) {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              t: "pos",
              x: Math.round(player.x),
              y: Math.round(player.y),
            }),
          );
        }
      }
    }

    function draw() {
      ctx.fillStyle = theme.skyBottom;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tiles[r * cols + c];
          const x = c * TILE;
          const y = r * TILE;
          if (t === A_WALL) {
            ctx.fillStyle = theme.ground;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = theme.groundTop;
            ctx.fillRect(x, y, TILE, 4);
          } else if (t === A_GEM) {
            ctx.fillStyle = "#ffce5c";
            ctx.beginPath();
            ctx.moveTo(x + TILE / 2, y + 7);
            ctx.lineTo(x + TILE - 7, y + TILE / 2);
            ctx.lineTo(x + TILE / 2, y + TILE - 7);
            ctx.lineTo(x + 7, y + TILE / 2);
            ctx.closePath();
            ctx.fill();
          } else if (t === A_EXIT) {
            const ready = gemsGot >= gemsTotal;
            ctx.fillStyle = ready ? "#4fd6ff" : "rgba(79,214,255,0.25)";
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          }
        }
      }

      for (const e of enemies) {
        ctx.fillStyle = "#d6536d";
        ctx.beginPath();
        ctx.arc(e.x + PW / 2, e.y + PW / 2, PW / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Other players (live presence), eased toward their latest position.
      for (const peer of peersRef.current.values()) {
        peer.x += (peer.tx - peer.x) * 0.25;
        peer.y += (peer.ty - peer.y) * 0.25;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = peer.color;
        ctx.fillRect(peer.x, peer.y, PW, PW);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#e9e7f5";
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(peer.name, peer.x + PW / 2, peer.y - 5);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "#8b6bff";
      ctx.fillRect(player.x, player.y, PW, PW);

      let hudText = `Gems ${gemsGot}/${gemsTotal}   Time ${Math.floor(
        frames / 60,
      )}s   Deaths ${deaths}`;
      if (gameId) hudText += `   Players ${peersRef.current.size + 1}`;
      ctx.fillStyle = "rgba(12,10,26,0.7)";
      ctx.fillRect(8, 8, gameId ? 430 : 320, 30);
      ctx.fillStyle = "#e9e7f5";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText(hudText, 16, 28);
    }

    let raf = 0;
    function loop() {
      if (!finished) update();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [arena, runId, onWin, gameId]);

  function replay() {
    setWon(null);
    setRunId((n) => n + 1);
  }

  function hold(dir: Dir, value: boolean) {
    touchRef.current[dir] = value;
  }

  function dirButton(dir: Dir, label: string) {
    return (
      <button
        className="touch-btn"
        onPointerDown={() => hold(dir, true)}
        onPointerUp={() => hold(dir, false)}
        onPointerLeave={() => hold(dir, false)}
        onPointerCancel={() => hold(dir, false)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="runtime">
      <canvas ref={canvasRef} className="game-canvas" />
      {isTouch && !won && (
        <div className="arena-dpad">
          <div className="dpad-up">{dirButton("up", "▲")}</div>
          <div className="dpad-mid">
            {dirButton("left", "◀")}
            {dirButton("right", "▶")}
          </div>
          <div className="dpad-down">{dirButton("down", "▼")}</div>
        </div>
      )}
      {won && (
        <div className="win-overlay">
          <h2>Arena cleared!</h2>
          <p>
            Score: <b>{won.score}</b>
          </p>
          <button className="btn" onClick={replay}>
            Play again
          </button>
        </div>
      )}
      <div className="runtime-footer">
        <span className="muted controls-hint">
          {isTouch
            ? "Use the on-screen pad to move."
            : "Move: arrows or WASD · Collect every gem, then reach the exit"}
        </span>
        <button className="btn-ghost" onClick={() => setMusicOn((m) => !m)}>
          {musicOn ? "Music: on" : "Music: off"}
        </button>
      </div>
    </div>
  );
}
