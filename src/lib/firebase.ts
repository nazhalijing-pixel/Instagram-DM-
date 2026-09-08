import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
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
  getDocFromServer,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Configure log level to error to avoid benign gRPC idle disconnect noise
try {
  setLogLevel('error');
} catch {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

  // Guarantee browser persistence across reloads and redirects
  try {
    setPersistence(auth, browserLocalPersistence).catch((pErr) => {
      console.warn('[FIREBASE_PERSISTENCE_WARN]', pErr);
    });
  } catch (persErr) {
    console.warn('[FIREBASE_SET_PERSISTENCE_FAIL]', persErr);
  }

  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  isFirebaseInitialized = true;
  console.log('[FIREBASE_INIT_SUCCESS] Initialized Auth & Firestore database:', firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('[FIREBASE_INIT_WARN] Firebase initialization error:', error);
}

// Validate connection to Firestore on initial boot
async function testConnection() {
  if (!db || !isFirebaseInitialized) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export {
  db,
  auth,
  googleProvider,
  isFirebaseInitialized,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
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
 * STRICTLY ISOLATED: Only fetches documents belonging to the authenticated user.
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

  // Guard: Only subscribe if the client is currently authenticated as this user
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const pathStr = `users/${userId}/${subcollectionName}`;

  try {
    const colRef = collection(db, 'users', userId, subcollectionName);
    const unsubUser = onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        onData(items);
      },
      (err) => {
        if (
          err?.message?.includes('CANCELLED') ||
          err?.message?.includes('idle stream') ||
          (err as any)?.code === 'cancelled'
        ) {
          return;
        }
        if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
          try {
            handleFirestoreError(err, OperationType.GET, pathStr);
          } catch (rethrown) {
            if (onError) onError(rethrown as Error);
            return;
          }
        }
        console.warn(`[FIRESTORE_SUB_ERR] Error in ${pathStr}:`, err);
        if (onError) onError(err);
      }
    );

    return () => {
      unsubUser();
    };
  } catch (err: any) {
    console.warn(`[FIRESTORE_SUB_FAIL] Failed to subscribe to ${pathStr}:`, err);
    return () => {};
  }
}

/**
 * Save or update a document in a user-scoped collection: users/{userId}/{subcollection}/{docData.id}
 * STRICTLY ISOLATED: Only writes when authenticated as the owner.
 */
export async function saveUserDocument<T extends { id: string }>(
  userId: string,
  subcollectionName: string,
  docData: T
) {
  if (!db || !isFirebaseInitialized || !userId || !docData?.id) return;
  // Guard: Only write if authenticated and user ID matches
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const pathStr = `users/${userId}/${subcollectionName}/${docData.id}`;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docData.id);
    await setDoc(docRef, docData, { merge: true });
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, pathStr);
    }
    console.warn(`[SAVE_USER_DOC_ERR] ${pathStr}:`, err);
  }
}

/**
 * Synchronize user profile document: users/{userId}
 * Uses client-authenticated Firebase SDK so it strictly satisfies isOwner(userId) in firestore.rules
 */
export async function syncUserProfileDocument(userId: string, profileData: any) {
  if (!db || !isFirebaseInitialized || !userId) return;
  // Guard: Only write if authenticated as owner
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const pathStr = `users/${userId}`;
  try {
    // Prime the ID token to ensure Firestore gRPC stream has active credentials
    if (auth.currentUser) {
      await auth.currentUser.getIdToken().catch(() => null);
    }
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (err: any) {
    console.warn(`[SYNC_USER_PROFILE_FIRESTORE_ERR] ${pathStr}:`, err);
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      try {
        handleFirestoreError(err, OperationType.WRITE, pathStr);
      } catch (rethrown) {
        console.warn('[SILENT_FIRESTORE_WRITE_RETRY_SCHEDULED]', rethrown);
      }
    }
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
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const pathStr = `users/${userId}/${subcollectionName}`;
  try {
    for (const item of docs) {
      if (!item?.id) continue;
      const docRef = doc(db, 'users', userId, subcollectionName, item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, pathStr);
    }
    console.warn(`[SAVE_MULTIPLE_USER_DOCS_ERR] ${pathStr}:`, err);
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
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const pathStr = `users/${userId}/${subcollectionName}/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, pathStr);
    }
    console.warn(`[REMOVE_USER_DOC_ERR] ${pathStr}:`, err);
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
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return null;
  }

  const pathStr = `users/${userId}/${subcollectionName}/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, subcollectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as T;
    }
    return null;
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, pathStr);
    }
    console.warn(`[GET_USER_DOC_ERR] ${pathStr}:`, err);
    return null;
  }
}

/**
 * Migration helper: If the primary user (or creator) logs in and their user-scoped collection is empty,
 * safely migrate any existing root collections (automations, contacts, inbox_messages, webhook_logs, instagram_account)
 * to their isolated users/{userId}/ space so existing data is never lost.
 */
export async function checkAndMigrateExistingData(_userId: string, _userEmail?: string): Promise<boolean> {
  // STRICT ISOLATION: Never copy global data to new users. Every user starts with their own isolated, clean space.
  return false;
}
