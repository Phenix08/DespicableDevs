import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Import FirebaseUI
import * as firebaseui from 'https://www.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth.js';

// Your Firebase Configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "despicable-devs",
  storageBucket: "despicable-devs.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

// UI Elements
const loggedInView = document.getElementById('logged-in-view');
const userNameSpan = document.getElementById('userName');
const userUidSpan = document.getElementById('userUid');
const authMessage = document.getElementById('authMessage');

// --- FirebaseUI Setup ---
// Initialize the FirebaseUI Widget
const ui = new firebaseui.auth.AuthUI(auth);

// Configure FirebaseUI (focusing on Email/Password for simplicity in extensions)
const uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      // User successfully signed in.
      // This callback is called after the user has been signed in by Firebase.
      // The `user` object will be available via onAuthStateChanged.
      authMessage.textContent = "Signed in successfully!";
      // Returning false prevents FirebaseUI from redirecting or closing the popup immediately,
      // allowing our onAuthStateChanged listener to handle UI updates.
      return false;
    },
    uiShown: function() {
      // The FirebaseUI widget is rendered. Hide the loader if you have one.
      authMessage.textContent = ""; // Clear any previous messages when UI is shown
    }
  },

  signInFlow: 'popup',
  signInOptions: [
    EmailAuthProvider.PROVIDER_ID, // Enable Email/Password Sign-in
  ]
};

// --- Firebase Authentication Methods ---

// Sign Out
document.getElementById('signOut').addEventListener('click', async () => {
    authMessage.textContent = "";
    try {
        await signOut(auth);
        authMessage.textContent = "Signed out successfully.";
    } catch (error) {
        authMessage.textContent = `Error: ${error.message}`;
        console.error("Sign Out Error:", error);
    }
});

// --- UI Update Logic ---
function updateUI(user) {
    if (user) {
        // User is signed in
        document.getElementById('firebaseui-auth-container').style.display = 'none'; // Hide FirebaseUI
        loggedInView.style.display = 'block';
        userNameSpan.textContent = user.displayName || user.email || 'Anonymous';
        userUidSpan.textContent = user.uid;
    } else {
        // User is signed out
        document.getElementById('firebaseui-auth-container').style.display = 'block'; // Show FirebaseUI
        loggedInView.style.display = 'none';
        userNameSpan.textContent = '';
        userUidSpan.textContent = '';
        // Start FirebaseUI only when user is logged out
        ui.start('#firebaseui-auth-container', uiConfig);
    }
}

// --- Firebase Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
    updateUI(user); // Update UI first
    if (user) {
        // Automatically save/update user profile in Firestore when state changes to logged in
        await saveUserProfileToFirestore(user);
    }
});

// --- Firestore Integration (for user profiles) ---
async function saveUserProfileToFirestore(user) {
    if (user) {
        const userRef = doc(db, "users", user.uid); // Reference to user's document in 'users' collection
        try {
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastSignInTime: user.metadata.lastSignInTime,
                creationTime: user.metadata.creationTime
            }, { merge: true }); // Merge: true to update existing fields and add new ones
            console.log("User profile saved/updated in Firestore for UID:", user.uid);
        } catch (error) {
            console.error("Error saving user profile to Firestore:", error);
        }
    }
}