import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { getFirebaseProClient } from './firebase-pro-client'

export const FIREBASE_WORKSPACES_COLLECTION = 'libreDiaNetProWorkspaces'
export const FIREBASE_INVITES_COLLECTION = 'libreDiaNetProWorkspaceInvites'
export const FIREBASE_USERS_COLLECTION = 'libreDiaNetProUsers'

export type FirebaseProUser = {
  uid: string
  displayName: string | null
  email: string
  photoURL: string | null
}

export type FirebaseWorkspaceRole = 'owner' | 'editor'

export type FirebaseWorkspaceAccess = {
  workspaceId: string
  workspaceName: string
  role: FirebaseWorkspaceRole
}

export type FirebaseWorkspaceSummary = FirebaseWorkspaceAccess

export type FirebaseWorkspaceMember = {
  uid: string
  displayName: string | null
  email: string
  role: FirebaseWorkspaceRole
}

type WorkspaceDocument = {
  name: string
  ownerUid: string
}

type MemberDocument = FirebaseWorkspaceMember & {
  workspaceId: string
  inviteToken?: string
}

type InviteDocument = {
  workspaceId: string
  workspaceName: string
  email: string
  role: 'editor'
  invitedByUid: string
  expiresAt: Timestamp
}

type UserWorkspaceDocument = FirebaseWorkspaceSummary

export async function getCurrentFirebaseProUser(): Promise<FirebaseProUser | null> {
  const { auth } = getFirebaseProClient()
  await auth.authStateReady()
  return auth.currentUser ? toUserSummary(auth.currentUser) : null
}

export function subscribeFirebaseProUser(listener: (user: FirebaseProUser | null) => void): () => void {
  const { auth } = getFirebaseProClient()
  return onAuthStateChanged(auth, (user) => {
    listener(user?.email && user.emailVerified ? toUserSummary(user) : null)
  })
}

export async function signOutFirebaseProUser(): Promise<void> {
  await signOut(getFirebaseProClient().auth)
}

export async function ensureFirebaseWorkspace(workspaceId: string, workspaceName: string): Promise<FirebaseWorkspaceAccess> {
  validateWorkspaceId(workspaceId)
  const user = await requireUser()
  const name = workspaceName.trim() || 'LibreDiaNet Pro'
  if (name.length > 80) {
    throw new Error('Workspace name must be 80 characters or fewer')
  }
  const { firestore } = getFirebaseProClient()
  const workspaceReference = doc(firestore, FIREBASE_WORKSPACES_COLLECTION, workspaceId)
  const memberReference = doc(workspaceReference, 'members', user.uid)

  const memberSnapshot = await getDoc(memberReference)
  if (memberSnapshot.exists()) {
    return requireFirebaseWorkspaceAccess(workspaceId)
  }

  const batch = writeBatch(firestore)
  batch.set(workspaceReference, {
    name,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(memberReference, {
    workspaceId,
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    role: 'owner',
    joinedAt: serverTimestamp(),
  })
  batch.set(doc(firestore, FIREBASE_USERS_COLLECTION, user.uid, 'workspaces', workspaceId), {
    workspaceId,
    workspaceName: name,
    role: 'owner',
    addedAt: serverTimestamp(),
  })
  try {
    await batch.commit()
  } catch (error) {
    throw new Error('Workspace ID がすでに使用されているか、作成権限がありません', { cause: error })
  }
  return { workspaceId, workspaceName: name, role: 'owner' }
}

export async function requireFirebaseWorkspaceAccess(workspaceId: string): Promise<FirebaseWorkspaceAccess> {
  validateWorkspaceId(workspaceId)
  const user = await requireUser()
  const { firestore } = getFirebaseProClient()
  const workspaceReference = doc(firestore, FIREBASE_WORKSPACES_COLLECTION, workspaceId)
  const [workspaceSnapshot, memberSnapshot] = await Promise.all([
    getDoc(workspaceReference),
    getDoc(doc(workspaceReference, 'members', user.uid)),
  ])
  if (!workspaceSnapshot.exists() || !memberSnapshot.exists()) {
    throw new Error('このワークスペースへのアクセス権がありません')
  }
  return workspaceAccess(workspaceId, workspaceSnapshot.data() as WorkspaceDocument, memberSnapshot.data() as MemberDocument)
}

export async function createFirebaseWorkspaceInvite(workspaceId: string, invitedEmail: string): Promise<string> {
  const access = await requireFirebaseWorkspaceAccess(workspaceId)
  if (access.role !== 'owner') {
    throw new Error('招待を作成できるのはオーナーだけです')
  }
  const email = normalizeEmail(invitedEmail)
  const user = await requireUser()
  const token = crypto.randomUUID()
  const { firestore } = getFirebaseProClient()
  const invite: InviteDocument = {
    workspaceId,
    workspaceName: access.workspaceName,
    email,
    role: 'editor',
    invitedByUid: user.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }
  await setDoc(doc(firestore, FIREBASE_INVITES_COLLECTION, token), {
    ...invite,
    createdAt: serverTimestamp(),
  })
  return token
}

export async function acceptFirebaseWorkspaceInvite(token: string): Promise<FirebaseWorkspaceAccess> {
  const normalizedToken = token.trim()
  if (!normalizedToken) {
    throw new Error('招待 token がありません')
  }
  const user = await requireUser()
  const { firestore } = getFirebaseProClient()
  const inviteReference = doc(firestore, FIREBASE_INVITES_COLLECTION, normalizedToken)

  return runTransaction(firestore, async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteReference)
    if (!inviteSnapshot.exists()) {
      throw new Error('招待が見つからないか、すでに使用されています')
    }
    const invite = inviteSnapshot.data() as InviteDocument
    const workspaceReference = doc(firestore, FIREBASE_WORKSPACES_COLLECTION, invite.workspaceId)
    const memberReference = doc(workspaceReference, 'members', user.uid)
    const memberSnapshot = await transaction.get(memberReference)
    if (invite.email !== normalizeEmail(user.email)) {
      throw new Error('この招待は別のメールアドレス宛です')
    }
    if (invite.expiresAt.toMillis() <= Date.now()) {
      throw new Error('招待の有効期限が切れています')
    }
    if (!memberSnapshot.exists()) {
      transaction.set(memberReference, {
        workspaceId: invite.workspaceId,
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        role: invite.role,
        inviteToken: normalizedToken,
        joinedAt: serverTimestamp(),
      })
    }
    const role = memberSnapshot.exists() ? (memberSnapshot.data() as MemberDocument).role : invite.role
    transaction.set(doc(firestore, FIREBASE_USERS_COLLECTION, user.uid, 'workspaces', invite.workspaceId), {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspaceName,
      role,
      addedAt: serverTimestamp(),
    })
    transaction.delete(inviteReference)
    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspaceName,
      role,
    }
  })
}

export async function listFirebaseWorkspaces(): Promise<FirebaseWorkspaceSummary[]> {
  const user = await requireUser()
  const { firestore } = getFirebaseProClient()
  const snapshots = await getDocs(collection(firestore, FIREBASE_USERS_COLLECTION, user.uid, 'workspaces'))
  return snapshots.docs
    .map((snapshot) => snapshot.data() as UserWorkspaceDocument)
    .filter(isFirebaseWorkspaceSummary)
    .sort((left, right) => left.workspaceName.localeCompare(right.workspaceName))
}

export async function listFirebaseWorkspaceMembers(workspaceId: string): Promise<FirebaseWorkspaceMember[]> {
  await requireFirebaseWorkspaceAccess(workspaceId)
  const { firestore } = getFirebaseProClient()
  const snapshots = await getDocs(collection(firestore, FIREBASE_WORKSPACES_COLLECTION, workspaceId, 'members'))
  return snapshots.docs
    .map((snapshot) => snapshot.data() as MemberDocument)
    .map(({ uid, displayName, email, role }) => ({ uid, displayName, email, role }))
    .sort((left, right) => (left.role === right.role ? left.email.localeCompare(right.email) : left.role === 'owner' ? -1 : 1))
}

export function validateWorkspaceId(workspaceId: string): void {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(workspaceId)) {
    throw new Error('Workspace ID は100文字以内の英数字・ハイフン・アンダースコアで指定してください')
  }
}

async function requireUser(): Promise<FirebaseProUser> {
  const user = await getCurrentFirebaseProUser()
  if (!user) {
    throw new Error('Firebase にログインしてください')
  }
  return user
}

function toUserSummary(user: User): FirebaseProUser {
  if (!user.email) {
    throw new Error('メールアドレスを持つ Firebase ユーザーが必要です')
  }
  if (!user.emailVerified) {
    throw new Error('確認済みメールアドレスを持つ Firebase ユーザーが必要です')
  }
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: normalizeEmail(user.email),
    photoURL: user.photoURL,
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@') || normalized.length > 254) {
    throw new Error('有効なメールアドレスを入力してください')
  }
  return normalized
}

function workspaceAccess(workspaceId: string, workspace: WorkspaceDocument, member: MemberDocument): FirebaseWorkspaceAccess {
  return {
    workspaceId,
    workspaceName: workspace.name,
    role: member.role,
  }
}

function isFirebaseWorkspaceSummary(value: UserWorkspaceDocument): value is FirebaseWorkspaceSummary {
  return (
    typeof value.workspaceId === 'string' && typeof value.workspaceName === 'string' && (value.role === 'owner' || value.role === 'editor')
  )
}
