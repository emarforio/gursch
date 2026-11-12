/**
 * Everything that imports the Firebase SDK lives here and is loaded with a
 * dynamic import, so the SDK is only downloaded when a project is configured.
 */
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { DEFAULT_CONFIG } from '../domain/types'
import type { Player, Session } from '../domain/types'
import { firebaseOptions } from './config'
import type { Data, Repository, Settings } from './repository'

const app = initializeApp(firebaseOptions)
const auth = getAuth(app)
const db = initializeFirestore(app, {
  // Keeps a copy on the device so the app works offline and syncs later.
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

export type User = { uid: string; name: string; email: string; photo?: string }

export function watchUser(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (u) =>
    cb(
      u && {
        uid: u.uid,
        name: u.displayName ?? u.email ?? '',
        email: u.email ?? '',
        ...(u.photoURL ? { photo: u.photoURL } : {}),
      },
    ),
  )
}

export async function signIn(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

/**
 * Follows one session live, for the read-only shared view. Works without
 * signing in when the session is shared. Calls back with null when the session
 * does not exist or is not shared.
 */
export function watchSession(id: string, cb: (session: Session | null) => void, onError: () => void): () => void {
  return onSnapshot(
    doc(db, 'sessions', id),
    (snap) => cb(snap.exists() ? (snap.data() as Session) : null),
    (e) => (e.code === 'permission-denied' ? cb(null) : onError()),
  )
}

export type CloudRepository = Repository & { close(): void }

/**
 * Firestore layout:
 *   users/{uid}                  settings
 *   users/{uid}/players/{id}     saved players
 *   sessions/{id}                sessions, with ownerUid
 */
export function createFirestoreRepo(uid: string, onError: (message: string) => void): CloudRepository {
  let players: Player[] | null = null
  let sessions: Session[] | null = null
  let settings: Settings | null = null
  const listeners = new Set<(d: Data) => void>()

  const emit = () => {
    if (!players || !sessions || !settings) return
    const data = { players, sessions, settings }
    listeners.forEach((cb) => cb(data))
  }
  const fail = (e: Error) => onError(e.message)
  const write = (p: Promise<unknown>) => void p.catch(fail)

  const userDoc = doc(db, 'users', uid)
  const playersCol = collection(db, 'users', uid, 'players')
  const sessionsCol = collection(db, 'sessions')

  const unsubscribe = [
    onSnapshot(
      userDoc,
      (snap) => {
        settings = { defaultConfig: DEFAULT_CONFIG, ...(snap.data() as Partial<Settings> | undefined) }
        emit()
      },
      fail,
    ),
    onSnapshot(
      playersCol,
      (snap) => {
        players = snap.docs.map((d) => d.data() as Player).sort((a, b) => a.createdAt - b.createdAt)
        emit()
      },
      fail,
    ),
    onSnapshot(
      query(sessionsCol, where('ownerUid', '==', uid)),
      (snap) => {
        sessions = snap.docs.map((d) => d.data() as Session).sort((a, b) => a.createdAt - b.createdAt)
        emit()
      },
      fail,
    ),
  ]

  return {
    subscribe(cb) {
      listeners.add(cb)
      if (players && sessions && settings) cb({ players, sessions, settings })
      return () => listeners.delete(cb)
    },
    // setDoc without merge replaces the document, so removed optional fields really disappear.
    savePlayer: (p) => write(setDoc(doc(playersCol, p.id), p)),
    deletePlayer: (id) => write(deleteDoc(doc(playersCol, id))),
    saveSession: (s) => write(setDoc(doc(sessionsCol, s.id), { ...s, ownerUid: uid })),
    deleteSession: (id) => write(deleteDoc(doc(sessionsCol, id))),
    saveSettings: (s) => write(setDoc(userDoc, s)),
    close() {
      unsubscribe.forEach((off) => off())
      listeners.clear()
    },
  }
}
