import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

interface Profile {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

interface Work {
  id: number;
  title: string;
  description: string;
  plays: number;
  like_count: number;
}

interface Stats {
  publishedWorlds: number;
  totalPlays: number;
  totalLikes: number;
}

interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

interface ProfileResponse {
  user: Profile;
  games: Work[];
  stats: Stats;
  badges: Badge[];
}

export default function UserProfile() {
  const { id } = useParams();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ProfileResponse>(`/users/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading profile…</p>;

  const { user, games, stats, badges } = data;

  return (
    <div>
      <Link to="/" className="back-link">
        ← Back to Discover
      </Link>
      <div className="profile-head">
        <div className="avatar">{user.display_name.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{user.display_name}</h1>
          <p className="muted">
            @{user.username} · joined{" "}
            {new Date(user.created_at).toLocaleDateString()}
          </p>
          <p className="muted">
            {stats.publishedWorlds} worlds · {stats.totalPlays} plays · ♥{" "}
            {stats.totalLikes}
          </p>
        </div>
      </div>

      <h2>Badges</h2>
      <div className="badge-row">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`badge ${b.earned ? "earned" : "locked"}`}
            title={b.description}
          >
            <span className="badge-mark">✦</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      <h2>Published worlds</h2>
      {games.length === 0 ? (
        <p className="muted">No published worlds yet.</p>
      ) : (
        <div className="grid">
          {games.map((g) => (
            <Link key={g.id} to={`/play/${g.id}`} className="card">
              <div className="card-art">✦</div>
              <h3>{g.title}</h3>
              <p className="muted">{g.description || "An Arcanova world."}</p>
              <span className="card-meta">
                {g.plays} plays · ♥ {g.like_count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
