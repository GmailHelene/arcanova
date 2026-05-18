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

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ user: Profile; games: Work[] }>(`/users/${id}`)
      .then((res) => {
        setProfile(res.user);
        setGames(res.games);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p className="muted">Loading profile…</p>;

  return (
    <div>
      <Link to="/" className="back-link">
        ← Back to Discover
      </Link>
      <div className="profile-head">
        <div className="avatar">{profile.display_name.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{profile.display_name}</h1>
          <p className="muted">
            @{profile.username} · joined{" "}
            {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
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
