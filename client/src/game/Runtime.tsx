import { useEffect, useRef, useState } from "react";
import {
  Level,
  TILE,
  EMPTY,
  SOLID,
  SPIKE,
  COIN,
  GOAL,
} from "./level";

interface Props {
  level: Level;
  // Called once when the player reaches the goal.
  onWin?: (score: number) => void;
}

// Plays a 2D platformer level. Full keyboard control: arrows or WASD to move,
// up / W / space to jump.
export default function Runtime({ level, onWin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runId, setRunId] = useState(0);
  const [won, setWon] = useState<{ score: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cols = level.cols;
    const rows = level.rows;
    canvas.width = cols * TILE;
    canvas.height = rows * TILE;

    const tiles = level.tiles.slice(); // mutable copy so coins can be removed

    const keys: Record<string, boolean> = {};
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const PW = 22;
    const PH = 28;
    const player = { x: 0, y: 0, vx: 0, vy: 0, onGround: false, face: 1 };
    let coins = 0;
    let deaths = 0;
    let frames = 0;
    let finished = false;

    function spawnPlayer() {
      player.x = level.spawn.col * TILE + (TILE - PW) / 2;
      player.y = level.spawn.row * TILE + (TILE - PH);
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
    }
    spawnPlayer();

    function tileAt(c: number, r: number) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return SOLID; // solid borders
      return tiles[r * cols + c];
    }
    const solidAt = (c: number, r: number) => tileAt(c, r) === SOLID;

    function update() {
      frames++;
      const left = keys["arrowleft"] || keys["a"];
      const right = keys["arrowright"] || keys["d"];
      const jump = keys["arrowup"] || keys["w"] || keys[" "];

      player.vx = (right ? 3.4 : 0) - (left ? 3.4 : 0);
      if (player.vx !== 0) player.face = player.vx > 0 ? 1 : -1;
      if (jump && player.onGround) {
        player.vy = -11;
        player.onGround = false;
      }
      player.vy = Math.min(player.vy + 0.55, 13);

      // Horizontal move + collision.
      player.x += player.vx;
      const top = Math.floor(player.y / TILE);
      const bottom = Math.floor((player.y + PH - 1) / TILE);
      if (player.vx > 0) {
        const c = Math.floor((player.x + PW) / TILE);
        for (let r = top; r <= bottom; r++) {
          if (solidAt(c, r)) {
            player.x = c * TILE - PW;
            break;
          }
        }
      } else if (player.vx < 0) {
        const c = Math.floor(player.x / TILE);
        for (let r = top; r <= bottom; r++) {
          if (solidAt(c, r)) {
            player.x = (c + 1) * TILE;
            break;
          }
        }
      }

      // Vertical move + collision.
      player.y += player.vy;
      player.onGround = false;
      const lft = Math.floor(player.x / TILE);
      const rgt = Math.floor((player.x + PW - 1) / TILE);
      if (player.vy > 0) {
        const r = Math.floor((player.y + PH) / TILE);
        for (let c = lft; c <= rgt; c++) {
          if (solidAt(c, r)) {
            player.y = r * TILE - PH;
            player.vy = 0;
            player.onGround = true;
            break;
          }
        }
      } else if (player.vy < 0) {
        const r = Math.floor(player.y / TILE);
        for (let c = lft; c <= rgt; c++) {
          if (solidAt(c, r)) {
            player.y = (r + 1) * TILE;
            player.vy = 0;
            break;
          }
        }
      }

      // Fell out of the world.
      if (player.y > rows * TILE + 240) {
        deaths++;
        spawnPlayer();
        return;
      }

      // Tile interactions across every cell the player overlaps.
      const c0 = Math.floor(player.x / TILE);
      const c1 = Math.floor((player.x + PW - 1) / TILE);
      const r0 = Math.floor(player.y / TILE);
      const r1 = Math.floor((player.y + PH - 1) / TILE);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const t = tileAt(c, r);
          if (t === SPIKE) {
            deaths++;
            spawnPlayer();
            return;
          }
          if (t === COIN) {
            tiles[r * cols + c] = EMPTY;
            coins++;
          }
          if (t === GOAL && !finished) {
            finished = true;
            const score = coins * 1000 + Math.max(0, 12000 - frames);
            setWon({ score });
            onWin?.(score);
          }
        }
      }
    }

    function draw() {
      // Sky.
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#2a2356");
      sky.addColorStop(1, "#181433");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tiles[r * cols + c];
          const x = c * TILE;
          const y = r * TILE;
          if (t === SOLID) {
            ctx.fillStyle = "#5b8c5a";
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = "#6fa86d";
            ctx.fillRect(x, y, TILE, 5);
          } else if (t === SPIKE) {
            ctx.fillStyle = "#d6536d";
            ctx.beginPath();
            ctx.moveTo(x, y + TILE);
            ctx.lineTo(x + TILE / 2, y + 4);
            ctx.lineTo(x + TILE, y + TILE);
            ctx.closePath();
            ctx.fill();
          } else if (t === COIN) {
            ctx.fillStyle = "#ffce5c";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 9, 0, Math.PI * 2);
            ctx.fill();
          } else if (t === GOAL) {
            ctx.fillStyle = "#4fd6ff";
            ctx.fillRect(x + TILE / 2 - 3, y + 2, 6, TILE - 4);
            ctx.beginPath();
            ctx.moveTo(x + TILE / 2 + 3, y + 4);
            ctx.lineTo(x + TILE - 2, y + 11);
            ctx.lineTo(x + TILE / 2 + 3, y + 18);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Player.
      ctx.fillStyle = "#8b6bff";
      ctx.fillRect(player.x, player.y, PW, PH);
      ctx.fillStyle = "#ffffff";
      const eye = player.face > 0 ? player.x + PW - 9 : player.x + 4;
      ctx.fillRect(eye, player.y + 7, 5, 5);

      // HUD.
      ctx.fillStyle = "rgba(12,10,26,0.7)";
      ctx.fillRect(8, 8, 250, 30);
      ctx.fillStyle = "#e9e7f5";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText(
        `Coins ${coins}   Time ${Math.floor(frames / 60)}s   Deaths ${deaths}`,
        16,
        28
      );
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
  }, [level, runId, onWin]);

  function replay() {
    setWon(null);
    setRunId((n) => n + 1);
  }

  return (
    <div className="runtime">
      <canvas ref={canvasRef} className="game-canvas" />
      {won && (
        <div className="win-overlay">
          <h2>Level complete!</h2>
          <p>Score: <b>{won.score}</b></p>
          <button className="btn" onClick={replay}>Play again</button>
        </div>
      )}
      <p className="muted controls-hint">
        Move: arrows or A / D · Jump: up, W or space
      </p>
    </div>
  );
}
