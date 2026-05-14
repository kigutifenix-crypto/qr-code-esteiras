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
import type { MaintenanceRecord } from '@/lib/types'

function snapshotToMaintenance(id: string, data: any): MaintenanceRecord {
  return {
    id,
    treadmillId: data?.treadmillId || '',
    problems: data?.problems || '',
    diagnosis: data?.diagnosis || '',
    notes: data?.notes || '',
    technicianId: data?.technicianId || '',
    technicianName: data?.technicianName || '',
    partsNeeded: Array.isArray(data?.partsNeeded) ? data.partsNeeded : [],
    status: (data?.status as MaintenanceRecord['status']) || 'em_andamento',
    createdAt:
      typeof data?.createdAt === 'number' ? new Date(data.createdAt) : new Date(),
    updatedAt:
      typeof data?.updatedAt === 'number' ? new Date(data.updatedAt) : new Date(),
  }
}

async function getAllMaintenance(): Promise<MaintenanceRecord[]> {
  const snapshot = await get(query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('createdAt')))
  const raw = snapshot.val()
  if (!raw) return []

  const records = Object.entries(raw).map(([id, value]) => snapshotToMaintenance(id, value))
  return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeAllMaintenance(
  callback: (records: MaintenanceRecord[]) => void
): Unsubscribe {
  const maintenanceQuery = query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('createdAt'))

  return onValue(maintenanceQuery, (snapshot) => {
    const raw = snapshot.val()
    const records: MaintenanceRecord[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToMaintenance(id, value))
      : []

    callback(records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function createMaintenance(
  data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now()
  const maintenanceRef = push(ref(db, COLLECTIONS.MAINTENANCE))

  await set(maintenanceRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  })

  return maintenanceRef.key ?? ''
}

export async function updateMaintenance(
  id: string,
  data: Partial<Omit<MaintenanceRecord, 'id' | 'createdAt'>>
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

  await update(ref(db, `${COLLECTIONS.MAINTENANCE}/${id}`), updates)
}

export async function deleteMaintenance(id: string): Promise<void> {
  await remove(ref(db, `${COLLECTIONS.MAINTENANCE}/${id}`))
}

export async function getMaintenance(id: string): Promise<MaintenanceRecord | null> {
  const snapshot = await get(ref(db, `${COLLECTIONS.MAINTENANCE}/${id}`))

  if (snapshot.exists()) {
    return snapshotToMaintenance(id, snapshot.val())
  }

  return null
}

export async function getMaintenanceByTreadmill(
  treadmillId: string
): Promise<MaintenanceRecord[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('treadmillId'), equalTo(treadmillId))
  )
  const raw = snapshot.val()
  if (!raw) return []

  const records = Object.entries(raw).map(([id, value]) => snapshotToMaintenance(id, value))
  return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getLatestMaintenance(
  treadmillId: string
): Promise<MaintenanceRecord | null> {
  const records = await getMaintenanceByTreadmill(treadmillId)
  return records[0] || null
}

export async function getActiveMaintenance(): Promise<MaintenanceRecord[]> {
  const allMaintenance = await getAllMaintenance()
  return allMaintenance.filter((record) =>
    ['em_andamento', 'aguardando_pecas'].includes(record.status)
  )
}

export async function getMaintenanceByTechnician(
  technicianId: string
): Promise<MaintenanceRecord[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('technicianId'), equalTo(technicianId))
  )
  const raw = snapshot.val()
  if (!raw) return []

  const records = Object.entries(raw).map(([id, value]) => snapshotToMaintenance(id, value))
  return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function subscribeMaintenanceByTreadmill(
  treadmillId: string,
  callback: (records: MaintenanceRecord[]) => void
): Unsubscribe {
  const maintenanceQuery = query(
    ref(db, COLLECTIONS.MAINTENANCE),
    orderByChild('treadmillId'),
    equalTo(treadmillId)
  )

  return onValue(maintenanceQuery, (snapshot) => {
    const raw = snapshot.val()
    const records: MaintenanceRecord[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToMaintenance(id, value))
      : []

    callback(records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  })
}

export async function completeMaintenance(id: string): Promise<void> {
  await updateMaintenance(id, { status: 'concluida' })
}

export async function getMaintenanceStats(): Promise<{
  active: number
  awaitingParts: number
  completed: number
}> {
  const allRecords = await getAllMaintenance()
  const active = allRecords.filter((record) => record.status === 'em_andamento').length
  const awaiting = allRecords.filter((record) => record.status === 'aguardando_pecas').length
  const completed = allRecords.filter((record) => record.status === 'concluida').length

  return {
    active,
    awaitingParts: awaiting,
    completed,
  }
}
