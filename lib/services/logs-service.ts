import {
  equalTo,
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
  type Unsubscribe,
  update,
} from 'firebase/database'
import { db, COLLECTIONS } from '@/lib/firebase'
import type { SystemLog, Notification } from '@/lib/types'

function snapshotToLog(id: string, data: any): SystemLog {
  return {
    id,
    userId: data?.userId || '',
    userName: data?.userName || '',
    action: data?.action || '',
    entity: data?.entity || 'treadmill',
    entityId: data?.entityId || '',
    details: data?.details || '',
    createdAt: typeof data?.createdAt === 'number' ? new Date(data.createdAt) : new Date(),
  }
}

function snapshotToNotification(id: string, data: any): Notification {
  return {
    id,
    userId: data?.userId || '',
    title: data?.title || '',
    message: data?.message || '',
    type: (data?.type as Notification['type']) || 'info',
    read: data?.read || false,
    createdAt: typeof data?.createdAt === 'number' ? new Date(data.createdAt) : new Date(),
  }
}

// Logs
export async function getAllLogs(): Promise<SystemLog[]> {
  const snapshot = await get(query(ref(db, COLLECTIONS.LOGS), orderByChild('createdAt')))
  const raw = snapshot.val()
  if (!raw) return []

  const logs = Object.entries(raw).map(([id, value]) => snapshotToLog(id, value))
  return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeAllLogs(
  callback: (logs: SystemLog[]) => void
): Unsubscribe {
  const logsQuery = query(ref(db, COLLECTIONS.LOGS), orderByChild('createdAt'))

  return onValue(logsQuery, (snapshot) => {
    const raw = snapshot.val()
    const logs: SystemLog[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToLog(id, value))
      : []

    callback(logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function createLog(
  data: Omit<SystemLog, 'id' | 'createdAt'>
): Promise<string> {
  const now = Date.now()
  const logRef = push(ref(db, COLLECTIONS.LOGS))

  await set(logRef, {
    ...data,
    createdAt: now,
  })

  return logRef.key ?? ''
}

export async function deleteLog(id: string): Promise<void> {
  await remove(ref(db, `${COLLECTIONS.LOGS}/${id}`))
}

// Notifications
export async function getAllNotifications(): Promise<Notification[]> {
  const snapshot = await get(query(ref(db, COLLECTIONS.NOTIFICATIONS), orderByChild('createdAt')))
  const raw = snapshot.val()
  if (!raw) return []

  const notifications = Object.entries(raw).map(([id, value]) => snapshotToNotification(id, value))
  return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  const allNotifications = await getAllNotifications()
  return allNotifications.filter(n => !n.read)
}

export function subscribeAllNotifications(
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const notificationsQuery = query(ref(db, COLLECTIONS.NOTIFICATIONS), orderByChild('createdAt'))

  return onValue(notificationsQuery, (snapshot) => {
    const raw = snapshot.val()
    const notifications: Notification[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToNotification(id, value))
      : []

    callback(notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt'>
): Promise<string> {
  const now = Date.now()
  const notificationRef = push(ref(db, COLLECTIONS.NOTIFICATIONS))

  await set(notificationRef, {
    ...data,
    createdAt: now,
  })

  return notificationRef.key ?? ''
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await update(ref(db, `${COLLECTIONS.NOTIFICATIONS}/${id}`), {
    read: true,
  })
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const notifications = await getUnreadNotifications()
  const updates = notifications.reduce((acc, notification) => {
    acc[`${COLLECTIONS.NOTIFICATIONS}/${notification.id}/read`] = true
    return acc
  }, {} as Record<string, boolean>)

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await remove(ref(db, `${COLLECTIONS.NOTIFICATIONS}/${id}`))
}

export async function getNotificationsStats(): Promise<{
  total: number
  unread: number
}> {
  const allNotifications = await getAllNotifications()
  const unread = allNotifications.filter(n => !n.read).length

  return {
    total: allNotifications.length,
    unread,
  }
}