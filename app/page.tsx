"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { firebaseUser, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (firebaseUser) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [firebaseUser, loading, router])

  return null
}
