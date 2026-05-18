import { Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="panel">
        <h1>Profile</h1>
        <p>Sign in to see your profile.</p>
        <Link to="/login" className="btn">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="avatar">{user.displayName.charAt(0).toUpperCase()}</div>
      <h1>{user.displayName}</h1>
      <p className="muted">
        @{user.username} · {user.email}
      </p>
      <Link to="/create" className="btn">
        Go to your creations
      </Link>
      <Link to={`/user/${user.id}`} className="btn-ghost">
        View your public profile
      </Link>
    </div>
  );
}
