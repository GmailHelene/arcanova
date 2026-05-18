import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface Report {
  id: number;
  reason: string;
  game_id: number;
  game_title: string;
  reporter: string;
}

interface HiddenGame {
  id: number;
  title: string;
  creator: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [hidden, setHidden] = useState<HiddenGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api<{ reports: Report[] }>("/admin/reports"),
      api<{ games: HiddenGame[] }>("/admin/hidden"),
    ])
      .then(([r, h]) => {
        setReports(r.reports);
        setHidden(h.games);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.isAdmin) load();
    else setLoading(false);
  }, [user]);

  async function act(path: string) {
    setError(null);
    try {
      await api(path, { method: "POST" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="panel">
        <h1>Admin</h1>
        <p>This area is for admins only.</p>
        <Link to="/" className="btn">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Review queue</h1>
      <p className="muted">Worlds reported by players, waiting for review.</p>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && reports.length === 0 && (
        <p className="muted">Nothing to review — all clear.</p>
      )}
      <div className="report-list">
        {reports.map((r) => (
          <div key={r.id} className="report">
            <div className="report-info">
              <Link to={`/play/${r.game_id}`} className="inline-link">
                <b>{r.game_title}</b>
              </Link>
              <p className="muted">
                Reported by {r.reporter}: {r.reason || "(no reason given)"}
              </p>
            </div>
            <div className="report-actions">
              <button
                className="btn-danger"
                onClick={() => act(`/admin/games/${r.game_id}/hide`)}
              >
                Hide world
              </button>
              <button
                className="btn-ghost"
                onClick={() => act(`/admin/reports/${r.id}/dismiss`)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2>Hidden worlds</h2>
      {hidden.length === 0 ? (
        <p className="muted">No worlds are hidden.</p>
      ) : (
        <div className="report-list">
          {hidden.map((g) => (
            <div key={g.id} className="report">
              <div className="report-info">
                <b>{g.title}</b>
                <p className="muted">by {g.creator}</p>
              </div>
              <button
                className="btn-ghost"
                onClick={() => act(`/admin/games/${g.id}/unhide`)}
              >
                Unhide
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
