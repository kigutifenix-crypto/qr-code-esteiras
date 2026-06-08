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
import type { ArchivedTreadmill, Treadmill, TreadmillStatus, TreadmillFilters } from '@/lib/types'

// Generate unique ID for QR code
function generateQRId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${timestamp}-${random}`
}

// Convert Realtime Database snapshot data to Treadmill
function snapshotToTreadmill(id: string, data: any): Treadmill {
  return {
    id,
    qrCode: data?.qrCode || '',
    name: data?.name || '',
    brand: data?.brand || '',
    model: data?.model || '',
    serialNumber: data?.serialNumber || '',
    description: data?.description || '',
    specifications: data?.specifications || '',
    voltage: data?.voltage || '',
    motorPower: data?.motorPower || '',
    maxWeight: data?.maxWeight || '',
    maxSpeed: data?.maxSpeed || '',
    incline: data?.incline || '',
    photos: Array.isArray(data?.photos) ? data.photos : [],
    status: (data?.status as TreadmillStatus) || 'pronta',
    orderNumber: data?.orderNumber || undefined,
    saleDate: typeof data?.saleDate === 'number' ? new Date(data.saleDate) : undefined,
    deliveryStatus: data?.deliveryStatus || undefined,
    createdAt: typeof data?.createdAt === 'number' ? new Date(data.createdAt) : new Date(),
    updatedAt: typeof data?.updatedAt === 'number' ? new Date(data.updatedAt) : new Date(),
    createdBy: data?.createdBy || '',
    createdByName: data?.createdByName || '',
  }
}

// Create a new treadmill
export async function createTreadmill(
  data: Omit<Treadmill, 'id' | 'createdAt' | 'updatedAt'> & { qrCode?: string }
): Promise<string> {
  const now = Date.now()
  const qrCode = data.qrCode || generateQRId()
  const treadmillRef = push(ref(db, COLLECTIONS.TREADMILLS))

  // Normalize dates to timestamps where applicable
  const payload: Record<string, unknown> = {
    ...data,
    qrCode,
    status: data.status || 'pronta',
    voltage: data.voltage || '220V',
    createdAt: now,
    updatedAt: now,
  }

  if (data.saleDate instanceof Date) {
    payload.saleDate = data.saleDate.getTime()
  } else if (typeof (data as any).saleDate === 'number') {
    payload.saleDate = (data as any).saleDate
  }

  await set(treadmillRef, payload)

  return treadmillRef.key ?? ''
}

// Update a treadmill
export async function updateTreadmill(
  id: string,
  data: Partial<Omit<Treadmill, 'id' | 'qrCode' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  }

  // Only include defined values in the update
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert Date objects to numeric timestamps for storage
      if (value instanceof Date) {
        updates[key] = value.getTime()
      } else {
        updates[key] = value
      }
    }
  })

  await update(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`), updates)
}

// Delete a treadmill
export async function deleteTreadmill(id: string): Promise<void> {
  // Delete maintenance records associated with this treadmill
  try {
    const maintenanceSnapshot = await get(
      query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('treadmillId'), equalTo(id))
    )

    const maintenanceRaw = maintenanceSnapshot.val()
    if (maintenanceRaw) {
      for (const key of Object.keys(maintenanceRaw)) {
        await remove(ref(db, `${COLLECTIONS.MAINTENANCE}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to delete related maintenance records:', err)
  }

  // Delete parts associated with this treadmill
  try {
    const partsSnapshot = await get(
      query(ref(db, COLLECTIONS.PARTS), orderByChild('treadmillId'), equalTo(id))
    )

    const partsRaw = partsSnapshot.val()
    if (partsRaw) {
      for (const key of Object.keys(partsRaw)) {
        await remove(ref(db, `${COLLECTIONS.PARTS}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to delete related parts:', err)
  }

  // Finally remove the treadmill
  await remove(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`))
}

// Count related maintenance and parts for a treadmill
export async function countRelatedRecords(id: string): Promise<{ maintenance: number; parts: number }> {
  try {
    const maintenanceSnapshot = await get(
      query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('treadmillId'), equalTo(id))
    )
    const partsSnapshot = await get(
      query(ref(db, COLLECTIONS.PARTS), orderByChild('treadmillId'), equalTo(id))
    )

    const maintenanceRaw = maintenanceSnapshot.val()
    const partsRaw = partsSnapshot.val()

    return {
      maintenance: maintenanceRaw ? Object.keys(maintenanceRaw).length : 0,
      parts: partsRaw ? Object.keys(partsRaw).length : 0,
    }
  } catch (err) {
    console.warn('Failed to count related records:', err)
    return { maintenance: 0, parts: 0 }
  }
}

// Archive treadmill and its related records instead of permanent deletion
export async function archiveTreadmill(id: string): Promise<void> {
  const now = Date.now()

  // Fetch treadmill
  const treadmillSnapshot = await get(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`))
  if (!treadmillSnapshot.exists()) return
  const treadmillData = treadmillSnapshot.val()

  // Save treadmill to archive
  const archiveTref = push(ref(db, COLLECTIONS.ARCHIVE_TREADMILLS))
  await set(archiveTref, { ...treadmillData, originalId: id, archivedAt: now })

  // Archive maintenance
  try {
    const maintenanceSnapshot = await get(
      query(ref(db, COLLECTIONS.MAINTENANCE), orderByChild('treadmillId'), equalTo(id))
    )
    const maintenanceRaw = maintenanceSnapshot.val()
    if (maintenanceRaw) {
      for (const [key, value] of Object.entries(maintenanceRaw)) {
        const arcRef = push(ref(db, COLLECTIONS.ARCHIVE_MAINTENANCE))
        await set(arcRef, { ...(value as any), originalId: key, archivedAt: now })
        await remove(ref(db, `${COLLECTIONS.MAINTENANCE}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to archive maintenance:', err)
  }

  // Archive parts
  try {
    const partsSnapshot = await get(
      query(ref(db, COLLECTIONS.PARTS), orderByChild('treadmillId'), equalTo(id))
    )
    const partsRaw = partsSnapshot.val()
    if (partsRaw) {
      for (const [key, value] of Object.entries(partsRaw)) {
        const arcRef = push(ref(db, COLLECTIONS.ARCHIVE_PARTS))
        await set(arcRef, { ...(value as any), originalId: key, archivedAt: now })
        await remove(ref(db, `${COLLECTIONS.PARTS}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to archive parts:', err)
  }

  // Remove treadmill
  await remove(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`))
}

// Get a single treadmill by ID
export async function getTreadmill(id: string): Promise<Treadmill | null> {
  const snapshot = await get(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`))

  if (snapshot.exists()) {
    return snapshotToTreadmill(id, snapshot.val())
  }

  return null
}

// Get treadmill by QR code
export async function getTreadmillByQRCode(qrCode: string): Promise<Treadmill | null> {
  // Normalize input: accept full URLs or raw codes, compare case-insensitive
  const raw = String(qrCode || '').trim()
  const candidate = raw.includes('/') ? raw.split('/').pop() || raw : raw

  // First try the indexed query (fast)
  const treadmillQuery = query(
    ref(db, COLLECTIONS.TREADMILLS),
    orderByChild('qrCode'),
    equalTo(candidate)
  )
  const snapshot = await get(treadmillQuery)

  let treadmill: Treadmill | null = null
  snapshot.forEach((childSnapshot) => {
    treadmill = snapshotToTreadmill(childSnapshot.key ?? '', childSnapshot.val())
    return true
  })

  if (treadmill) return treadmill

  // Fallback: fetch all and try case-insensitive / normalized matches
  const all = await getAllTreadmills()
  const target = candidate.trim().toLowerCase()

  // exact case-insensitive match
  let found = all.find((t) => (t.qrCode || '').trim().toLowerCase() === target)
  if (found) return found

  // normalized match (strip non-alphanumeric)
  const normalize = (s: string) => (s || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
  const normalizedTarget = normalize(candidate)
  if (normalizedTarget) {
    found = all.find((t) => normalize(t.qrCode || '') === normalizedTarget)
    if (found) return found
  }

  return null
}

// Get all treadmills
export async function getAllTreadmills(): Promise<Treadmill[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.TREADMILLS), orderByChild('createdAt'))
  )
  const raw = snapshot.val()

  if (!raw) return []

  const treadmills = Object.entries(raw).map(([id, value]) =>
    snapshotToTreadmill(id, value)
  )

  return treadmills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function snapshotToArchivedTreadmill(id: string, data: any): ArchivedTreadmill {
  return {
    ...snapshotToTreadmill(id, data),
    originalId: data?.originalId || '',
    archivedAt:
      typeof data?.archivedAt === 'number'
        ? new Date(data.archivedAt)
        : new Date(),
  }
}

export async function getArchivedTreadmill(id: string): Promise<ArchivedTreadmill | null> {
  const snapshot = await get(ref(db, `${COLLECTIONS.ARCHIVE_TREADMILLS}/${id}`))

  if (!snapshot.exists()) return null

  return snapshotToArchivedTreadmill(id, snapshot.val())
}

export async function getArchivedTreadmills(): Promise<ArchivedTreadmill[]> {
  try {
    const snapshot = await get(ref(db, COLLECTIONS.ARCHIVE_TREADMILLS))
    const raw = snapshot.val()

    if (!raw) return []

    const archives = Object.entries(raw).map(([id, value]) =>
      snapshotToArchivedTreadmill(id, value)
    )

    return archives.sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime())
  } catch (error) {
    console.error('Failed to load archived treadmills:', error)
    throw error
  }
}

export async function restoreArchivedTreadmill(archiveId: string): Promise<void> {
  const archiveSnapshot = await get(ref(db, `${COLLECTIONS.ARCHIVE_TREADMILLS}/${archiveId}`))
  if (!archiveSnapshot.exists()) {
    throw new Error('Esteira arquivada não encontrada.')
  }

  const archivedData = archiveSnapshot.val()
  const originalId = archivedData?.originalId as string
  if (!originalId) {
    throw new Error('Dados de arquivo inválidos.')
  }

  // Restore treadmill record to active collection
  const treadmillPayload = { ...archivedData }
  delete treadmillPayload.originalId
  delete treadmillPayload.archivedAt

  await set(ref(db, `${COLLECTIONS.TREADMILLS}/${originalId}`), treadmillPayload)

  // Restore maintenance records
  try {
    const maintenanceSnapshot = await get(
      query(ref(db, COLLECTIONS.ARCHIVE_MAINTENANCE), orderByChild('treadmillId'), equalTo(originalId))
    )
    const maintenanceRaw = maintenanceSnapshot.val()
    if (maintenanceRaw) {
      for (const [key, value] of Object.entries(maintenanceRaw)) {
        const originalMaintenanceId = (value as any)?.originalId || key
        const maintenancePayload = { ...(value as any) }
        delete maintenancePayload.originalId
        delete maintenancePayload.archivedAt
        await set(ref(db, `${COLLECTIONS.MAINTENANCE}/${originalMaintenanceId}`), maintenancePayload)
        await remove(ref(db, `${COLLECTIONS.ARCHIVE_MAINTENANCE}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to restore maintenance records:', err)
  }

  // Restore parts records
  try {
    const partsSnapshot = await get(
      query(ref(db, COLLECTIONS.ARCHIVE_PARTS), orderByChild('treadmillId'), equalTo(originalId))
    )
    const partsRaw = partsSnapshot.val()
    if (partsRaw) {
      for (const [key, value] of Object.entries(partsRaw)) {
        const originalPartId = (value as any)?.originalId || key
        const partPayload = { ...(value as any) }
        delete partPayload.originalId
        delete partPayload.archivedAt
        await set(ref(db, `${COLLECTIONS.PARTS}/${originalPartId}`), partPayload)
        await remove(ref(db, `${COLLECTIONS.ARCHIVE_PARTS}/${key}`))
      }
    }
  } catch (err) {
    console.warn('Failed to restore parts records:', err)
  }

  // Remove archive treadmill record
  await remove(ref(db, `${COLLECTIONS.ARCHIVE_TREADMILLS}/${archiveId}`))
}

// Get treadmills by status
export async function getTreadmillsByStatus(status: TreadmillStatus): Promise<Treadmill[]> {
  const snapshot = await get(
    query(ref(db, COLLECTIONS.TREADMILLS), orderByChild('status'), equalTo(status))
  )
  const raw = snapshot.val()

  if (!raw) return []

  const treadmills = Object.entries(raw).map(([id, value]) =>
    snapshotToTreadmill(id, value)
  )

  return treadmills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Search treadmills
export async function searchTreadmills(searchTerm: string): Promise<Treadmill[]> {
  const treadmills = await getAllTreadmills()
  const term = searchTerm.toLowerCase()

  return treadmills.filter(
    (t) =>
      t.name.toLowerCase().includes(term) ||
      t.brand.toLowerCase().includes(term) ||
      t.model.toLowerCase().includes(term) ||
      t.serialNumber.toLowerCase().includes(term) ||
      t.qrCode.toLowerCase().includes(term)
  )
}

// Filter treadmills
export function filterTreadmills(
  treadmills: Treadmill[],
  filters: TreadmillFilters
): Treadmill[] {
  let result = [...treadmills]

  if (filters.search) {
    const term = filters.search.toLowerCase()
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.brand.toLowerCase().includes(term) ||
        t.model.toLowerCase().includes(term) ||
        t.serialNumber.toLowerCase().includes(term) ||
        t.qrCode.toLowerCase().includes(term)
    )
  }

  if (filters.status && filters.status !== 'all') {
    result = result.filter((t) => t.status === filters.status)
  }

  return result
}

// Subscribe to treadmills changes
export function subscribeTreadmills(
  callback: (treadmills: Treadmill[]) => void,
  filters?: TreadmillFilters
): Unsubscribe {
  let treadmillQuery

  // Aplicar filtros se fornecidos
  if (filters?.status && filters.status !== 'all') {
    treadmillQuery = query(
      ref(db, COLLECTIONS.TREADMILLS),
      orderByChild('status'),
      equalTo(filters.status)
    )
  } else {
    // Ordenar por createdAt apenas se não houver filtro de status
    treadmillQuery = query(
      ref(db, COLLECTIONS.TREADMILLS),
      orderByChild('createdAt')
    )
  }

  return onValue(treadmillQuery, (snapshot) => {
    const raw = snapshot.val()
    let treadmills: Treadmill[] = raw
      ? Object.entries(raw).map(([id, value]) => snapshotToTreadmill(id, value))
      : []

    // Aplicar filtros adicionais no lado cliente se necessário
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        treadmills = treadmills.filter(t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.brand.toLowerCase().includes(searchLower) ||
          t.model.toLowerCase().includes(searchLower) ||
          t.serialNumber.toLowerCase().includes(searchLower)
        )
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    treadmills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    callback(treadmills)
  })
}

// Get dashboard stats
export async function getDashboardStats(): Promise<{
  total: number
  ready: number
  maintenance: number
  awaitingParts: number
  unavailable: number
  sold: number
}> {
  const treadmills = await getAllTreadmills()

  const soldCount = treadmills.filter((t) => t.status === 'vendido').length
  const activeTreadmills = treadmills.length - soldCount

  return {
    total: activeTreadmills,
    ready: treadmills.filter((t) => t.status === 'pronta').length,
    maintenance: treadmills.filter((t) => t.status === 'manutencao').length,
    awaitingParts: treadmills.filter((t) => t.status === 'aguardando_pecas').length,
    unavailable: treadmills.filter((t) => t.status === 'indisponivel').length,
    sold: soldCount,
  }
}
