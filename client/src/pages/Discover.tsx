import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface GameCard {
  id: number;
  title: string;
  description: string;
  plays: number;
  creator: string;
}

export default function Discover() {
  const [games, setGames] = useState<GameCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ games: GameCard[] }>("/games")
      .then((res) => setGames(res.games))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="hero">
        <h1>Enter the Arcanova</h1>
        <p>Explore worlds built by players around the globe — or build your own.</p>
        <Link to="/create" className="btn btn-lg">Start creating</Link>
      </section>

      <h2>Discover worlds</h2>
      {loading && <p className="muted">Loading worlds…</p>}
      {error && <p className="error">Could not load worlds: {error}</p>}
      {!loading && !error && games.length === 0 && (
        <p className="muted">
          No published worlds yet. Be the first — head to Create.
        </p>
      )}
      <div className="grid">
        {games.map((g) => (
          <Link key={g.id} to={`/play/${g.id}`} className="card">
            <div className="card-art">✦</div>
            <h3>{g.title}</h3>
            <p className="muted">{g.description || "An Arcanova world."}</p>
            <span className="card-meta">by {g.creator} · {g.plays} plays</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
