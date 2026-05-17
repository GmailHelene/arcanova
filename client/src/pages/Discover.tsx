import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface GameCard {
  id: number;
  title: string;
  description: string;
  plays: number;
  creator: string;
  like_count: number;
}

type Sort = "new" | "plays" | "likes";

export default function Discover() {
  const [games, setGames] = useState<GameCard[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refetch when search or sort changes (search is debounced).
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("sort", sort);
      api<{ games: GameCard[] }>(`/games?${params.toString()}`)
        .then((res) => setGames(res.games))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search, sort]);

  return (
    <div>
      <section className="hero">
        <h1>Enter the Arcanova</h1>
        <p>Explore worlds built by players around the globe — or build your own.</p>
        <Link to="/create" className="btn btn-lg">Start creating</Link>
      </section>

      <div className="discover-bar">
        <input
          placeholder="Search worlds…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="new">Newest</option>
          <option value="plays">Most played</option>
          <option value="likes">Most liked</option>
        </select>
      </div>

      <h2>Discover worlds</h2>
      {loading && <p className="muted">Loading worlds…</p>}
      {error && <p className="error">Could not load worlds: {error}</p>}
      {!loading && !error && games.length === 0 && (
        <p className="muted">
          {search.trim()
            ? "No worlds match your search."
            : "No published worlds yet. Be the first — head to Create."}
        </p>
      )}
      <div className="grid">
        {games.map((g) => (
          <Link key={g.id} to={`/play/${g.id}`} className="card">
            <div className="card-art">✦</div>
            <h3>{g.title}</h3>
            <p className="muted">{g.description || "An Arcanova world."}</p>
            <span className="card-meta">
              by {g.creator} · {g.plays} plays · ♥ {g.like_count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
