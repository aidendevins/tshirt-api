import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">T‑Shirt Studio</Link>
        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/creator">Creator Login</NavLink>
          <NavLink to="/login">User Login</NavLink>
        </nav>
      </div>
    </header>
  );
}


