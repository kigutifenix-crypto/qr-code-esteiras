'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { subscribeTreadmills, updateTreadmill } from '@/lib/services/treadmill-service'
import type { Treadmill, TreadmillStatus, TreadmillFilters, EquipmentType } from '@/lib/types'
import { Package, Search, MoreHorizontal, Edit, RotateCcw, Dumbbell, Bike, Activity } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TAB_ICONS = {
  esteira: Dumbbell,
  bike: Bike,
  eliptico: Activity,
}

const TAB_LABELS = {
  esteira: 'Esteiras',
  bike: 'Bikes',
  eliptico: 'Elípticos',
}

export default function VendidosPage() {
  const { hasPermission } = useAuth()
  const router = useRouter()
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<EquipmentType>('esteira')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeTreadmills((data) => {
      setTreadmills(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const canManage = hasPermission('manage_parts') || hasPermission('create_treadmill')

  const handleSearchChange = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => setSearch(value), 300)
    setSearchTimeout(timeout)
  }

  const filteredByTab = useMemo(() => {
    return treadmills.filter(t => {
      if (t.status !== 'vendido') return false
      return (t.equipmentType || 'esteira') === activeTab
    })
  }, [treadmills, activeTab])

  const filteredTreadmills = useMemo(() => {
    let result = filteredByTab
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.brand.toLowerCase().includes(term) ||
        t.model.toLowerCase().includes(term) ||
        t.serialNumber.toLowerCase().includes(term) ||
        t.qrCode.toLowerCase().includes(term)
      )
    }
    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [filteredByTab, search])

  const statsByType = useMemo(() => {
    const sold = treadmills.filter(t => t.status === 'vendido')
    const now = new Date()
    return (['esteira', 'bike', 'eliptico'] as EquipmentType[]).reduce((acc, type) => {
      const typeSold = sold.filter(t => (t.equipmentType || 'esteira') === type)
      acc[type] = {
        total: typeSold.length,
        thisMonth: typeSold.filter(t => {
          const d = new Date(t.updatedAt)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length,
      }
      return acc
    }, {} as Record<EquipmentType, { total: number; thisMonth: number }>)
  }, [treadmills])

  const handleRestoreTreadmill = async (id: string) => {
    const confirmed = window.confirm(
      'Tem certeza que deseja restaurar este equipamento para o status anterior? Ele deixará de aparecer na lista de vendidos.'
    )
    if (!confirmed) return
    try {
      await updateTreadmill(id, { status: 'pronta' })
      setTreadmills((current) => current.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Erro ao restaurar equipamento:', error)
      window.alert('Não foi possível restaurar o equipamento. Tente novamente.')
    }
  }

  const stats = statsByType[activeTab] ?? { total: 0, thisMonth: 0 }
  const TypeIcon = TAB_ICONS[activeTab]
  const typeLabel = TAB_LABELS[activeTab]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendidos</h1>
        <p className="text-muted-foreground">
          Histórico de equipamentos já vendidos do sistema
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EquipmentType)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="esteira" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Esteiras
          </TabsTrigger>
          <TabsTrigger value="bike" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Bikes
          </TabsTrigger>
          <TabsTrigger value="eliptico" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Elípticos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/15">
                <TypeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de {typeLabel} Vendidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/15">
                <TypeIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
                <p className="text-sm text-muted-foreground">Vendidas este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${typeLabel.toLowerCase()} por nome, marca, modelo...`}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-input/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTreadmills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TypeIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma {typeLabel.toLowerCase().slice(0, -1)} vendida encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search
                  ? 'Tente ajustar os filtros de busca'
                  : `Ainda não há ${typeLabel.toLowerCase()} marcadas como vendidas`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status de Entrega</TableHead>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreadmills.map((treadmill) => (
                  <TableRow
                    key={treadmill.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a')) return
                      router.push(`/dashboard/esteiras/${treadmill.id}?back=/dashboard/vendidos`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.push(`/dashboard/esteiras/${treadmill.id}?back=/dashboard/vendidos`)
                      }
                    }}
                  >
                    <TableCell className="font-medium">{treadmill.name}</TableCell>
                    <TableCell>{treadmill.brand || '-'}</TableCell>
                    <TableCell>{treadmill.model || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={treadmill.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      {treadmill.deliveryStatus === 'pendente' ? 'Pendente'
                        : treadmill.deliveryStatus === 'em_transito' ? 'Em Trânsito'
                        : treadmill.deliveryStatus === 'entregue' ? 'Entregue'
                        : treadmill.deliveryStatus === 'cancelado' ? 'Cancelado'
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {treadmill.saleDate
                        ? format(treadmill.saleDate, 'dd/MM/yyyy')
                        : format(treadmill.updatedAt, 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/esteiras/${treadmill.id}?back=/dashboard/vendidos`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <DropdownMenuItem
                              onClick={() => handleRestoreTreadmill(treadmill.id)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restaurar Status
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
