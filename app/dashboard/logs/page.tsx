'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { subscribeAllLogs, deleteLog } from '@/lib/services/logs-service'
import type { SystemLog } from '@/lib/types'
import { Search, Trash2, FileText, User, Calendar, Activity } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function LogsPage() {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeAllLogs((data) => {
      setLogs(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const canDeleteLogs = hasPermission('manage_settings')

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase())
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter
    return matchesSearch && matchesEntity
  })

  const handleDeleteLog = async (logId: string) => {
    setDeletingLogId(logId)
    try {
      await deleteLog(logId)
    } catch (err) {
      console.error('Erro ao deletar log:', err)
    } finally {
      setDeletingLogId(null)
    }
  }

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'treadmill':
        return '🏃'
      case 'maintenance':
        return '🔧'
      case 'part':
        return '⚙️'
      case 'user':
        return '👤'
      default:
        return '📝'
    }
  }

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'treadmill':
        return 'Esteira'
      case 'maintenance':
        return 'Manutenção'
      case 'part':
        return 'Peça'
      case 'user':
        return 'Usuário'
      default:
        return entity
    }
  }

  const stats = {
    total: logs.length,
    today: logs.filter(log =>
      log.createdAt.toDateString() === new Date().toDateString()
    ).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os registros de atividade do sistema.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-info/15">
                <FileText className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-success/15">
                <Activity className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-sm text-muted-foreground">Logs Hoje</p>
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
                placeholder="Buscar por usuário, ação ou detalhes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">Todas as Entidades</option>
              <option value="treadmill">Esteiras</option>
              <option value="maintenance">Manutenções</option>
              <option value="part">Peças</option>
              <option value="user">Usuários</option>
            </select>
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
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhum log encontrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search || entityFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Os logs do sistema aparecerão aqui'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                  {canDeleteLogs && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="text-sm text-muted-foreground">
                      {format(log.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{log.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEntityIcon(log.entity)}</span>
                        <span className="text-sm">{getEntityLabel(log.entity)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>
                    {canDeleteLogs && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              disabled={deletingLogId === log.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Deletar log</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar Log</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar este log? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteLog(log.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
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
