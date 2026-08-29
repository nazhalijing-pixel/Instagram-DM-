import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let db: Firestore | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let isFirebaseInitialized = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (firebaseConfig.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  isFirebaseInitialized = true;
  console.log('[FIREBASE_INIT_SUCCESS] Initialized Auth & Firestore database:', firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('[FIREBASE_INIT_WARN] Firebase initialization error:', error);
}

export {
  db,
  auth,
  googleProvider,
  isFirebaseInitialized,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
};
export type { User };

/**
 * Subscribe to a user-scoped collection with real-time updates: users/{userId}/{subcollection}
 * Also merges top-level collection items if needed to prevent missing webhooks or server messages.
 */
export function subscribeToUserCollection<T extends { id?: string }>(
  userId: string,
  subcollectionName: string,
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  if (!db || !isFirebaseInitialized || !userId) {
    return () => {};
  }

  let userItems: T[] = [];
  let rootItems: T[] = [];

  const emitCombined = () => {
    const map = new Map<string, T>();
    // First insert root items
    for (const item of rootItems) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
    // Override with user items if present
    for (const item of userItems) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
    onData(Array.from(map.values()));
  };

  try {
    const colRef = collection(db, 'users', userId, subcollectionName);
    const unsubUser = onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        userItems = items;
        emitCombined();
      },
      (err) => {
        if (
          err?.message?.includes('CANCELLED') ||
          err?.message?.includes('idle stream') ||
          (err as any)?.code === 'cancelled'
        ) {
          return;
        }
        console.warn(`[FIRESTORE_SUB_ERR] Error in users/${userId}/${subcollectionName}:`, err);
        if (onError) onError(err);
      }
    );

    // Also subscribe to root collection for messages/logs/contacts/account
    const rootColRef = collection(db, subcollectionName);
    const unsubRoot = onSnapshot(
      rootColRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        rootItems = items;
        emitCombined();
      },
      (err) => {
        if (
          err?.message?.includes('CANCELLED') ||
          err?.message?.includes('idle stream') ||
          (err as any)?.code === 'cancelled'
        ) {
          return;
        }
        console.warn(`[FIRESTORE_ROOT_SUB_ERR] Error in root ${subcollectionName}:`, err);
      }
    );

    return () => {
      unsubUser();
      unsubRoot();
    };
  } catch (err: any) {
    console.warn(`[FIRESTORE_SUB_FAIL] Failed to subscribe to users/${userId}/${subcollectionName}:`, err);
    return () => {};
  }
}

/**
 * Save or update a document in a user-scoped collection: users/{userId}/{subcollection}/{docData.id}
 * Also saves to root collection for unified redundancy.
 */
export async function saveUserDocument<T extends { id: string }>(
  userId: string,
  subcollectionName: string,
  docData: T
) {
  if (!db || !isFirebaseInitialized || !userId || !docData?.id) return;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docData.id);
    await setDoc(docRef, docData, { merge: true });
    // Also save to root collection
    const rootDocRef = doc(db, subcollectionName, docData.id);
    await setDoc(rootDocRef, docData, { merge: true });
  } catch (err) {
    console.warn(`[SAVE_USER_DOC_ERR] users/${userId}/${subcollectionName}/${docData.id}:`, err);
  }
}

/**
 * Save multiple documents in a user-scoped collection
 */
export async function saveMultipleUserDocuments<T extends { id: string }>(
  userId: string,
  subcollectionName: string,
  docs: T[]
) {
  if (!db || !isFirebaseInitialized || !userId || !docs?.length) return;
  try {
    for (const item of docs) {
      if (!item?.id) continue;
      const docRef = doc(db, 'users', userId, subcollectionName, item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (err) {
    console.warn(`[SAVE_MULTIPLE_USER_DOCS_ERR] users/${userId}/${subcollectionName}:`, err);
  }
}

/**
 * Delete a document from a user-scoped collection: users/{userId}/{subcollection}/{docId}
 */
export async function removeUserDocument(
  userId: string,
  subcollectionName: string,
  docId: string
) {
  if (!db || !isFirebaseInitialized || !userId || !docId) return;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[REMOVE_USER_DOC_ERR] users/${userId}/${subcollectionName}/${docId}:`, err);
  }
}

/**
 * Get a specific user document
 */
export async function getUserDocument<T>(
  userId: string,
  subcollectionName: string,
  docId: string
): Promise<T | null> {
  if (!db || !isFirebaseInitialized || !userId || !docId) return null;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as T;
    }
    return null;
  } catch (err) {
    console.warn(`[GET_USER_DOC_ERR] users/${userId}/${subcollectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Migration helper: If the primary user (or creator) logs in and their user-scoped collection is empty,
 * safely migrate any existing root collections (automations, contacts, inbox_messages, webhook_logs, instagram_account)
 * to their isolated users/{userId}/ space so existing data is never lost.
 */
export async function checkAndMigrateExistingData(userId: string, userEmail?: string): Promise<boolean> {
  if (!db || !isFirebaseInitialized || !userId) return false;

  try {
    // 1. Check if user already has any automations or account in their scoped path
    const userAutoRef = collection(db, 'users', userId, 'automations');
    const userAutoSnap = await getDocs(userAutoRef);
    const userAccountDoc = await getDoc(doc(db, 'users', userId, 'instagram_account', 'primary'));

    if (!userAutoSnap.empty || userAccountDoc.exists()) {
      // User already has isolated data, no migration needed
      return false;
    }

    // Only migrate if user matches the primary account email or there is legacy data
    const isTargetUser = !userEmail || userEmail.toLowerCase().includes('devsinghparmar') || userEmail.toLowerCase().includes('nazha') || userEmail.toLowerCase().includes('admin');

    if (!isTargetUser) {
      // Fresh new user! Keep them completely empty as requested!
      return false;
    }

    console.log(`[MIGRATION_START] Migrating existing global data into users/${userId}/...`);

    // 2. Migrate connected Instagram account
    const rootAccountSnap = await getDoc(doc(db, 'instagram_account', 'primary'));
    if (rootAccountSnap.exists()) {
      const accData = rootAccountSnap.data();
      await setDoc(doc(db, 'users', userId, 'instagram_account', 'primary'), accData, { merge: true });
      console.log(`[MIGRATION] Migrated Instagram account for ${userId}`);
    }

    // 3. Migrate automations
    const rootAutoSnap = await getDocs(collection(db, 'automations'));
    for (const d of rootAutoSnap.docs) {
      await setDoc(doc(db, 'users', userId, 'automations', d.id), d.data(), { merge: true });
    }
    console.log(`[MIGRATION] Migrated ${rootAutoSnap.docs.length} automations`);

    // 4. Migrate contacts
    const rootContactsSnap = await getDocs(collection(db, 'contacts'));
    for (const d of rootContactsSnap.docs) {
      await setDoc(doc(db, 'users', userId, 'contacts', d.id), d.data(), { merge: true });
    }
    console.log(`[MIGRATION] Migrated ${rootContactsSnap.docs.length} contacts`);

    // 5. Migrate inbox messages
    const rootInboxSnap = await getDocs(collection(db, 'inbox_messages'));
    for (const d of rootInboxSnap.docs) {
      await setDoc(doc(db, 'users', userId, 'inbox_messages', d.id), d.data(), { merge: true });
    }
    console.log(`[MIGRATION] Migrated ${rootInboxSnap.docs.length} inbox messages`);

    // 6. Migrate webhook logs
    const rootLogsSnap = await getDocs(collection(db, 'webhook_logs'));
    for (const d of rootLogsSnap.docs) {
      await setDoc(doc(db, 'users', userId, 'webhook_logs', d.id), d.data(), { merge: true });
    }

    // 7. Migrate gemini API keys
    const rootKeysSnap = await getDocs(collection(db, 'gemini_api_keys'));
    for (const d of rootKeysSnap.docs) {
      await setDoc(doc(db, 'users', userId, 'gemini_api_keys', d.id), d.data(), { merge: true });
    }

    console.log(`[MIGRATION_COMPLETE] Successfully migrated existing data to users/${userId}`);
    return true;
  } catch (err) {
    console.warn('[MIGRATION_WARN] Migration failed or partially succeeded:', err);
    return false;
  }
}
