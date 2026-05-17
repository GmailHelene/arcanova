import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Runtime from "../game/Runtime";
import {
  Level,
  TileType,
  TILE,
  EMPTY,
  SOLID,
  SPIKE,
  COIN,
  GOAL,
  BOUNCER,
  ONEWAY,
  PALETTE,
  normalizeLevel,
} from "../game/level";

type Tool = TileType | "spawn" | "eraser";

export default function Editor() {
  const { id } = useParams();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);

  const [level, setLevel] = useState<Level | null>(null);
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
        setLevel(normalizeLevel(res.game.definition));
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

    ctx.fillStyle = "#181433";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const t = level.tiles[r * level.cols + c];
        const x = c * TILE;
        const y = r * TILE;
        if (t === SOLID) {
          ctx.fillStyle = "#5b8c5a";
          ctx.fillRect(x, y, TILE, TILE);
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
      TILE - 8
    );
    ctx.fillStyle = "#fff";
    ctx.font = "10px Segoe UI, sans-serif";
    ctx.fillText("P1", level.spawn.col * TILE + 9, level.spawn.row * TILE + 20);
  }, [level, testing]);

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
        <Link to="/login" className="btn">Sign in</Link>
      </div>
    );
  }
  if (error && !level) return <p className="error">{error}</p>;
  if (!level) return <p className="muted">Loading editor…</p>;

  return (
    <div>
      <Link to="/create" className="back-link">← Back to your creations</Link>
      <h1>{title}</h1>

      {testing ? (
        <div>
          <button className="btn-ghost" onClick={() => setTesting(false)}>
            ✕ Exit test
          </button>
          <Runtime level={level} />
        </div>
      ) : (
        <>
          <div className="palette">
            {PALETTE.map((p) => (
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

          <canvas
            ref={canvasRef}
            className="game-canvas editor-canvas"
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
