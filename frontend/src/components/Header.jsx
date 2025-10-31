import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCreatorSession } from '../utils/session';
import { logoutCreator } from '../firebase/auth';

export default function Header() {
  const [creator, setCreator] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const creatorData = getCreatorSession();
    setCreator(creatorData);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutCreator();
      setCreator(null);
      setDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">T‑Shirt Studio</Link>
        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          
          {!creator ? (
            <>
              <Link to="/creator" className="nav-link-btn creator-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Creator Login
              </Link>
              <Link to="/login" className="nav-link-btn user-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                User Login
              </Link>
            </>
          ) : (
            <div className="creator-dropdown">
              <button 
                className="creator-dropdown-btn" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="creator-avatar">
                  {creator.firstName?.[0]}{creator.lastName?.[0]}
                </div>
                <span className="creator-name">{creator.firstName} {creator.lastName}</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/creator" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Dashboard
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}


