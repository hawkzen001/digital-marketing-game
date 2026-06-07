import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { initializeAppCheck, CustomProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js";
import { getVertexAI, getGenerativeModel } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-vertexai.js";

// TODO: Replace this with your actual Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA9QPKFkD_FWwF6JkDxVaDSBejtQEKvcz4",
  authDomain: "idemi-dm-gamification.firebaseapp.com",
  projectId: "idemi-dm-gamification",
  storageBucket: "idemi-dm-gamification.firebasestorage.app",
  messagingSenderId: "468188302052",
  appId: "1:468188302052:web:2bcf65834e6c8f8582baf1",
  measurementId: "G-D6HYX2RMTH"
};

let app, auth, db, vertexAI;
let isFirebaseConfigured = false;

// We check if an actual API key is present (not empty and not the placeholder)
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Firebase AI Logic (Vertex AI)
  try {
      vertexAI = getVertexAI(app);
  } catch (e) {
      console.warn("Vertex AI initialization failed. Please ensure it is enabled in Firebase Console.", e);
  }

  isFirebaseConfigured = true;
  console.log("Firebase initialized successfully");
} else {
  console.warn("Firebase is not configured! Falling back to LocalStorage mock for prototype testing.");
}

export { firebaseConfig, initializeApp, getAuth, auth, db, vertexAI, getGenerativeModel, isFirebaseConfigured, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, limit, addDoc };
