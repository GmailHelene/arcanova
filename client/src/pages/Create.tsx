import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface MyGame {
  id: number;
  title: string;
  published: boolean;
  plays: number;
}

export default function Create() {
  const { user } = useAuth();
  const [games, setGames] = useState<MyGame[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"platformer" | "arena">("platformer");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ games: MyGame[] }>("/games/mine")
      .then((res) => setGames(res.games))
      .catch((e) => setError(e.message));
  }, [user]);

  async function createGame() {
    setError(null);
    try {
      const res = await api<{ game: MyGame }>("/games", {
        method: "POST",
        body: { title: title.trim(), definition: { kind } },
      });
      setGames((prev) => [res.game, ...prev]);
      setTitle("");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteGame(game: MyGame) {
    if (!window.confirm(`Delete "${game.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api(`/games/${game.id}`, { method: "DELETE" });
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) {
    return (
      <div className="panel">
        <h1>Create</h1>
        <p>You need an account to build worlds.</p>
        <Link to="/login" className="btn">
          Sign in to start
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Your creations</h1>
      <div className="new-game">
        <input
          placeholder="Name your new world…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "platformer" | "arena")}
        >
          <option value="platformer">Platformer</option>
          <option value="arena">Top-down arena</option>
        </select>
        <button className="btn" disabled={!title.trim()} onClick={createGame}>
          Create world
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        {games.map((g) => (
          <Link key={g.id} to={`/edit/${g.id}`} className="card">
            <div className="card-art">✦</div>
            <h3>{g.title}</h3>
            <span className="card-meta">
              {g.published ? "Published" : "Draft"} · {g.plays} plays
            </span>
            <div className="card-row">
              <span className="card-meta">Open editor →</span>
              <button
                className="btn-danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteGame(g);
                }}
              >
                Delete
              </button>
            </div>
          </Link>
        ))}
        {games.length === 0 && (
          <p className="muted">No worlds yet — create your first one above.</p>
        )}
      </div>
    </div>
  );
}
