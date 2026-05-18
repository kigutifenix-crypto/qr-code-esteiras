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
import type { Treadmill, TreadmillStatus, TreadmillFilters } from '@/lib/types'

// Generate unique ID for QR code
function generateQRId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `FNX-${timestamp}-${random}`.toUpperCase()
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

  await set(treadmillRef, {
    ...data,
    qrCode,
    status: data.status || 'pronta',
    voltage: data.voltage || '220V',
    createdAt: now,
    updatedAt: now,
  })

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
      updates[key] = value
    }
  })

  await update(ref(db, `${COLLECTIONS.TREADMILLS}/${id}`), updates)
}

// Delete a treadmill
export async function deleteTreadmill(id: string): Promise<void> {
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
  const treadmillQuery = query(
    ref(db, COLLECTIONS.TREADMILLS),
    orderByChild('qrCode'),
    equalTo(qrCode)
  )
  const snapshot = await get(treadmillQuery)

  let treadmill: Treadmill | null = null
  snapshot.forEach((childSnapshot) => {
    treadmill = snapshotToTreadmill(childSnapshot.key ?? '', childSnapshot.val())
    return true
  })

  return treadmill
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
}> {
  const treadmills = await getAllTreadmills()

  return {
    total: treadmills.length,
    ready: treadmills.filter((t) => t.status === 'pronta').length,
    maintenance: treadmills.filter((t) => t.status === 'manutencao').length,
    awaitingParts: treadmills.filter((t) => t.status === 'aguardando_pecas').length,
    unavailable: treadmills.filter((t) => t.status === 'indisponivel').length,
  }
}
