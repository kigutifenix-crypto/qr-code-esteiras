'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { subscribeAllParts, updatePart, deletePart } from '@/lib/services/parts-service'
import { getAllTreadmills } from '@/lib/services/treadmill-service'
import type { Part, PartStatus, EquipmentType } from '@/lib/types'
import { Package, Plus, Search, MoreHorizontal, Eye, Edit, Check, CheckCircle2, Trash2, Dumbbell, Bike, Activity } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TreadmillInfo {
  name: string
  equipmentType: EquipmentType
}

export default function PecasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasPermission } = useAuth()
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<EquipmentType>('esteira')
  const [treadmillMap, setTreadmillMap] = useState<Record<string, TreadmillInfo>>({})

  const statusFromUrl = searchParams.get('status')
  const mappedStatus: PartStatus | 'all' =
    statusFromUrl === 'missing' || statusFromUrl === 'faltando' ? 'faltando' :
    statusFromUrl === 'purchased' || statusFromUrl === 'comprada' ? 'comprada' :
    statusFromUrl === 'received' || statusFromUrl === 'recebida' ? 'recebida' :
    'all'

  const [statusFilter, setStatusFilter] = useState<PartStatus | 'all'>(mappedStatus)

  useEffect(() => {
    setStatusFilter(mappedStatus)
  }, [statusFromUrl])

  useEffect(() => {
    const unsubscribe = subscribeAllParts((data) => {
      setParts(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    async function fetchTreadmills() {
      try {
        const data = await getAllTreadmills()
        const map = data.reduce<Record<string, TreadmillInfo>>((acc, t) => {
          acc[t.id] = {
            name: t.name || t.qrCode || t.id,
            equipmentType: (t.equipmentType || 'esteira') as EquipmentType,
          }
          return acc
        }, {})
        setTreadmillMap(map)
      } catch (err) {
        console.error('Erro ao carregar esteiras:', err)
      }
    }
    fetchTreadmills()
  }, [])

  const canAdd = hasPermission('add_parts') || hasPermission('manage_parts')
  const canEdit = hasPermission('manage_parts') || hasPermission('add_parts')
  const canDelete = hasPermission('manage_parts')
  const canUpdateStatus = hasPermission('manage_parts') || hasPermission('mark_purchased') || hasPermission('update_part_status')
  const [updatingPartId, setUpdatingPartId] = useState<string | null>(null)

  const handleDeletePart = async (partId: string) => {
    if (!canDelete) return
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.'
    )
    if (!confirmed) return
    try {
      await deletePart(partId)
      setParts((current) => current.filter((part) => part.id !== partId))
    } catch (error) {
      console.error('Erro ao excluir peça:', error)
      window.alert('Não foi possível excluir a peça. Tente novamente.')
    }
  }

  // Filtrar peças pela aba ativa (tipo do equipamento vinculado)
  const partsByTab = useMemo(() => {
    return parts.filter((part) => {
      const info = treadmillMap[part.treadmillId]
      return (info?.equipmentType || 'esteira') === activeTab
    })
  }, [parts, activeTab, treadmillMap])

  const filteredParts = useMemo(() => {
    return partsByTab.filter((part) => {
      const treadmillName = treadmillMap[part.treadmillId]?.name || part.treadmillId || ''
      const matchesSearch =
        part.name.toLowerCase().includes(search.toLowerCase()) ||
        treadmillName.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || part.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [partsByTab, search, statusFilter, treadmillMap])

  const stats = useMemo(() => ({
    missing: partsByTab.filter((p) => p.status === 'faltando').length,
    purchased: partsByTab.filter((p) => p.status === 'comprada').length,
    received: partsByTab.filter((p) => p.status === 'recebida').length,
  }), [partsByTab])

  const tabBackLink = activeTab === 'bike'
    ? '/dashboard/bikes'
    : activeTab === 'eliptico'
    ? '/dashboard/elipticos'
    : '/dashboard/esteiras'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Peças</h1>
          <p className="text-muted-foreground">
            Gerencie o inventário de peças do sistema
          </p>
        </div>
        {canAdd && (
          <Button asChild>
            <Link href="/dashboard/pecas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Peça
            </Link>
          </Button>
        )}
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-danger/15">
                <Package className="h-5 w-5 text-status-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.missing}</p>
                <p className="text-sm text-muted-foreground">Faltando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-info/15">
                <Package className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.purchased}</p>
                <p className="text-sm text-muted-foreground">Compradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-success/15">
                <Package className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.received}</p>
                <p className="text-sm text-muted-foreground">Recebidas</p>
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
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou equipamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PartStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-input/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="faltando">Faltando</SelectItem>
                <SelectItem value="comprada">Comprada</SelectItem>
                <SelectItem value="recebida">Recebida</SelectItem>
              </SelectContent>
            </Select>
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
          ) : filteredParts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma peça encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando uma nova peça para este tipo de equipamento'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow
                    key={part.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a')) return
                      router.push(`/dashboard/pecas/${part.id}/editar`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.push(`/dashboard/pecas/${part.id}/editar`)
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {part.photoUrl ? (
                          <img
                            src={part.photoUrl}
                            alt={part.name}
                            className="h-10 w-10 rounded object-contain border border-border/30"
                          />
                        ) : (
                          <Package className="h-10 w-10 rounded bg-muted/10 p-2 text-muted-foreground" />
                        )}
                        <span>{part.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {part.treadmillId ? (
                        <Link href={`/dashboard/esteiras/${part.treadmillId}?back=${tabBackLink}`}>
                          <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                            {treadmillMap[part.treadmillId]?.name || part.treadmillId}
                          </code>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-muted-foreground truncate">
                      {part.notes || 'Sem descrição'}
                    </TableCell>
                    <TableCell>{part.quantity}</TableCell>
                    <TableCell>
                      <StatusBadge status={part.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {part.expectedDelivery
                        ? format(part.expectedDelivery, "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
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
                          {canEdit && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/pecas/${part.id}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Peça
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDeletePart(part.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                          {canUpdateStatus && part.status !== 'comprada' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                setUpdatingPartId(part.id)
                                try {
                                  await updatePart(part.id, { status: 'comprada' })
                                } catch (err) {
                                  console.error('Erro alterando status:', err)
                                } finally {
                                  setUpdatingPartId(null)
                                }
                              }}
                              disabled={updatingPartId === part.id}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Marcar como Comprada
                            </DropdownMenuItem>
                          )}
                          {canUpdateStatus && part.status !== 'recebida' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                setUpdatingPartId(part.id)
                                try {
                                  await updatePart(part.id, { status: 'recebida' })
                                } catch (err) {
                                  console.error('Erro alterando status:', err)
                                } finally {
                                  setUpdatingPartId(null)
                                }
                              }}
                              disabled={updatingPartId === part.id}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Marcar como Recebida
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/esteiras/${part.treadmillId}?back=${tabBackLink}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Equipamento
                            </Link>
                          </DropdownMenuItem>
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
