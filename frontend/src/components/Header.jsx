import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCreatorSession } from '../utils/session';
import { logoutCreator } from '../firebase/auth';
import FloatingNavbar from './ui/FloatingNavbar';

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
    <FloatingNavbar>
      <nav className="max-w-7xl mx-auto glass-navbar px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo with Creator Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold text-gradient">
              <motion.span
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                TShirt Studio
              </motion.span>
            </Link>
            {creator && (
              <motion.span
                className="italic text-[#C3F35A] text-lg"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                creator
              </motion.span>
            )}
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-8">
            {['Features', 'Learn', 'Explore', 'Trending', 'Contact'].map((item) => (
              <NavLink
                key={item}
                to={`/${item.toLowerCase()}`}
                className="text-white/80 hover:text-white transition-colors duration-300 relative group"
              >
                <motion.span whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  {item}
                </motion.span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-bright group-hover:w-full transition-all duration-300"></span>
              </NavLink>
            ))}
          </div>

          {/* Right Side - Login/Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {!creator ? (
              <div className="relative">
                <motion.button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Login
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    animate={{ rotate: dropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </motion.svg>
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className="absolute top-full right-0 mt-2 w-48 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-glass p-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        to="/creator"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Creator Login
                      </Link>
                      <Link
                        to="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        User Login
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative">
                <motion.button
                  className="glass-button flex items-center gap-3"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-mid to-purple-bright flex items-center justify-center text-white font-bold text-sm"
                    whileHover={{ rotate: 5 }}
                  >
                    {creator.firstName?.[0]}{creator.lastName?.[0]}
                  </motion.div>
                  <span className="text-white">{creator.firstName} {creator.lastName}</span>
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    animate={{ rotate: dropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </motion.svg>
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className="absolute top-full right-0 mt-2 w-56 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-glass p-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
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
                      <motion.button
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all duration-200"
                        onClick={handleLogout}
                        whileHover={{ x: 5 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col space-y-4">
                {['Features', 'Learn', 'Explore', 'Trending', 'Contact'].map((item) => (
                  <NavLink
                    key={item}
                    to={`/${item.toLowerCase()}`}
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    {item}
                  </NavLink>
                ))}

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
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </FloatingNavbar>
  );
}