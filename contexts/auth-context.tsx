'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { get, ref, set } from 'firebase/database'
import { auth, db, COLLECTIONS } from '@/lib/firebase'
import type { User, UserRole } from '@/lib/types'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'create_user', 'edit_user', 'delete_user',
    'create_treadmill', 'edit_treadmill', 'delete_treadmill',
    'view_dashboard', 'view_logs', 'manage_settings',
    'create_maintenance', 'edit_maintenance', 'delete_maintenance',
    'manage_parts', 'view_all', 'export_data'
  ],
  tecnico: [
    'create_treadmill', 'edit_treadmill',
    'create_maintenance', 'edit_maintenance',
    'add_parts', 'upload_photos', 'update_status', 'view_treadmills'
  ],
  compras: [
    'view_parts', 'mark_purchased', 'set_delivery_date',
    'update_part_status', 'view_purchase_history'
  ],
  leitor: [
    'view_treadmills', 'search_treadmills', 'scan_qr', 'view_status'
  ]
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        try {
          const userSnapshot = await get(ref(db, `${COLLECTIONS.USERS}/${fbUser.uid}`))

          if (userSnapshot.exists()) {
            const userData = userSnapshot.val()
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              name: userData.name || fbUser.displayName || 'Usuário',
              role: (userData.role as UserRole) || 'leitor',
              createdAt:
                typeof userData.createdAt === 'number'
                  ? new Date(userData.createdAt)
                  : new Date(),
              updatedAt:
                typeof userData.updatedAt === 'number'
                  ? new Date(userData.updatedAt)
                  : new Date(),
              avatar: userData.avatar,
              active: typeof userData.active === 'boolean' ? userData.active : true,
            })
          } else {
            const newUser: User = {
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || 'Usuário',
              role: 'leitor',
              createdAt: new Date(),
              updatedAt: new Date(),
              active: true,
            }
            await set(ref(db, `${COLLECTIONS.USERS}/${fbUser.uid}`), {
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              active: newUser.active,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            setUser(newUser)
          }
        } catch (err) {
          console.error('Error fetching user data:', err)
          setError('Erro ao carregar dados do usuário')
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Usuário',
            role: 'leitor',
            createdAt: new Date(),
            updatedAt: new Date(),
            active: true,
          })
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setError(null)
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
      setUser(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer logout'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        signIn,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
