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
  creator_id: number;
  like_count: number;
  liked_by_me: boolean;
  hidden: boolean;
}

interface ScoreRow {
  player: string;
  score: number;
}

interface ReactionRow {
  phrase: string;
  player: string;
  user_id: number;
}

// Must match PRESET_PHRASES on the server — the only messages players can post.
const PRESET_PHRASES = [
  "Great level!",
  "So much fun!",
  "Loved the design",
  "Nice and tricky",
  "Too hard for me!",
  "Cool theme",
  "Awesome jumps",
  "Want to play again!",
];

export default function Play() {
  const { id } = useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(() => {
    api<{ scores: ScoreRow[] }>(`/games/${id}/scores`)
      .then((res) => setScores(res.scores))
      .catch(() => {});
  }, [id]);

  const loadReactions = useCallback(() => {
    api<{ reactions: ReactionRow[] }>(`/games/${id}/reactions`)
      .then((res) => setReactions(res.reactions))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    api<{ game: GameDetail }>(`/games/${id}`)
      .then((res) => {
        setGame(res.game);
        setLevel(normalizeLevel(res.game.definition));
        setLiked(res.game.liked_by_me);
        setLikeCount(res.game.like_count);
      })
      .catch((e) => setError(e.message));
    loadScores();
    loadReactions();
  }, [id, loadScores, loadReactions]);

  async function postReaction(phrase: string) {
    if (!user) {
      setNote("Sign in to leave a reaction.");
      return;
    }
    try {
      await api(`/games/${id}/reactions`, { method: "POST", body: { phrase } });
      loadReactions();
    } catch (e: any) {
      setNote(e.message);
    }
  }

  async function toggleLike() {
    if (!user) {
      setNote("Sign in to like worlds.");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await api(`/games/${id}/like`, { method: next ? "POST" : "DELETE" });
    } catch (e: any) {
      // Roll back on failure.
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      setNote(e.message);
    }
  }

  async function report() {
    if (!user) {
      setNote("Sign in to report a world.");
      return;
    }
    const reason = window.prompt("Why are you reporting this world?");
    if (reason === null) return;
    try {
      await api(`/games/${id}/report`, { method: "POST", body: { reason } });
      setNote("Thanks — this world has been reported for review.");
    } catch (e: any) {
      setNote(e.message);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied — share it so others can play this world.");
    } catch {
      setNote(url);
    }
  }

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

  const myReaction = user
    ? reactions.find((r) => r.user_id === user.id)?.phrase
    : undefined;

  const isEmpty = level.tiles.every((t, i) => {
    // An untouched level only has the default bottom row of ground.
    const bottomRow = level.rows - 1;
    return i < bottomRow * level.cols ? t === 0 : true;
  });

  return (
    <div>
      <Link to="/" className="back-link">← Back to Discover</Link>
      <h1>{game.title}</h1>
      <p className="muted">
        by{" "}
        <Link to={`/user/${game.creator_id}`} className="inline-link">
          {game.creator}
        </Link>{" "}
        · {game.plays} plays
      </p>
      {game.description && <p>{game.description}</p>}

      <div className="play-actions">
        <button
          className={`btn-ghost ${liked ? "liked" : ""}`}
          onClick={toggleLike}
        >
          {liked ? "♥" : "♡"} {likeCount}
        </button>
        <button className="btn-ghost" onClick={share}>
          Share
        </button>
        <button className="btn-ghost" onClick={report}>
          Report
        </button>
      </div>

      {game.hidden ? (
        <div className="stage placeholder">
          <span>This world is unavailable.</span>
        </div>
      ) : isEmpty ? (
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

      <h2>Reactions</h2>
      {user ? (
        <div className="phrase-picker">
          {PRESET_PHRASES.map((p) => (
            <button
              key={p}
              className={`phrase-btn ${myReaction === p ? "active" : ""}`}
              onClick={() => postReaction(p)}
            >
              {p}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Sign in to leave a reaction.</p>
      )}
      {reactions.length > 0 && (
        <ul className="reaction-list">
          {reactions.map((r, i) => (
            <li key={i}>
              <b>{r.player}</b> {r.phrase}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
