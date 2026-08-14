import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let db: Firestore | null = null;
let isFirebaseInitialized = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (firebaseConfig.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
  isFirebaseInitialized = true;
  console.log('Firebase initialized successfully with database:', firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('Firebase initialization error, falling back to local storage:', error);
}

export { db, isFirebaseInitialized };

/**
 * Generic helper to subscribe to a Firestore collection with real-time updates
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  if (!db || !isFirebaseInitialized) {
    return () => {};
  }

  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        onData(items);
      },
      (err) => {
        console.warn(`Firestore snapshot error for ${collectionName}:`, err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn(`Failed to subscribe to ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Save or update a document in a Firestore collection
 */
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  docData: T
) {
  if (!db || !isFirebaseInitialized) return;
  try {
    const docRef = doc(db, collectionName, docData.id);
    await setDoc(docRef, docData, { merge: true });
  } catch (err) {
    console.warn(`Error saving document to ${collectionName}:`, err);
  }
}

/**
 * Save multiple documents in a Firestore collection
 */
export async function saveMultipleDocuments<T extends { id: string }>(
  collectionName: string,
  docs: T[]
) {
  if (!db || !isFirebaseInitialized) return;
  try {
    for (const item of docs) {
      const docRef = doc(db, collectionName, item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (err) {
    console.warn(`Error batch saving documents to ${collectionName}:`, err);
  }
}

/**
 * Delete a document from a Firestore collection
 */
export async function removeDocument(collectionName: string, docId: string) {
  if (!db || !isFirebaseInitialized) return;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Error deleting document from ${collectionName}:`, err);
  }
}
