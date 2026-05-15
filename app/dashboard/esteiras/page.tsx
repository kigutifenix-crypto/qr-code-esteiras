'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
} from '@/lib/services/treadmill-service'
import type { Treadmill, TreadmillStatus, TreadmillFilters } from '@/lib/types'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  QrCode,
  Dumbbell,
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

export default function EsteirasPage() {
  const { hasPermission } = useAuth()
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TreadmillFilters>({
    search: '',
    status: 'all',
    hasPartsMissing: null,
    hasPartsPurchased: null,
  })

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const debouncedFilters = useMemo(() => {
    return { ...filters }
  }, [filters.search, filters.status])

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeTreadmills((data) => {
      setTreadmills(data)
      setLoading(false)
    }, debouncedFilters)

    return () => unsubscribe()
  }, [debouncedFilters])

  const handleSearchChange = useCallback((value: string) => {
    // Limpar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Atualizar filtros imediatamente para status
    setFilters(prev => ({ ...prev, search: value }))

    // Debounce para busca
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }))
    }, 300)

    setSearchTimeout(timeout)
  }, [searchTimeout])

  const handleStatusFilter = useCallback((status: TreadmillStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }))
  }, [])

  const filteredTreadmills = filterTreadmills(treadmills, filters)

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteTreadmill(deleteId)
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting treadmill:', error)
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
          <h1 className="text-2xl font-bold tracking-tight">Esteiras</h1>
          <p className="text-muted-foreground">
            Gerencie todas as esteiras cadastradas no sistema
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/esteiras/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Esteira
            </Link>
          </Button>
        )}
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
                <SelectItem value="pronta">Prontas para Venda</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                <SelectItem value="indisponivel">Indisponíveis</SelectItem>
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
          ) : filteredTreadmills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma esteira encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {filters.search || filters.status !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece cadastrando uma nova esteira'}
              </p>
              {canCreate && !filters.search && filters.status === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/esteiras/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Esteira
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="hidden md:table-cell">QR Code</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden lg:table-cell">Marca / Modelo</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreadmills.map((treadmill) => (
                  <TableRow key={treadmill.id}>
                    <TableCell className="hidden md:table-cell">
                      <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                        {treadmill.qrCode}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="block">{treadmill.name}</span>
                        <span className="block md:hidden text-xs text-muted-foreground">
                          {treadmill.brand} - {treadmill.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col">
                        <span>{treadmill.brand}</span>
                        <span className="text-xs text-muted-foreground">
                          {treadmill.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge status={treadmill.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {format(treadmill.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/esteiras/${treadmill.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/esteiras/${treadmill.id}/qrcode`}>
                              <QrCode className="mr-2 h-4 w-4" />
                              QR Code
                            </Link>
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/esteiras/${treadmill.id}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteId(treadmill.id)}
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta esteira? Esta ação não pode ser
              desfeita e todos os dados relacionados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
