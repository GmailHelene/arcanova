import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Runtime from "../game/Runtime";
import { Level, normalizeLevel } from "../game/level";

interface GameDetail {
  id: number;
  title: string;
  description: string;
  creator: string;
  plays: number;
  definition: unknown;
}

interface ScoreRow {
  player: string;
  score: number;
}

export default function Play() {
  const { id } = useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(() => {
    api<{ scores: ScoreRow[] }>(`/games/${id}/scores`)
      .then((res) => setScores(res.scores))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    api<{ game: GameDetail }>(`/games/${id}`)
      .then((res) => {
        setGame(res.game);
        setLevel(normalizeLevel(res.game.definition));
      })
      .catch((e) => setError(e.message));
    loadScores();
  }, [id, loadScores]);

  const onWin = useCallback(
    async (score: number) => {
      if (!user) {
        setNote("Sign in to save your score to the leaderboard.");
        return;
      }
      try {
        await api(`/games/${id}/scores`, { method: "POST", body: { score } });
        setNote(`Score saved: ${score}`);
        loadScores();
      } catch (e: any) {
        setNote(e.message);
      }
    },
    [id, user, loadScores]
  );

  if (error) return <p className="error">{error}</p>;
  if (!game || !level) return <p className="muted">Loading world…</p>;

  const isEmpty = level.tiles.every((t, i) => {
    // An untouched level only has the default bottom row of ground.
    const bottomRow = level.rows - 1;
    return i < bottomRow * level.cols ? t === 0 : true;
  });

  return (
    <div>
      <Link to="/" className="back-link">← Back to Discover</Link>
      <h1>{game.title}</h1>
      <p className="muted">by {game.creator} · {game.plays} plays</p>
      {game.description && <p>{game.description}</p>}

      {isEmpty ? (
        <div className="stage placeholder">
          <span>This world is still being built — check back soon.</span>
        </div>
      ) : (
        <Runtime level={level} onWin={onWin} />
      )}

      {note && <p className="ok-msg">{note}</p>}

      <h2>Leaderboard</h2>
      {scores.length === 0 ? (
        <p className="muted">No scores yet — be the first to finish this world.</p>
      ) : (
        <ol className="leaderboard">
          {scores.map((s, i) => (
            <li key={i}>
              <span>{s.player}</span>
              <b>{s.score}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
