// Session cookie utilities for authentication tracking
const SESSION_COOKIE_NAME = 'creator_session';
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Set session cookie with creator data
export const setCreatorSession = (creatorData) => {
  const sessionData = {
    ...creatorData,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  const cookieValue = btoa(JSON.stringify(sessionData));
  document.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}; path=/; max-age=${SESSION_DURATION / 1000}; secure; samesite=strict`;
};

// Get session cookie and validate expiration
export const getCreatorSession = () => {
  try {
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`)
    );
    
    if (!sessionCookie) {
      return null;
    }
    
    const cookieValue = sessionCookie.split('=')[1];
    const sessionData = JSON.parse(atob(cookieValue));
    
    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      clearCreatorSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error reading session cookie:', error);
    clearCreatorSession();
    return null;
  }
};

// Clear session cookie
export const clearCreatorSession = () => {
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// Check if creator is authenticated
export const isCreatorAuthenticated = () => {
  const session = getCreatorSession();
  return session !== null;
};

// Get remaining session time in minutes
export const getSessionTimeRemaining = () => {
  const session = getCreatorSession();
  if (!session) return 0;
  
  const remaining = session.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / (60 * 1000)));
};

// Extend session (refresh expiration)
export const extendCreatorSession = (creatorData) => {
  if (isCreatorAuthenticated()) {
    setCreatorSession(creatorData);
  }
};
