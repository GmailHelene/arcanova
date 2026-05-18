import { useEffect, useRef, useState } from "react";
import {
  Level,
  TILE,
  EMPTY,
  SOLID,
  SPIKE,
  COIN,
  GOAL,
  BOUNCER,
  ONEWAY,
  MOVER_H,
  MOVER_V,
  getTheme,
} from "./level";
import { sfx, music } from "./sound";

interface Props {
  level: Level;
  // Called once when the player reaches the goal.
  onWin?: (score: number) => void;
}

// Plays a 2D platformer level. Full keyboard control: arrows or WASD to move,
// up / W / space to jump.
export default function Runtime({ level, onWin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef({ left: false, right: false, jump: false });
  const [runId, setRunId] = useState(0);
  const [won, setWon] = useState<{ score: number } | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches === true,
  );

  // Background music runs while enabled, independent of the game loop.
  useEffect(() => {
    if (!musicOn) return;
    music.start();
    return () => music.stop();
  }, [musicOn]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cols = level.cols;
    const rows = level.rows;
    // The canvas is a scrolling viewport — narrower than a wide level.
    const VIEW_COLS = 30;
    const viewW = Math.min(VIEW_COLS, cols) * TILE;
    const viewH = rows * TILE;
    canvas.width = viewW;
    canvas.height = viewH;
    const theme = getTheme(level.theme);
    let camX = 0;

    const tiles = level.tiles.slice(); // mutable copy so coins can be removed

    // Moving platforms — derived from MOVER tiles, animated as entities.
    interface Mover {
      ox: number;
      oy: number;
      axis: 0 | 1; // 0 = horizontal, 1 = vertical
      x: number;
      y: number;
      dx: number;
      dy: number;
    }
    const movers: Mover[] = [];
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const t = level.tiles[r * level.cols + c];
        if (t === MOVER_H || t === MOVER_V) {
          movers.push({
            ox: c * TILE,
            oy: r * TILE,
            axis: t === MOVER_H ? 0 : 1,
            x: c * TILE,
            y: r * TILE,
            dx: 0,
            dy: 0,
          });
        }
      }
    }
    const MOVE_AMP = 3 * TILE;

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
    let ridingMover: Mover | null = null;

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
    // Tiles that block movement on every side.
    const blocks = (c: number, r: number) => {
      const t = tileAt(c, r);
      return t === SOLID || t === BOUNCER;
    };

    function update() {
      frames++;

      // Animate moving platforms; carry the player if standing on one.
      const phase = Math.sin(frames * 0.025);
      for (const m of movers) {
        const nx = m.axis === 0 ? m.ox + phase * MOVE_AMP : m.ox;
        const ny = m.axis === 1 ? m.oy + phase * MOVE_AMP : m.oy;
        m.dx = nx - m.x;
        m.dy = ny - m.y;
        m.x = nx;
        m.y = ny;
      }
      if (ridingMover) {
        player.x += ridingMover.dx;
        player.y += ridingMover.dy;
      }
      ridingMover = null;

      const t = touchRef.current;
      const left = keys["arrowleft"] || keys["a"] || t.left;
      const right = keys["arrowright"] || keys["d"] || t.right;
      const jump = keys["arrowup"] || keys["w"] || keys[" "] || t.jump;

      player.vx = (right ? 3.4 : 0) - (left ? 3.4 : 0);
      if (player.vx !== 0) player.face = player.vx > 0 ? 1 : -1;
      if (jump && player.onGround) {
        player.vy = -11;
        player.onGround = false;
        sfx.jump();
      }
      player.vy = Math.min(player.vy + 0.55, 13);

      // Horizontal move + collision.
      player.x += player.vx;
      const top = Math.floor(player.y / TILE);
      const bottom = Math.floor((player.y + PH - 1) / TILE);
      if (player.vx > 0) {
        const c = Math.floor((player.x + PW) / TILE);
        for (let r = top; r <= bottom; r++) {
          if (blocks(c, r)) {
            player.x = c * TILE - PW;
            break;
          }
        }
      } else if (player.vx < 0) {
        const c = Math.floor(player.x / TILE);
        for (let r = top; r <= bottom; r++) {
          if (blocks(c, r)) {
            player.x = (c + 1) * TILE;
            break;
          }
        }
      }

      // Push out of moving platforms horizontally.
      for (const m of movers) {
        if (
          player.x < m.x + TILE &&
          player.x + PW > m.x &&
          player.y < m.y + TILE &&
          player.y + PH > m.y
        ) {
          if (player.vx > 0) {
            player.x = m.x - PW;
          } else if (player.vx < 0) {
            player.x = m.x + TILE;
          } else {
            const overlapLeft = player.x + PW - m.x;
            const overlapRight = m.x + TILE - player.x;
            player.x = overlapLeft < overlapRight ? m.x - PW : m.x + TILE;
          }
        }
      }

      // Vertical move + collision.
      const prevBottom = player.y + PH;
      player.y += player.vy;
      player.onGround = false;
      const lft = Math.floor(player.x / TILE);
      const rgt = Math.floor((player.x + PW - 1) / TILE);
      if (player.vy > 0) {
        const r = Math.floor((player.y + PH) / TILE);
        for (let c = lft; c <= rgt; c++) {
          const t = tileAt(c, r);
          if (t === SOLID) {
            player.y = r * TILE - PH;
            player.vy = 0;
            player.onGround = true;
            break;
          }
          if (t === BOUNCER) {
            player.y = r * TILE - PH;
            player.vy = -16.5;
            sfx.bounce();
            break;
          }
          // One-way platforms catch the player only when landing from above.
          if (t === ONEWAY && prevBottom <= r * TILE + 2) {
            player.y = r * TILE - PH;
            player.vy = 0;
            player.onGround = true;
            break;
          }
        }
      } else if (player.vy < 0) {
        const r = Math.floor(player.y / TILE);
        for (let c = lft; c <= rgt; c++) {
          if (blocks(c, r)) {
            player.y = (r + 1) * TILE;
            player.vy = 0;
            break;
          }
        }
      }

      // Land on / collide with moving platforms vertically.
      for (const m of movers) {
        if (
          player.x < m.x + TILE &&
          player.x + PW > m.x &&
          player.y < m.y + TILE &&
          player.y + PH > m.y
        ) {
          if (player.vy < 0) {
            player.y = m.y + TILE;
            player.vy = 0;
          } else {
            player.y = m.y - PH;
            player.vy = 0;
            player.onGround = true;
            ridingMover = m;
          }
        }
      }

      // Fell out of the world.
      if (player.y > rows * TILE + 240) {
        deaths++;
        sfx.die();
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
            sfx.die();
            spawnPlayer();
            return;
          }
          if (t === COIN) {
            tiles[r * cols + c] = EMPTY;
            coins++;
            sfx.coin();
          }
          if (t === GOAL && !finished) {
            finished = true;
            const score = coins * 1000 + Math.max(0, 12000 - frames);
            sfx.win();
            setWon({ score });
            onWin?.(score);
          }
        }
      }
    }

    function draw() {
      // Camera follows the player, clamped to the level bounds.
      camX = player.x + PW / 2 - viewW / 2;
      camX = Math.max(0, Math.min(camX, cols * TILE - viewW));

      // Sky fills the viewport — drawn before the camera transform.
      const sky = ctx.createLinearGradient(0, 0, 0, viewH);
      sky.addColorStop(0, theme.skyTop);
      sky.addColorStop(1, theme.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      ctx.translate(-Math.round(camX), 0);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tiles[r * cols + c];
          const x = c * TILE;
          const y = r * TILE;
          if (t === SOLID) {
            ctx.fillStyle = theme.ground;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = theme.groundTop;
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
          } else if (t === BOUNCER) {
            ctx.fillStyle = "#a86a26";
            ctx.fillRect(x + 3, y + TILE - 9, TILE - 6, 9);
            ctx.fillStyle = "#ffce5c";
            ctx.fillRect(x + 3, y + TILE - 16, TILE - 6, 8);
          } else if (t === ONEWAY) {
            ctx.fillStyle = "#7c93c7";
            ctx.fillRect(x, y, TILE, 9);
            ctx.fillStyle = "#97abd6";
            ctx.fillRect(x, y, TILE, 3);
          }
        }
      }

      // Moving platforms.
      for (const m of movers) {
        ctx.fillStyle = "#a86a26";
        ctx.fillRect(m.x, m.y + 5, TILE, TILE - 10);
        ctx.fillStyle = "#c98a3a";
        ctx.fillRect(m.x, m.y + 5, TILE, 5);
      }

      // Player.
      ctx.fillStyle = "#8b6bff";
      ctx.fillRect(player.x, player.y, PW, PH);
      ctx.fillStyle = "#ffffff";
      const eye = player.face > 0 ? player.x + PW - 9 : player.x + 4;
      ctx.fillRect(eye, player.y + 7, 5, 5);

      ctx.restore();

      // HUD — drawn in screen space, not affected by the camera.
      ctx.fillStyle = "rgba(12,10,26,0.7)";
      ctx.fillRect(8, 8, 250, 30);
      ctx.fillStyle = "#e9e7f5";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText(
        `Coins ${coins}   Time ${Math.floor(frames / 60)}s   Deaths ${deaths}`,
        16,
        28,
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

  function hold(key: "left" | "right" | "jump", value: boolean) {
    touchRef.current[key] = value;
  }

  return (
    <div className="runtime">
      <canvas ref={canvasRef} className="game-canvas" />
      {isTouch && !won && (
        <div className="touch-controls">
          <div className="touch-pad">
            <button
              className="touch-btn"
              onPointerDown={() => hold("left", true)}
              onPointerUp={() => hold("left", false)}
              onPointerLeave={() => hold("left", false)}
              onPointerCancel={() => hold("left", false)}
            >
              ◀
            </button>
            <button
              className="touch-btn"
              onPointerDown={() => hold("right", true)}
              onPointerUp={() => hold("right", false)}
              onPointerLeave={() => hold("right", false)}
              onPointerCancel={() => hold("right", false)}
            >
              ▶
            </button>
          </div>
          <button
            className="touch-btn touch-jump"
            onPointerDown={() => hold("jump", true)}
            onPointerUp={() => hold("jump", false)}
            onPointerLeave={() => hold("jump", false)}
            onPointerCancel={() => hold("jump", false)}
          >
            ▲
          </button>
        </div>
      )}
      {won && (
        <div className="win-overlay">
          <h2>Level complete!</h2>
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
            ? "Use the on-screen buttons to move and jump."
            : "Move: arrows or A / D · Jump: up, W or space"}
        </span>
        <button className="btn-ghost" onClick={() => setMusicOn((m) => !m)}>
          {musicOn ? "Music: on" : "Music: off"}
        </button>
      </div>
    </div>
  );
}
