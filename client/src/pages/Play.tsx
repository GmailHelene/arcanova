import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

interface GameDetail {
  id: number;
  title: string;
  description: string;
  creator: string;
  plays: number;
}

export default function Play() {
  const { id } = useParams();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ game: GameDetail }>(`/games/${id}`)
      .then((res) => setGame(res.game))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!game) return <p className="muted">Loading world…</p>;

  return (
    <div>
      <Link to="/" className="back-link">← Back to Discover</Link>
      <h1>{game.title}</h1>
      <p className="muted">by {game.creator} · {game.plays} plays</p>
      <p>{game.description}</p>

      <div className="stage placeholder">
        {/* Next milestone: the play runtime renders the game's
            definition here so anyone can play this world. */}
        <span>Play runtime — coming next</span>
      </div>
    </div>
  );
}
