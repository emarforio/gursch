import { create } from 'zustand'
import { DEFAULT_CONFIG } from '../domain/types'
import { firebaseConfigured } from './config'
import type { CloudRepository, User } from './firebase'
import { createLocalRepo } from './localRepo'
import type { Data, Repository } from './repository'

type Store = Data & {
  /** The active storage: this device when signed out, the account when signed in. */
  repo: Repository
  user: User | null
  /** True until the active storage has delivered its data. */
  loading: boolean
  /** A message from the sync service, or SYNC_UNREACHABLE. */
  syncError: string | null
}

/** Value of syncError when the sync service could not be loaded at all. The UI holds the wording. */
export const SYNC_UNREACHABLE = 'unreachable'

/** Remembers that this device was signed in, so startup waits for the account instead of flashing local data. */
const SIGNED_IN_KEY = 'gursch.v1.signedIn'

export const localRepo = createLocalRepo()

function flag(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === '1'
  } catch {
    return false
  }
}

function setFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_IN_KEY, '1')
    else localStorage.removeItem(SIGNED_IN_KEY)
  } catch {
    // Not essential.
  }
}

export const useStore = create<Store>(() => ({
  players: [],
  sessions: [],
  settings: { defaultConfig: DEFAULT_CONFIG },
  repo: localRepo,
  user: null,
  loading: true,
  syncError: null,
}))

let stop: () => void = () => {}
let cloud: CloudRepository | null = null

function activate(repo: Repository) {
  stop()
  useStore.setState({ repo, loading: true })
  stop = repo.subscribe((data) => useStore.setState({ ...data, loading: false }))
}

function useLocal() {
  cloud?.close()
  cloud = null
  activate(localRepo)
}

const firebase = () => import('./firebase')

async function startAuth() {
  try {
    const fb = await firebase()
    fb.watchUser((user) => {
      useStore.setState({ user, syncError: null })
      setFlag(user !== null)
      if (!user) return useLocal()
      cloud?.close()
      cloud = fb.createFirestoreRepo(user.uid, (message) => useStore.setState({ syncError: message }))
      activate(cloud)
    })
  } catch {
    useStore.setState({ syncError: SYNC_UNREACHABLE })
    useLocal()
  }
}

if (firebaseConfigured) {
  // Show local data straight away unless this device was signed in last time.
  if (!flag()) activate(localRepo)
  void startAuth()
} else {
  activate(localRepo)
}

export async function signIn() {
  await (await firebase()).signIn()
}

export async function signOut() {
  await (await firebase()).signOut()
}

/** Reads a repository's current data once. */
export function snapshotOf(repo: Repository): Data | null {
  let data: Data | null = null
  repo.subscribe((d) => (data = d))()
  return data
}

export const newId = () => crypto.randomUUID()
