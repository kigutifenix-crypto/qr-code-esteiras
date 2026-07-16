'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  subscribeTreadmills,
  filterTreadmills,
  deleteTreadmill,
  countRelatedRecords,
  archiveTreadmill,
} from '@/lib/services/treadmill-service'
import { createLog } from '@/lib/services/logs-service'
import type { Treadmill, TreadmillStatus, TreadmillFilters } from '@/lib/types'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  QrCode,
  Activity,
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ElipticosPage() {
  const { hasPermission, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [elipticos, setElipticos] = useState<Treadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [relatedCounts, setRelatedCounts] = useState<{ maintenance: number; parts: number } | null>(null)
  const [archiveMode, setArchiveMode] = useState<'archive' | 'delete'>('archive')

  const statusFromUrl = searchParams.get('status')
  const status = ['all', 'pronta', 'manutencao', 'aguardando_pecas', 'vendido'].includes(statusFromUrl ?? '')
    ? (statusFromUrl as TreadmillStatus | 'all')
    : 'all'

  const [filters, setFilters] = useState<TreadmillFilters>({
    search: '',
    status,
    hasPartsMissing: null,
    hasPartsPurchased: null,
    equipmentType: 'eliptico',
  })

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (statusFromUrl && ['all', 'pronta', 'manutencao', 'aguardando_pecas', 'vendido'].includes(statusFromUrl)) {
      setFilters(prev => ({ ...prev, status: statusFromUrl as TreadmillStatus | 'all' }))
    }
  }, [statusFromUrl])

  const debouncedFilters = useMemo(() => {
    return { ...filters }
  }, [filters.search, filters.status])

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeTreadmills((data) => {
      setElipticos(data)
      setLoading(false)
    }, debouncedFilters)

    return () => unsubscribe()
  }, [debouncedFilters])

  const handleSearchChange = useCallback((value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    setFilters(prev => ({ ...prev, search: value }))
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }))
    }, 300)
    setSearchTimeout(timeout)
  }, [searchTimeout])

  const handleStatusFilter = useCallback((status: TreadmillStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }))
  }, [])

  const filteredElipticos = filterTreadmills(elipticos, filters)

  useEffect(() => {
    async function fetchCounts() {
      if (!deleteId) return
      try {
        const counts = await countRelatedRecords(deleteId)
        setRelatedCounts(counts)
      } catch {
        setRelatedCounts({ maintenance: 0, parts: 0 })
      }
    }
    fetchCounts()
  }, [deleteId])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      if (archiveMode === 'archive') {
        await archiveTreadmill(deleteId)
        try {
          await createLog({
            userId: user?.id || '',
            userName: user?.name || 'Unknown',
            action: 'archive',
            entity: 'treadmill',
            entityId: deleteId,
            details: `Archived eliptico ${deleteId}`,
          })
        } catch (e) {
          console.warn('Failed to write archive log', e)
        }
      } else {
        await deleteTreadmill(deleteId)
        try {
          await createLog({
            userId: user?.id || '',
            userName: user?.name || 'Unknown',
            action: 'delete',
            entity: 'treadmill',
            entityId: deleteId,
            details: `Deleted eliptico ${deleteId}`,
          })
        } catch (e) {
          console.warn('Failed to write delete log', e)
        }
      }
      setDeleteId(null)
      setRelatedCounts(null)
    } catch (error) {
      console.error('Error removing eliptico:', error)
    }
  }

  const canCreate = hasPermission('create_treadmill')
  const canEdit = hasPermission('edit_treadmill')
  const canDelete = hasPermission('delete_treadmill')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Elípticos
          </h1>
          <p className="text-muted-foreground">
            Gerencie todos os elípticos cadastrados no sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/elipticos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Elíptico
              </Link>
            </Button>
          )}
        </div>
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
                placeholder="Buscar por nome, marca, modelo ou série..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-input/50"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-input/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pronta">Prontos para Venda</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                <SelectItem value="vendido">Vendidos</SelectItem>
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
          ) : filteredElipticos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhum elíptico encontrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {filters.search || filters.status !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece cadastrando um novo elíptico'}
              </p>
              {canCreate && !filters.search && filters.status === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/elipticos/novo">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Elíptico
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Número</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredElipticos.map((eliptico) => (
                  <TableRow
                    key={eliptico.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a')) return
                      router.push(`/dashboard/esteiras/${eliptico.id}?back=/dashboard/elipticos`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.push(`/dashboard/esteiras/${eliptico.id}?back=/dashboard/elipticos`)
                      }
                    }}
                  >
                    <TableCell>
                      <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                        {eliptico.qrCode}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{eliptico.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{eliptico.brand}</span>
                        <span className="text-xs text-muted-foreground">
                          {eliptico.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={eliptico.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(eliptico.createdAt, "dd/MM/yyyy", { locale: ptBR })}
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
                            <Link href={`/dashboard/esteiras/${eliptico.id}?back=/dashboard/elipticos`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/esteiras/${eliptico.id}/qrcode?back=/dashboard/elipticos`}>
                              <QrCode className="mr-2 h-4 w-4" />
                              QR Code
                            </Link>
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/esteiras/${eliptico.id}/editar?back=/dashboard/elipticos`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeleteId(eliptico.id)
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover elíptico</AlertDialogTitle>
            <AlertDialogDescription>
              {relatedCounts ? (
                <span>
                  Esta ação afetará <strong>{relatedCounts.maintenance}</strong> registros de
                  manutenção e <strong>{relatedCounts.parts}</strong> peças relacionadas.
                </span>
              ) : (
                'Carregando informações...'
              )}
              <div className="mt-3">
                Escolha se deseja arquivar (backup) ou excluir permanentemente:
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="archiveMode"
                value="archive"
                checked={archiveMode === 'archive'}
                onChange={() => setArchiveMode('archive')}
              />
              <span>Arquivar (salvar backup e remover dados ativos)</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="radio"
                name="archiveMode"
                value="delete"
                checked={archiveMode === 'delete'}
                onChange={() => setArchiveMode('delete')}
              />
              <span>Excluir permanentemente (irreversível)</span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={archiveMode === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {archiveMode === 'archive' ? 'Arquivar' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
