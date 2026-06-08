'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { getDashboardStats } from '@/lib/services/treadmill-service'
import { getMissingParts, getPartsStats } from '@/lib/services/parts-service'
import {
  createNotification,
  getAllNotifications,
} from '@/lib/services/logs-service'
import { getMaintenanceStats } from '@/lib/services/maintenance-service'
import type { Part } from '@/lib/types'
import {
  Dumbbell,
  CheckCircle,
  Wrench,
  XCircle,
  Package,
  ShoppingCart,
  TrendingUp,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DashboardStats {
  treadmills: {
    total: number
    ready: number
    maintenance: number
    awaitingParts: number
    unavailable: number
    sold: number
  }
  parts: {
    missing: number
    purchased: number
    received: number
  }
  maintenance: {
    active: number
    awaitingParts: number
    completed: number
  }
}

const STATUS_COLORS = {
  ready: 'oklch(0.72 0.19 145)',
  maintenance: 'oklch(0.80 0.18 85)',
  awaitingParts: 'oklch(0.70 0.22 175)',
  unavailable: 'oklch(0.60 0.22 25)',
  sold: 'oklch(0.60 0.15 250)',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [missingPartsList, setMissingPartsList] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [showPurchaseReminder, setShowPurchaseReminder] = useState(false)

  useEffect(() => {
    async function loadStats() {
      try {
        const [treadmillStats, partsStats, maintenanceStats] = await Promise.all([
          getDashboardStats(),
          getPartsStats(),
          getMaintenanceStats(),
        ])

        let missingParts: Part[] = []

        if (user?.role === 'compras') {
          missingParts = await getMissingParts()
        }

        setStats({
          treadmills: treadmillStats,
          parts: partsStats,
          maintenance: maintenanceStats,
        })

        if (user?.role === 'compras') {
          setMissingPartsList(missingParts)
          setShowPurchaseReminder(missingParts.length > 0)

          if (missingParts.length > 0) {
            const existingNotifications = await getAllNotifications()
            const hasPurchaseReminder = existingNotifications.some(
              (notification) =>
                notification.userId === user.id &&
                notification.title === 'Peças faltando para compra' &&
                !notification.read
            )

            if (!hasPurchaseReminder) {
              await createNotification({
                userId: user.id,
                title: 'Peças faltando para compra',
                message: `${missingParts.length} peça(s) ainda precisam ser compradas.`,
                type: 'warning',
                read: false,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [user?.role])

  const statusChartData = stats
    ? [
        { name: 'Prontas', value: stats.treadmills.ready, color: STATUS_COLORS.ready },
        { name: 'Em Manutenção', value: stats.treadmills.maintenance, color: STATUS_COLORS.maintenance },
        { name: 'Aguardando Peças', value: stats.treadmills.awaitingParts, color: STATUS_COLORS.awaitingParts },
        { name: 'Vendidos', value: stats.treadmills.sold, color: STATUS_COLORS.sold },
      ]
    : []

  const partsChartData = stats
    ? [
        { name: 'Faltando', value: stats.parts.missing },
        { name: 'Compradas', value: stats.parts.purchased },
        { name: 'Recebidas', value: stats.parts.received },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name ?? 'visitante'}! Aqui está o resumo do sistema.
        </p>
        {!user && (
          <p className="text-sm text-muted-foreground mt-2">
            Para acessar recursos administrativos ou técnicos, faça login em{' '}
            <Link href="/login" className="font-medium text-primary underline">
              Entrar
            </Link>
            .
          </p>
        )}
      </div>

      <Dialog open={showPurchaseReminder} onOpenChange={setShowPurchaseReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Peças faltando para compra</DialogTitle>
            <DialogDescription>
              Existem {missingPartsList.length} peças pendentes de compra. Confira os itens abaixo e acesse a área de compras para processar as solicitações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto rounded-md border border-border/70 bg-muted p-4 text-sm text-foreground">
            {missingPartsList.map((part) => (
              <div key={part.id} className="rounded-md bg-background/90 px-3 py-2 shadow-sm">
                <p className="font-semibold">{part.name}</p>
                <p className="text-muted-foreground text-xs">
                  Código: {part.code} • Qtd: {part.quantity}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPurchaseReminder(false)}>
              Fechar
            </Button>
            <Button asChild>
              <Link href="/dashboard/compras">Ir para Compras</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total de Esteiras"
          value={stats?.treadmills.total}
          loading={loading}
          icon={Dumbbell}
          description="Equipamentos cadastrados"
          href="/dashboard/esteiras"
        />
        <StatsCard
          title="Prontas para Venda"
          value={stats?.treadmills.ready}
          loading={loading}
          icon={CheckCircle}
          description="Disponíveis para venda"
          variant="success"
          href="/dashboard/esteiras?status=pronta"
        />
        <StatsCard
          title="Em Manutenção"
          value={stats?.treadmills.maintenance}
          loading={loading}
          icon={Wrench}
          description="Aguardando reparo"
          variant="warning"
          href="/dashboard/esteiras?status=manutencao"
        />
        <StatsCard
          title="Aguardando Peças"
          value={stats?.treadmills.awaitingParts}
          loading={loading}
          icon={Package}
          description="Peças pendentes"
          variant="info"
          href="/dashboard/esteiras?status=aguardando_pecas"
        />
        <StatsCard
          title="Vendidos"
          value={stats?.treadmills.sold}
          loading={loading}
          icon={CheckCircle}
          description="Esteiras vendidas"
          variant="default"
          href="/dashboard/vendidos"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Peças Faltando"
          value={stats?.parts.missing}
          loading={loading}
          icon={Package}
          description="Aguardando compra"
          variant="danger"
          href="/dashboard/pecas?status=faltando"
        />
        <StatsCard
          title="Peças Compradas"
          value={stats?.parts.purchased}
          loading={loading}
          icon={ShoppingCart}
          description="Em trânsito"
          variant="info"
          href="/dashboard/pecas?status=comprada"
        />
        <StatsCard
          title="Manutenções Ativas"
          value={stats?.maintenance.active}
          loading={loading}
          icon={Activity}
          description="Em andamento"
          variant="warning"
          href="/dashboard/manutencao?status=active"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Status das Esteiras
            </CardTitle>
            <CardDescription>Distribuição por situação atual</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.01 250)',
                      border: '1px solid oklch(0.25 0.01 250)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0.01 250)',
                      padding: '8px 12px',
                    }}
                    content={(props: any) => {
                      const { active, payload } = props
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-sm text-white">
                            <p className="font-semibold">{payload[0].payload.name}</p>
                            <p className="text-slate-300">{payload[0].value} equipamentos</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Parts Status */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Status das Peças
            </CardTitle>
            <CardDescription>Situação do inventário de peças</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={partsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 250)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'oklch(0.65 0 0)', fontSize: 12 }}
                    axisLine={{ stroke: 'oklch(0.25 0.01 250)' }}
                  />
                  <YAxis
                    tick={{ fill: 'oklch(0.65 0 0)', fontSize: 12 }}
                    axisLine={{ stroke: 'oklch(0.25 0.01 250)' }}
                  />
                  <Tooltip
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.01 250)',
                      border: '1px solid oklch(0.25 0.01 250)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0.01 250)',
                      padding: '8px 12px',
                    }}
                    content={(props: any) => {
                      const { active, payload } = props
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-sm text-white">
                            <p className="font-semibold">{payload[0].payload.name}</p>
                            <p className="text-slate-300">{payload[0].value} peças</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="oklch(0.65 0.18 160)" 
                    radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fill: 'oklch(0.95 0.01 250)', fontSize: 13, fontWeight: 'bold' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: number | undefined
  loading: boolean
  icon: React.ElementType
  description: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  href?: string
}

function StatsCard({
  title,
  value,
  loading,
  icon: Icon,
  description,
  variant = 'default',
  href,
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-status-warning/10 text-status-warning',
    danger: 'bg-status-danger/10 text-status-danger',
    info: 'bg-status-info/10 text-status-info',
  }

  const cardContent = (
    <Card className="border-border/50 transition-all hover:border-primary/30 cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value ?? 0}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}
