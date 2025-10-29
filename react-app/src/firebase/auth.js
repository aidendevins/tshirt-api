import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { setCreatorSession, clearCreatorSession } from '../utils/session';
import { createCreatorCollections } from '../services/shopify-admin';

// Password strength validation
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get password strength score (0-4)
export const getPasswordStrength = (password) => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  
  return score;
};

// Creator signup
export const signupCreator = async (email, password, userData) => {
  try {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join('. '));
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Save additional user data to Firestore
    const creatorData = {
      uid: user.uid,
      email: user.email,
      businessName: userData.businessName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: 'creator',
      createdAt: new Date(),
      emailVerified: false,
      collections: {
        creatorDesigns: null, // Will be set when Shopify collections are created
        communityDesigns: null
      }
    };

    await setDoc(doc(db, 'creators', user.uid), creatorData);

    // Set session first, then create collections automatically
    setCreatorSession(creatorData);
    
    // Check if we have valid Shopify configuration
    if (!import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN || !import.meta.env.VITE_SHOPIFY_STORE_URL) {
      console.warn('Shopify Admin API configuration missing, skipping collection creation');
      return {
        user: user,
        creatorData: creatorData,
        collectionsCreated: false,
        collectionError: 'Shopify Admin API configuration missing'
      };
    }
    
    // Create collections automatically using Admin API
    try {
      console.log('Creating Shopify collections for new creator...');
      const collectionResults = await createCreatorCollections(creatorData);
      
      if (collectionResults.allSuccessful) {
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

        // Update Firestore with collection IDs
        await updateDoc(doc(db, 'creators', user.uid), {
          collections: updatedCreatorData.collections
        });

        console.log('Successfully created Shopify collections and updated creator data');
        
        // Set session with updated data
        setCreatorSession(updatedCreatorData);
        
        return {
          user: user,
          creatorData: updatedCreatorData,
          collectionsCreated: true
        };
      } else {
        console.warn('Failed to create some Shopify collections, but creator account was created');
        // Still set session even if collections failed
        setCreatorSession(creatorData);
        
        return {
          user: user,
          creatorData: creatorData,
          collectionsCreated: false,
          collectionErrors: {
            creator: collectionResults.creatorCollection.error,
            community: collectionResults.communityCollection.error
          }
        };
      }
    } catch (error) {
      console.error('Error creating Shopify collections:', error);
      // Don't fail the signup if Shopify fails
      setCreatorSession(creatorData);
      
      return {
        user: user,
        creatorData: creatorData,
        collectionsCreated: false,
        collectionError: error.message
      };
    }

  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Creator login
export const loginCreator = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get creator data from Firestore
    const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
    
    if (!creatorDoc.exists()) {
      throw new Error('Creator account not found. Please contact support.');
    }

    const creatorData = creatorDoc.data();

    // Set session cookie
    setCreatorSession(creatorData);

    return {
      user: user,
      creatorData: creatorData
    };

  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Logout
export const logoutCreator = async () => {
  try {
    await signOut(auth);
    clearCreatorSession();
  } catch (error) {
    throw new Error('Failed to logout. Please try again.');
  }
};

// Password reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Get user-friendly error messages
const getFirebaseErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Re-export session functions for convenience
export { getCreatorSession, isCreatorAuthenticated } from '../utils/session';
