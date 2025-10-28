import { useState } from 'react';
import CreatorLogin from '../components/CreatorLogin.jsx';
import CreatorDashboard from '../components/CreatorDashboard.jsx';

export default function Creator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Handle successful authentication
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

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


