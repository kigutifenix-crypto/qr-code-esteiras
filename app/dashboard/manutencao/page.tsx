'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { subscribeAllMaintenance, deleteMaintenance } from '@/lib/services/maintenance-service'
import { getAllTreadmills } from '@/lib/services/treadmill-service'
import { createLog } from '@/lib/services/logs-service'
import type { MaintenanceRecord, EquipmentType } from '@/lib/types'
import { Wrench, Plus, User, Calendar, AlertTriangle, MoreHorizontal, Edit, Trash2, Dumbbell, Bike, Activity } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ManutencaoPage() {
  const { hasPermission, user } = useAuth()
  const searchParams = useSearchParams()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EquipmentType>('esteira')
  // Mapa de treadmillId -> equipmentType para filtrar manutenções por tipo
  const [treadmillTypeMap, setTreadmillTypeMap] = useState<Record<string, EquipmentType>>({})

  const statusFromUrl = searchParams.get('status')

  useEffect(() => {
    const unsubscribe = subscribeAllMaintenance((data) => {
      setRecords(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    async function loadTreadmillTypes() {
      try {
        const treadmills = await getAllTreadmills()
        const map = treadmills.reduce<Record<string, EquipmentType>>((acc, t) => {
          acc[t.id] = (t.equipmentType || 'esteira') as EquipmentType
          return acc
        }, {})
        setTreadmillTypeMap(map)
      } catch (err) {
        console.error('Erro ao carregar tipos de equipamento:', err)
      }
    }
    loadTreadmillTypes()
  }, [])

  const canCreate = hasPermission('create_maintenance')
  const canEdit = hasPermission('edit_maintenance')
  const canDelete = hasPermission('delete_maintenance')

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    if (!canDelete) return
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.'
    )
    if (!confirmed) return
    try {
      await deleteMaintenance(maintenanceId)
      setRecords((current) => current.filter((record) => record.id !== maintenanceId))
      try {
        await createLog({
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          action: 'delete',
          entity: 'maintenance',
          entityId: maintenanceId,
          details: `Deleted maintenance ${maintenanceId}`,
        })
      } catch (e) {
        console.warn('Failed to write maintenance delete log', e)
      }
    } catch (error) {
      console.error('Erro ao excluir manutenção:', error)
      window.alert('Não foi possível excluir a manutenção. Tente novamente.')
    }
  }

  const getStatusBadge = (status: MaintenanceRecord['status']) => {
    switch (status) {
      case 'em_andamento':
        return <Badge variant="outline" className="bg-status-warning/15 text-status-warning border-status-warning/30">Em Andamento</Badge>
      case 'aguardando_pecas':
        return <Badge variant="outline" className="bg-status-info/15 text-status-info border-status-info/30">Aguardando Peças</Badge>
      case 'concluida':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success border-status-success/30">Concluída</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Filtrar registros pelo tipo de equipamento da aba ativa
  const recordsByTab = useMemo(() => {
    return records.filter((r) => (treadmillTypeMap[r.treadmillId] || 'esteira') === activeTab)
  }, [records, activeTab, treadmillTypeMap])

  // Filtrar por status da URL
  const filteredRecords = statusFromUrl === 'active'
    ? recordsByTab.filter((r) => r.status !== 'concluida')
    : statusFromUrl === 'completed'
    ? recordsByTab.filter((r) => r.status === 'concluida')
    : recordsByTab

  const showActiveSection = statusFromUrl !== 'completed'
  const showCompletedSection = statusFromUrl !== 'active'

  const activeRecords = filteredRecords.filter((r) => r.status !== 'concluida')
  const completedRecords = filteredRecords.filter((r) => r.status === 'concluida')

  // Stats por aba
  const statsByTab = useMemo(() => {
    return {
      emAndamento: recordsByTab.filter((r) => r.status === 'em_andamento').length,
      aguardando: recordsByTab.filter((r) => r.status === 'aguardando_pecas').length,
      concluidas: recordsByTab.filter((r) => r.status === 'concluida').length,
    }
  }, [recordsByTab])

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
          <h1 className="text-2xl font-bold tracking-tight">Manutenções</h1>
          <p className="text-muted-foreground">
            Gerencie todas as manutenções do sistema
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/manutencao/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Manutenção
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
              <div className="p-3 rounded-lg bg-status-warning/15">
                <Wrench className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsByTab.emAndamento}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-info/15">
                <AlertTriangle className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsByTab.aguardando}</p>
                <p className="text-sm text-muted-foreground">Aguardando Peças</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-success/15">
                <Wrench className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsByTab.concluidas}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Maintenance */}
      {showActiveSection && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Manutenções Ativas</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : activeRecords.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma manutenção ativa nesta categoria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeRecords.map((record) => (
                <Card key={record.id} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          Manutenção #{record.id.slice(-6)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3" />
                          {record.technicianName}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(record.status)}
                        {(canEdit || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/manutencao/${record.id}/editar`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMaintenance(record.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {record.photoUrl && (
                        <div className="overflow-hidden rounded-lg border border-border/50">
                          <img
                            src={record.photoUrl}
                            alt={`Foto da manutenção ${record.id}`}
                            className="h-48 w-full object-contain bg-black/5"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Problemas:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {record.problems}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(record.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/esteiras/${record.treadmillId}?back=${tabBackLink}`}>
                            Ver Equipamento
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Maintenance */}
      {showCompletedSection && completedRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Manutenções Concluídas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedRecords.slice(0, 6).map((record) => (
              <Link key={record.id} href={`/dashboard/manutencao/${record.id}`} className="block">
                <Card className="border-border/50 opacity-90 hover:opacity-100 hover:shadow-sm transition">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm">
                        Manutenção #{record.id.slice(-6)}
                      </CardTitle>
                      {getStatusBadge(record.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {record.technicianName} - {format(record.createdAt, "dd/MM/yyyy")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
