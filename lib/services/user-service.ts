import {
  get,
  ref,
  remove,
  set,
  update,
} from 'firebase/database'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db, COLLECTIONS } from '@/lib/firebase'
import type { User, UserRole } from '@/lib/types'

function snapshotToUser(id: string, data: any): User {
  return {
    id,
    email: data?.email || '',
    name: data?.name || '',
    role: (data?.role as UserRole) || 'leitor',
    createdAt:
      typeof data?.createdAt === 'number' ? new Date(data.createdAt) : new Date(),
    updatedAt:
      typeof data?.updatedAt === 'number' ? new Date(data.updatedAt) : new Date(),
    avatar: data?.avatar || undefined,
    active: typeof data?.active === 'boolean' ? data.active : true,
  }
}

export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await get(ref(db, COLLECTIONS.USERS))
  const raw = snapshot.val()
  if (!raw) return []

  const users = Object.entries(raw).map(([id, value]) => snapshotToUser(id, value))
  return users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<string> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const uid = userCredential.user.uid
  const now = Date.now()

  await set(ref(db, `${COLLECTIONS.USERS}/${uid}`), {
    email,
    name,
    role,
    active: true,
    createdAt: now,
    updatedAt: now,
  })

  return uid
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  }

  // Only include defined values in the update
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates[key] = value
    }
  })

  await update(ref(db, `${COLLECTIONS.USERS}/${id}`), updates)
}

export async function deleteUser(id: string): Promise<void> {
  await updateUser(id, { active: false })
}

export async function hardDeleteUser(id: string): Promise<void> {
  await remove(ref(db, `${COLLECTIONS.USERS}/${id}`))
}

export async function getUser(id: string): Promise<User | null> {
  const snapshot = await get(ref(db, `${COLLECTIONS.USERS}/${id}`))

  if (snapshot.exists()) {
    return snapshotToUser(id, snapshot.val())
  }

  return null
}

export async function getActiveUsers(): Promise<User[]> {
  return getAllUsers().then((users) => users.filter((user) => user.active))
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  return getAllUsers().then((users) =>
    users.filter((user) => user.active && user.role === role)
  )
}

export async function getTechnicians(): Promise<User[]> {
  return getUsersByRole('tecnico')
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  await updateUser(id, { role })
}

export async function getUserStats(): Promise<{
  total: number
  admins: number
  technicians: number
  buyers: number
  readers: number
}> {
  const users = await getActiveUsers()

  return {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    technicians: users.filter((u) => u.role === 'tecnico').length,
    buyers: users.filter((u) => u.role === 'compras').length,
    readers: users.filter((u) => u.role === 'leitor').length,
  }
}
