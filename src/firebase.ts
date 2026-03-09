import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDx2eR5q2q3-7Cnj495A4jDXcrMVSQVnVs",
    authDomain: "pawsley-ios-app.firebaseapp.com",
    projectId: "pawsley-ios-app",
    storageBucket: "pawsley-ios-app.firebasestorage.app",
    messagingSenderId: "240797134654",
    appId: "1:240797134654:web:a26ea84e0652bd50af466f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
