'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { subscribeAllMaintenance } from '@/lib/services/maintenance-service'
import type { MaintenanceRecord } from '@/lib/types'
import { Wrench, Plus, User, Calendar, AlertTriangle, MoreHorizontal, Edit } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ManutencaoPage() {
  const { hasPermission } = useAuth()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeAllMaintenance((data) => {
      setRecords(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const canCreate = hasPermission('create_maintenance')
  const canEdit = hasPermission('edit_maintenance')

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

  const activeRecords = records.filter((r) => r.status !== 'concluida')
  const completedRecords = records.filter((r) => r.status === 'concluida')

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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-warning/15">
                <Wrench className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {records.filter((r) => r.status === 'em_andamento').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {records.filter((r) => r.status === 'aguardando_pecas').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {completedRecords.length}
                </p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Maintenance */}
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
              <p className="text-muted-foreground">Nenhuma manutenção ativa</p>
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
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/manutencao/${record.id}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                        <Link href={`/dashboard/esteiras/${record.treadmillId}`}>
                          Ver Esteira
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

      {/* Completed Maintenance */}
      {completedRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Manutenções Concluídas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedRecords.slice(0, 6).map((record) => (
              <Card key={record.id} className="border-border/50 opacity-75">
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
