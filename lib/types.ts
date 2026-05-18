// User roles
export type UserRole = 'admin' | 'tecnico' | 'compras' | 'leitor'

// User type
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  avatar?: string
  active: boolean
}

// Treadmill status
export type TreadmillStatus = 'pronta' | 'manutencao' | 'indisponivel' | 'aguardando_pecas'

// Treadmill type
export interface Treadmill {
  id: string
  qrCode: string
  name: string
  brand: string
  model: string
  serialNumber: string
  description: string
  specifications: string
  voltage: string
  motorPower: string
  maxWeight: string
  maxSpeed: string
  incline: string
  photos: string[]
  status: TreadmillStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
  createdByName: string
}

// Part status
export type PartStatus = 'faltando' | 'comprada' | 'recebida'

// Part type
export interface Part {
  id: string
  treadmillId: string
  name: string
  code: string
  quantity: number
  status: PartStatus
  expectedDelivery?: Date
  supplier?: string
  notes?: string
  purchasedBy?: string
  purchasedAt?: Date
  receivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Maintenance record
export interface MaintenanceRecord {
  id: string
  treadmillId: string
  problems: string
  diagnosis: string
  notes: string
  technicianId: string
  technicianName: string
  partsNeeded: string[]
  status: 'em_andamento' | 'aguardando_pecas' | 'concluida'
  createdAt: Date
  updatedAt: Date
}

// System log
export interface SystemLog {
  id: string
  userId: string
  userName: string
  action: string
  entity: 'treadmill' | 'maintenance' | 'part' | 'user'
  entityId: string
  details: string
  createdAt: Date
}

// Notification
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

// Dashboard stats
export interface DashboardStats {
  totalTreadmills: number
  readyForSale: number
  inMaintenance: number
  unavailable: number
  awaitingParts: number
  purchasedParts: number
}

// Purchase history
export interface PurchaseHistory {
  id: string
  partId: string
  partName: string
  treadmillId: string
  treadmillName: string
  purchasedBy: string
  purchasedByName: string
  supplier: string
  expectedDelivery: Date
  receivedAt?: Date
  createdAt: Date
}

// Filter options
export interface TreadmillFilters {
  search: string
  status: TreadmillStatus | 'all'
  hasPartsMissing: boolean | null
  hasPartsPurchased: boolean | null
}

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'create_user',
    'edit_user',
    'delete_user',
    'create_treadmill',
    'edit_treadmill',
    'delete_treadmill',
    'view_dashboard',
    'view_logs',
    'manage_settings',
    'create_maintenance',
    'edit_maintenance',
    'delete_maintenance',
    'manage_parts',
    'view_all'
  ],
  tecnico: [
    'create_treadmill',
    'edit_treadmill',
    'create_maintenance',
    'edit_maintenance',
    'add_parts',
    'upload_photos',
    'update_status',
    'view_treadmills'
  ],
  compras: [
    'view_parts',
    'mark_purchased',
    'set_delivery_date',
    'update_part_status',
    'view_purchase_history'
  ],
  leitor: [
    'view_treadmills',
    'search_treadmills',
    'scan_qr',
    'view_status'
  ]
}

// Check if user has permission
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

// Get status color class
export function getStatusColor(status: TreadmillStatus): string {
  switch (status) {
    case 'pronta':
      return 'bg-status-success text-status-success'
    case 'manutencao':
      return 'bg-status-warning text-status-warning'
    case 'indisponivel':
      return 'bg-status-danger text-status-danger'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// Get status label
export function getStatusLabel(status: TreadmillStatus): string {
  switch (status) {
    case 'pronta':
      return 'Pronta para Venda'
    case 'manutencao':
      return 'Em Manutenção'
    case 'indisponivel':
      return 'Indisponível'
    default:
      return 'Desconhecido'
  }
}

// Get part status label
export function getPartStatusLabel(status: PartStatus): string {
  switch (status) {
    case 'faltando':
      return 'Faltando'
    case 'comprada':
      return 'Comprada'
    case 'recebida':
      return 'Recebida'
    default:
      return 'Desconhecido'
  }
}

// Get part status color
export function getPartStatusColor(status: PartStatus): string {
  switch (status) {
    case 'faltando':
      return 'bg-status-danger/20 text-status-danger border-status-danger/30'
    case 'comprada':
      return 'bg-status-info/20 text-status-info border-status-info/30'
    case 'recebida':
      return 'bg-status-success/20 text-status-success border-status-success/30'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// Get role label
export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'tecnico':
      return 'Técnico'
    case 'compras':
      return 'Compras'
    case 'leitor':
      return 'Leitor/Vendedor'
    default:
      return 'Desconhecido'
  }
}
