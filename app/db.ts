// Firebase database functions
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from 'lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export async function getUser(email: string) {
  try {
    const userDoc = await getDoc(doc(db, 'accounts', email));
    return userDoc.exists() ? [userDoc.data()] : [];
  } catch (error) {
    console.error('Error getting user:', error);
    return [];
  }
}

// Account creation function removed - accounts are only created after payment via createAccountAndMembership
