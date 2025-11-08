import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCreatorSession } from '../utils/session';
import { logoutCreator } from '../firebase/auth';

export default function Header() {
  const [creator, setCreator] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check session on mount and whenever location changes
  useEffect(() => {
    const creatorData = getCreatorSession();
    setCreator(creatorData);
  }, [location]);

  // Listen for session changes (login/logout events)
  useEffect(() => {
    const handleSessionChange = (event) => {
      setCreator(event.detail);
    };

    window.addEventListener('creatorSessionChanged', handleSessionChange);
    return () => window.removeEventListener('creatorSessionChanged', handleSessionChange);
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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-6">
      <nav className="max-w-7xl mx-auto glass-navbar px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo with Admin Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold text-gradient">
              TShirt Studio
            </Link>
            {creator && (
              <span className="italic text-[#C3F35A] text-lg">creator</span>
            )}
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-8">
            <NavLink to="/features" className="text-white/80 hover:text-white transition-colors duration-300">
              Features
            </NavLink>
            <NavLink to="/learn" className="text-white/80 hover:text-white transition-colors duration-300">
              Learn
            </NavLink>
            <NavLink to="/explore" className="text-white/80 hover:text-white transition-colors duration-300">
              Explore
            </NavLink>
            <NavLink to="/trending" className="text-white/80 hover:text-white transition-colors duration-300">
              Trending
            </NavLink>
            <NavLink to="/contact" className="text-white/80 hover:text-white transition-colors duration-300">
              Contact
            </NavLink>
          </div>

          {/* Right Side - Login/Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {!creator ? (
              <>
                <Link 
                  to="/creator" 
                  className="glass-button flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Creator Login
                </Link>
                <Link 
                  to="/login" 
                  className="btn-primary flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  User Login
                </Link>
              </>
            ) : (
              <div className="relative">
                <button 
                  className="glass-button flex items-center gap-3" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-mid to-purple-bright flex items-center justify-center text-white font-bold text-sm">
                    {creator.firstName?.[0]}{creator.lastName?.[0]}
                  </div>
                  <span className="text-white">{creator.firstName} {creator.lastName}</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                
                {dropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 glass-card p-2">
                    <Link 
                      to="/creator" 
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200" 
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      Dashboard
                    </Link>
                    <div className="h-px bg-white/10 my-2"></div>
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all duration-200" 
                      onClick={handleLogout}
                    >
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
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              <NavLink to="/features" className="text-white/80 hover:text-white transition-colors duration-300">
                Features
              </NavLink>
              <NavLink to="/learn" className="text-white/80 hover:text-white transition-colors duration-300">
                Learn
              </NavLink>
              <NavLink to="/explore" className="text-white/80 hover:text-white transition-colors duration-300">
                Explore
              </NavLink>
              <NavLink to="/trending" className="text-white/80 hover:text-white transition-colors duration-300">
                Trending
              </NavLink>
              <NavLink to="/contact" className="text-white/80 hover:text-white transition-colors duration-300">
                Contact
              </NavLink>
              
              <div className="pt-4 border-t border-white/10"></div>
              
              {!creator ? (
                <>
                  <Link 
                    to="/creator" 
                    className="glass-button text-center flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Creator Login
                  </Link>
                  <Link 
                    to="/login" 
                    className="btn-primary text-center flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    User Login
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-mid to-purple-bright flex items-center justify-center text-white font-bold text-sm">
                      {creator.firstName?.[0]}{creator.lastName?.[0]}
                    </div>
                    <span className="text-white">{creator.firstName} {creator.lastName}</span>
                  </div>
                  <Link 
                    to="/creator" 
                    className="glass-button text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button 
                    className="btn-danger text-center"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
