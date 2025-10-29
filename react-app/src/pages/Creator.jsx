import { useState, useEffect } from 'react';
import CreatorLogin from '../components/CreatorLogin.jsx';
import CreatorDashboard from '../components/CreatorDashboard.jsx';
import { getCreatorSession, isCreatorAuthenticated, logoutCreator } from '../firebase/auth';
import { clearCreatorSession } from '../utils/session';

export default function Creator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on component mount
  useEffect(() => {
    const checkSession = () => {
      try {
        if (isCreatorAuthenticated()) {
          const sessionData = getCreatorSession();
          if (sessionData) {
            setUser(sessionData);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        clearCreatorSession();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutCreator();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if Firebase fails
      clearCreatorSession();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <section className="creator-auth">
        <div className="auth-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="creator-auth">
        <div className="auth-container">
          <CreatorLogin onAuthSuccess={handleAuthSuccess} />
        </div>
      </section>
    );
  }

  return (
    <section className="creator">
      <CreatorDashboard user={user} onLogout={handleLogout} />
    </section>
  );
}


