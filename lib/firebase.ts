// lib/firebase.ts
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyB3T8X5QNU5iYG89u5XWyGhrIdKjnb2be0",
  authDomain: "fase-site.firebaseapp.com",
  projectId: "fase-site",
  storageBucket: "fase-site.appspot.com",  // Note: typo in yours (see below)
  messagingSenderId: "1031442839092",
  appId: "1:1031442839092:web:57238d8824182cbbda7c61",
  measurementId: "G-MPQWL4XJYH"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

export { app }
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

