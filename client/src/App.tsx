import { NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Discover from "./pages/Discover";
import Play from "./pages/Play";
import Create from "./pages/Create";
import Editor from "./pages/Editor";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">✦</span> Arcanova
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>Discover</NavLink>
          <NavLink to="/create">Create</NavLink>
          {user && <NavLink to="/profile">Profile</NavLink>}
        </nav>
        <div className="account">
          {user ? (
            <>
              <span className="hello">Hi, {user.displayName}</span>
              <button className="btn-ghost" onClick={logout}>Sign out</button>
            </>
          ) : (
            <NavLink to="/login" className="btn">Sign in</NavLink>
          )}
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/play/:id" element={<Play />} />
          <Route path="/create" element={<Create />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      <footer className="footer">
        Arcanova — a universe of worlds, built by its players.
      </footer>
    </div>
  );
}
