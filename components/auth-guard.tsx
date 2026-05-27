"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function AuthGuard() {
  const { user, loading, hasPermission } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Allow public paths
    const publicPrefixes = [
      '/login',
      '/api',
      '/_next',
      '/favicon.ico',
      '/manifest.json',
      '/robots.txt',
      '/public',
    ]

    if (!pathname) return

    const isPublicPrefix = publicPrefixes.some((p) => pathname.startsWith(p))
    const isPublicEsteira = pathname === '/esteira' || pathname.startsWith('/esteira/')

    if (isPublicPrefix || isPublicEsteira) return

    // Only redirect if loading is complete
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    // Route-specific permission checks
    // Dashboard main page and stats - requires view_dashboard permission
    if (pathname === '/dashboard' && !hasPermission('view_dashboard')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Maintenance routes - requires create_maintenance permission
    if (pathname.startsWith('/dashboard/manutencao') && !hasPermission('create_maintenance')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Logs - requires manage_settings permission
    if (pathname.startsWith('/dashboard/logs') && !hasPermission('manage_settings')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Users - requires create_user or edit_user permission
    if (pathname.startsWith('/dashboard/usuarios') && !hasPermission('create_user') && !hasPermission('edit_user')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Settings - requires manage_settings permission
    if (pathname.startsWith('/dashboard/configuracoes') && !hasPermission('manage_settings')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Scanner - requires create_maintenance permission
    if (pathname.startsWith('/dashboard/scanner') && !hasPermission('create_maintenance')) {
      router.replace('/dashboard/esteiras')
      return
    }

    // Notifications - requires view_all permission
    if (pathname.startsWith('/dashboard/notificacoes') && !hasPermission('view_all')) {
      router.replace('/dashboard/esteiras')
      return
    }
  }, [user, loading, pathname, router, hasPermission])

  return null
}
