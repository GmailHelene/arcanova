import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Runtime from "../game/Runtime";
import ArenaRuntime from "../game/ArenaRuntime";
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
  BUTTON,
  GATE,
  PALETTE,
  THEMES,
  getTheme,
  normalizeLevel,
} from "../game/level";
import {
  Arena,
  ARENA_PALETTE,
  A_WALL,
  A_GEM,
  A_ENEMY,
  A_EXIT,
  normalizeArena,
  worldKind,
} from "../game/arena";

type Tool = number | "spawn" | "eraser";
type Grid = Level | Arena;

export default function Editor() {
  const { id } = useParams();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);

  const [level, setLevel] = useState<Grid | null>(null);
  const [kind, setKind] = useState<"platformer" | "arena">("platformer");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [tool, setTool] = useState<Tool>(SOLID);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the game and its level definition.
  useEffect(() => {
    api<{ game: any }>(`/games/${id}`)
      .then((res) => {
        setTitle(res.game.title);
        setPublished(res.game.published);
        const k = worldKind(res.game.definition);
        setKind(k);
        setLevel(
          k === "arena"
            ? normalizeArena(res.game.definition)
            : normalizeLevel(res.game.definition),
        );
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Redraw the grid whenever the level changes.
  useEffect(() => {
    if (!level || testing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = level.cols * TILE;
    canvas.height = level.rows * TILE;
    const theme = getTheme(level.theme);

    if (kind === "arena") {
      ctx.fillStyle = theme.skyBottom;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, theme.skyTop);
      sky.addColorStop(1, theme.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const t = level.tiles[r * level.cols + c];
        const x = c * TILE;
        const y = r * TILE;
        if (kind === "arena") {
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
          } else if (t === A_ENEMY) {
            ctx.fillStyle = "#d6536d";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 11, 0, Math.PI * 2);
            ctx.fill();
          } else if (t === A_EXIT) {
            ctx.fillStyle = "#4fd6ff";
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          }
        } else if (t === SOLID) {
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
          // Faint cell highlight + pole and flag, so goals are easy to spot.
          ctx.fillStyle = "rgba(79,214,255,0.18)";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#4fd6ff";
          ctx.fillRect(x + 8, y + 3, 4, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 5);
          ctx.lineTo(x + TILE - 4, y + 11);
          ctx.lineTo(x + 12, y + 17);
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
        } else if (t === MOVER_H || t === MOVER_V) {
          ctx.fillStyle = "#a86a26";
          ctx.fillRect(x, y + 8, TILE, TILE - 16);
          ctx.fillStyle = "#c98a3a";
          ctx.fillRect(x, y + 8, TILE, 4);
          ctx.fillStyle = "#fff";
          ctx.font = "14px Segoe UI, sans-serif";
          ctx.fillText(t === MOVER_H ? "↔" : "↕", x + TILE / 2 - 6, y + TILE / 2 + 6);
        } else if (t === BUTTON) {
          ctx.fillStyle = "#3a8a68";
          ctx.fillRect(x + 3, y + TILE - 7, TILE - 6, 7);
          ctx.fillStyle = "#5fd6a0";
          ctx.fillRect(x + 6, y + TILE - 10, TILE - 12, 4);
        } else if (t === GATE) {
          ctx.fillStyle = "#9a7bd0";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#b9a0e6";
          ctx.fillRect(x + TILE / 2 - 2, y + 4, 4, TILE - 8);
        }
      }
    }

    // Grid lines.
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let c = 0; c <= level.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= level.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(canvas.width, r * TILE);
      ctx.stroke();
    }

    // Spawn marker.
    ctx.fillStyle = "#8b6bff";
    ctx.fillRect(
      level.spawn.col * TILE + 6,
      level.spawn.row * TILE + 4,
      TILE - 12,
      TILE - 8,
    );
    ctx.fillStyle = "#fff";
    ctx.font = "10px Segoe UI, sans-serif";
    ctx.fillText("P1", level.spawn.col * TILE + 9, level.spawn.row * TILE + 20);
  }, [level, testing, kind]);

  function cellFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const col = Math.floor(((e.clientX - rect.left) * sx) / TILE);
    const row = Math.floor(((e.clientY - rect.top) * sy) / TILE);
    return { col, row };
  }

  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!level) return;
    const { col, row } = cellFromEvent(e);
    if (col < 0 || col >= level.cols || row < 0 || row >= level.rows) return;

    if (tool === "spawn") {
      setLevel({ ...level, spawn: { col, row } });
      return;
    }
    const value = tool === "eraser" ? EMPTY : (tool as number);
    const idx = row * level.cols + col;
    if (level.tiles[idx] === value) return;
    const tiles = level.tiles.slice();
    tiles[idx] = value;
    setLevel({ ...level, tiles });
  }

  async function save(publish?: boolean) {
    if (!level) return;
    setMessage(null);
    setError(null);
    try {
      const body: any = { definition: level };
      if (publish !== undefined) body.published = publish;
      await api(`/games/${id}`, { method: "PUT", body });
      if (publish !== undefined) setPublished(publish);
      setMessage(publish ? "World published!" : "Saved.");
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) {
    return (
      <div className="panel">
        <h1>Editor</h1>
        <p>Sign in to edit your worlds.</p>
        <Link to="/login" className="btn">
          Sign in
        </Link>
      </div>
    );
  }
  if (error && !level) return <p className="error">{error}</p>;
  if (!level) return <p className="muted">Loading editor…</p>;

  return (
    <div>
      <Link to="/create" className="back-link">
        ← Back to your creations
      </Link>
      <h1>{title}</h1>
      {!testing && (
        <p className="muted">
          Pick a tile from the palette, paint it on the grid, place the Start
          point, then press Test play.
        </p>
      )}

      {testing ? (
        <div>
          <button className="btn-ghost" onClick={() => setTesting(false)}>
            ✕ Exit test
          </button>
          {kind === "arena" ? (
            <ArenaRuntime arena={level as Arena} />
          ) : (
            <Runtime level={level as Level} />
          )}
        </div>
      ) : (
        <>
          <div className="theme-row">
            <label>Theme</label>
            <select
              value={level.theme}
              onChange={(e) => setLevel({ ...level, theme: e.target.value })}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="palette">
            {(kind === "arena" ? ARENA_PALETTE : PALETTE).map((p) => (
              <button
                key={p.type}
                className={`tool ${tool === p.type ? "active" : ""}`}
                style={{ borderColor: p.color }}
                onClick={() => setTool(p.type)}
              >
                <span className="swatch" style={{ background: p.color }} />
                {p.label}
              </button>
            ))}
            <button
              className={`tool ${tool === "spawn" ? "active" : ""}`}
              onClick={() => setTool("spawn")}
            >
              <span className="swatch" style={{ background: "#8b6bff" }} />
              Start
            </button>
            <button
              className={`tool ${tool === "eraser" ? "active" : ""}`}
              onClick={() => setTool("eraser")}
            >
              <span className="swatch" style={{ background: "#2e2a52" }} />
              Eraser
            </button>
          </div>

          <div className="editor-scroll">
            <canvas
              ref={canvasRef}
              className="editor-canvas"
              onPointerDown={(e) => {
                painting.current = true;
                paint(e);
              }}
              onPointerMove={(e) => {
                if (painting.current) paint(e);
              }}
              onPointerUp={() => (painting.current = false)}
              onPointerLeave={() => (painting.current = false)}
            />
          </div>
          {kind === "platformer" && (
            <p className="muted controls-hint">
              Scroll sideways to build across the whole level.
            </p>
          )}

          <div className="editor-actions">
            <button className="btn" onClick={() => setTesting(true)}>
              ▶ Test play
            </button>
            <button className="btn-ghost" onClick={() => save()}>
              Save
            </button>
            <button className="btn" onClick={() => save(!published)}>
              {published ? "Unpublish" : "Publish to Discover"}
            </button>
            {message && <span className="ok-msg">{message}</span>}
            {error && <span className="error">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
