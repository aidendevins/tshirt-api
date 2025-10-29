import { useEffect, useState } from 'react';
import { exchangeCodeForToken, hasValidToken, getAccessToken } from '../services/shopify-oauth';
import { createCreatorCollections } from '../services/shopify-oauth';
import { getCreatorSession } from '../utils/session';

export default function ShopifyOAuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for access token
        setStatus('Exchanging code for access token...');
        await exchangeCodeForToken(code);

        // Get creator data from session
        const creatorData = getCreatorSession();
        if (!creatorData) {
          throw new Error('No creator data found in session');
        }

        // Create Shopify collections
        setStatus('Creating your collections...');
        const collectionResults = await createCreatorCollections(creatorData);
        
        if (collectionResults.allSuccessful) {
          setStatus('Success! Redirecting to your dashboard...');
          
          // Update creator data with collection IDs
          const updatedCreatorData = {
            ...creatorData,
            collections: {
              creatorDesigns: {
                id: collectionResults.creatorCollection.collectionId,
                title: collectionResults.creatorCollection.collectionTitle,
                handle: collectionResults.creatorCollection.collectionHandle
              },
              communityDesigns: {
                id: collectionResults.communityCollection.collectionId,
                title: collectionResults.communityCollection.collectionTitle,
                handle: collectionResults.communityCollection.collectionHandle
              }
            }
          };

          // Update session with collection data
          const { setCreatorSession } = await import('../utils/session');
          setCreatorSession(updatedCreatorData);
          
          // Redirect to creator dashboard
          setTimeout(() => {
            window.location.href = '/creator';
          }, 2000);
        } else {
          setStatus('Collections created with some issues, redirecting...');
          setTimeout(() => {
            window.location.href = '/creator';
          }, 2000);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(error.message);
        setStatus('Error occurred');
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <div className="oauth-callback">
      <div className="callback-container">
        <h2>Shopify Authentication</h2>
        <div className="status">
          {error ? (
            <div className="error">
              <p>❌ {error}</p>
              <button onClick={() => window.location.href = '/creator'}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="success">
              <p>✅ {status}</p>
              {status.includes('Success') && (
                <p>You will be redirected automatically...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
