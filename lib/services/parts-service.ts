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
import type { Part, PartStatus } from '@/lib/types'

function snapshotToPart(id: string, data: any): Part {
  return {
    id,
    treadmillId: data?.treadmillId || '',
    name: data?.name || '',
    code: data?.code || '',
    quantity: typeof data?.quantity === 'number' ? data.quantity : 1,
    status: (data?.status as PartStatus) || 'faltando',
    expectedDelivery:
      typeof data?.expectedDelivery === 'number'
        ? new Date(data.expectedDelivery)
        : undefined,
    supplier: data?.supplier || undefined,
    notes: data?.notes || undefined,
    photoUrl: data?.photoUrl || undefined,
    purchasedBy: data?.purchasedBy || undefined,
    purchasedAt:
      typeof data?.purchasedAt === 'number'
        ? new Date(data.purchasedAt)
        : undefined,
    receivedAt:
      typeof data?.receivedAt === 'number'
        ? new Date(data.receivedAt)
        : undefined,
    createdAt:
      typeof data?.createdAt === 'number'
        ? new Date(data.createdAt)
        : new Date(),
    updatedAt:
      typeof data?.updatedAt === 'number'
        ? new Date(data.updatedAt)
        : new Date(),
  }
}

async function getAllParts(): Promise<Part[]> {
  const snapshot = await get(query(ref(db, COLLECTIONS.PARTS), orderByChild('createdAt')))
  const raw = snapshot.val()
  if (!raw) return []

  const parts = Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
  return parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeAllParts(
  callback: (parts: Part[]) => void
): Unsubscribe {
  const partsQuery = query(ref(db, COLLECTIONS.PARTS), orderByChild('createdAt'))

  return onValue(partsQuery, (snapshot) => {
    const raw = snapshot.val()
    const parts: Part[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
      : []

    callback(parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function createPart(
  data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now()
  const partRef = push(ref(db, COLLECTIONS.PARTS))

  const payload: Record<string, unknown> = {
    ...data,
    expectedDelivery: data.expectedDelivery ? data.expectedDelivery.getTime() : null,
    purchasedAt: data.purchasedAt ? data.purchasedAt.getTime() : null,
    receivedAt: data.receivedAt ? data.receivedAt.getTime() : null,
    createdAt: now,
    updatedAt: now,
  }

  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )

  await set(partRef, sanitizedPayload)

  return partRef.key ?? ''
}

export async function updatePart(
  id: string,
  data: Partial<Omit<Part, 'id' | 'createdAt'>>
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

  if (data.expectedDelivery !== undefined) {
    updates.expectedDelivery = data.expectedDelivery ? data.expectedDelivery.getTime() : null
  }
  if (data.purchasedAt !== undefined) {
    updates.purchasedAt = data.purchasedAt ? data.purchasedAt.getTime() : null
  }
  if (data.receivedAt !== undefined) {
    updates.receivedAt = data.receivedAt ? data.receivedAt.getTime() : null
  }

  await update(ref(db, `${COLLECTIONS.PARTS}/${id}`), updates)
}

export async function deletePart(id: string): Promise<void> {
  await remove(ref(db, `${COLLECTIONS.PARTS}/${id}`))
}

export async function getPart(id: string): Promise<Part | null> {
  const snapshot = await get(ref(db, `${COLLECTIONS.PARTS}/${id}`))

  if (snapshot.exists()) {
    return snapshotToPart(id, snapshot.val())
  }

  return null
}

export async function getPartsByTreadmill(treadmillId: string): Promise<Part[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.PARTS), orderByChild('treadmillId'), equalTo(treadmillId))
  )
  const raw = snapshot.val()
  if (!raw) return []

  const parts = Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
  return parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getPartsByStatus(status: PartStatus): Promise<Part[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.PARTS), orderByChild('status'), equalTo(status))
  )
  const raw = snapshot.val()
  if (!raw) return []

  const parts = Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
  return parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getMissingParts(): Promise<Part[]> {
  return getPartsByStatus('faltando')
}

export async function getPurchasedParts(): Promise<Part[]> {
  return getPartsByStatus('comprada')
}

export async function markPartAsPurchased(
  id: string,
  purchasedBy: string,
  supplier: string,
  expectedDelivery: Date
): Promise<void> {
  await updatePart(id, {
    status: 'comprada',
    purchasedBy,
    purchasedAt: new Date(),
    supplier,
    expectedDelivery,
  })
}

export async function markPartAsReceived(id: string): Promise<void> {
  await updatePart(id, {
    status: 'recebida',
    receivedAt: new Date(),
  })
}

export function subscribePartsByTreadmill(
  treadmillId: string,
  callback: (parts: Part[]) => void
): Unsubscribe {
  const partsQuery = query(
    ref(db, COLLECTIONS.PARTS),
    orderByChild('treadmillId'),
    equalTo(treadmillId)
  )

  return onValue(partsQuery, (snapshot) => {
    const raw = snapshot.val()
    const parts: Part[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
      : []

    callback(parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export function subscribePartsByStatus(
  status: PartStatus,
  callback: (parts: Part[]) => void
): Unsubscribe {
  const partsQuery = query(
    ref(db, COLLECTIONS.PARTS),
    orderByChild('status'),
    equalTo(status)
  )

  return onValue(partsQuery, (snapshot) => {
    const raw = snapshot.val()
    const parts: Part[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToPart(id, value))
      : []

    callback(parts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function getPartsStats(): Promise<{
  missing: number
  purchased: number
  received: number
}> {
  const [missing, purchased, received] = await Promise.all([
    getMissingParts(),
    getPurchasedParts(),
    getPartsByStatus('recebida'),
  ])

  return {
    missing: missing.length,
    purchased: purchased.length,
    received: received.length,
  }
}
