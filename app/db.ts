// Firebase database functions
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from 'lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export async function getUser(email: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', email));
    return userDoc.exists() ? [userDoc.data()] : [];
  } catch (error) {
    console.error('Error getting user:', error);
    return [];
  }
}

export async function createUser(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', email), {
      email: email,
      uid: user.uid,
      createdAt: new Date().toISOString()
    });
    
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
