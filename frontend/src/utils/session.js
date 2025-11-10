// Session storage utilities for authentication tracking
const SESSION_COOKIE_NAME = 'creator_session';
const PRINTIFY_VARIANTS_COOKIE_NAME = 'printify_variants'; // Note: stored in sessionStorage, not cookies
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Set session cookie with creator data
export const setCreatorSession = (creatorData) => {
  const sessionData = {
    ...creatorData,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  const cookieValue = btoa(JSON.stringify(sessionData));
  
  // Only use 'secure' flag in production (HTTPS), not in development (HTTP localhost)
  const isProduction = window.location.protocol === 'https:';
  const secureFlag = isProduction ? '; secure' : '';
  
  document.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}; path=/; max-age=${SESSION_DURATION / 1000}${secureFlag}; samesite=strict`;
  
  // Dispatch custom event to notify components of session change
  window.dispatchEvent(new CustomEvent('creatorSessionChanged', { detail: sessionData }));
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
  
  // Dispatch custom event to notify components of session change
  window.dispatchEvent(new CustomEvent('creatorSessionChanged', { detail: null }));
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

// Set Printify variants data in sessionStorage (cookies are too small for large data)
export const setPrintifyVariants = (variantsData) => {
  const sessionData = {
    data: variantsData,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  try {
    // Use sessionStorage instead of cookies for large data
    sessionStorage.setItem(PRINTIFY_VARIANTS_COOKIE_NAME, JSON.stringify(sessionData));
    console.log('✅ Printify variants stored in sessionStorage');
    console.log('📦 Data size:', JSON.stringify(sessionData).length, 'bytes');
  } catch (error) {
    console.error('❌ Failed to store Printify variants:', error);
  }
};

// Get Printify variants data from sessionStorage
export const getPrintifyVariants = () => {
  try {
    const storedData = sessionStorage.getItem(PRINTIFY_VARIANTS_COOKIE_NAME);
    
    if (!storedData) {
      return null;
    }
    
    const sessionData = JSON.parse(storedData);
    
    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      clearPrintifyVariants();
      return null;
    }
    
    return sessionData.data;
  } catch (error) {
    console.error('Error reading Printify variants from sessionStorage:', error);
    clearPrintifyVariants();
    return null;
  }
};

// Clear Printify variants from sessionStorage
export const clearPrintifyVariants = () => {
  sessionStorage.removeItem(PRINTIFY_VARIANTS_COOKIE_NAME);
};
