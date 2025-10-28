# Firebase Integration Guide

## Setup Instructions

1. **Install Firebase SDK:**
```bash
cd react-app
npm install firebase
```

2. **Create Firebase Project:**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Enable Authentication
- Add your domain to authorized domains

3. **Get Firebase Config:**
- Go to Project Settings > General
- Add a web app and copy the config object

4. **Create Firebase Config File:**
Create `react-app/src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config object here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

## Integration Points

### Replace Simulated Auth in CreatorLogin.jsx

Replace the `simulateAuthCall` function with actual Firebase calls:

```javascript
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// For Login
const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// For Signup
const signupUser = async (email, password, userData) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Save additional user data to Firestore
  await setDoc(doc(db, 'creators', userCredential.user.uid), {
    email: userCredential.user.email,
    businessName: userData.businessName,
    firstName: userData.firstName,
    lastName: userData.lastName,
    createdAt: new Date(),
    role: 'creator'
  });
  
  return userCredential.user;
};
```

### Update handleSubmit Function

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;

  setIsLoading(true);
  setAuthError('');

  try {
    let user;
    
    if (isLogin) {
      user = await loginUser(formData.email, formData.password);
    } else {
      user = await signupUser(formData.email, formData.password, {
        businessName: formData.businessName,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
    }
    
    onAuthSuccess({
      uid: user.uid,
      email: user.email,
      businessName: formData.businessName,
      firstName: formData.firstName,
      lastName: formData.lastName
    });

  } catch (error) {
    setAuthError(getFirebaseErrorMessage(error.code));
  } finally {
    setIsLoading(false);
  }
};

// Helper function for user-friendly error messages
const getFirebaseErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    default:
      return 'Authentication failed. Please try again.';
  }
};
```

## Additional Features to Add

1. **Password Reset:**
```javascript
import { sendPasswordResetEmail } from 'firebase/auth';

const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};
```

2. **Email Verification:**
```javascript
import { sendEmailVerification } from 'firebase/auth';

const verifyEmail = async (user) => {
  await sendEmailVerification(user);
};
```

3. **Persistent Auth State:**
```javascript
import { onAuthStateChanged } from 'firebase/auth';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      setUser(user);
      setIsAuthenticated(true);
    } else {
      // User is signed out
      setUser(null);
      setIsAuthenticated(false);
    }
  });

  return () => unsubscribe();
}, []);
```

## Security Rules (Firestore)

Add these rules to your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /creators/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
