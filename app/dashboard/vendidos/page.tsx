'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { subscribeTreadmills, getTreadmillsByStatus, updateTreadmill } from '@/lib/services/treadmill-service'
import { getStatusLabel, getStatusColor } from '@/lib/types'
import type { Treadmill, TreadmillStatus, TreadmillFilters } from '@/lib/types'
import { Package, Plus, Search, MoreHorizontal, Edit, Trash2, RotateCcw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function VendidosPage() {
  const { hasPermission } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<TreadmillFilters>({
    search: '',
    status: 'vendido',
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
    })

    return () => unsubscribe()
  }, [])

  const canManage = hasPermission('manage_parts') || hasPermission('create_treadmill')

  const filteredTreadmills = useMemo(() => {
    let result = treadmills.filter(t => t.status === 'vendido')

    if (debouncedFilters.search) {
      const term = debouncedFilters.search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.brand.toLowerCase().includes(term) ||
        t.model.toLowerCase().includes(term) ||
        t.serialNumber.toLowerCase().includes(term) ||
        t.qrCode.toLowerCase().includes(term)
      )
    }

    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [treadmills, debouncedFilters])

  const handleSearchChange = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }))
    }, 300)

    setSearchTimeout(timeout)
  }

  const handleRestoreTreadmill = async (id: string, currentStatus: TreadmillStatus) => {
    const confirmed = window.confirm(
      'Tem certeza que deseja restaurar esta esteira para o status anterior? Ela deixará de aparecer na lista de vendidos.'
    )
    if (!confirmed) return

    try {
      // Restaurar para 'pronta' ou outro status apropriado
      await updateTreadmill(id, { status: 'pronta' })
      setTreadmills((current) => current.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Erro ao restaurar esteira:', error)
      window.alert('Não foi possível restaurar a esteira. Tente novamente.')
    }
  }

  const stats = {
    total: treadmills.filter((t) => t.status === 'vendido').length,
    thisMonth: treadmills.filter((t) => {
      if (t.status !== 'vendido') return false
      const now = new Date()
      const updated = new Date(t.updatedAt)
      return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Esteiras Vendidas</h1>
          <p className="text-muted-foreground">
            Histórico de esteiras já vendidas do sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/15">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Vendidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/15">
                <Package className="h-5 w-5 text-green-600" />
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, marca, modelo ou série..."
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
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma esteira vendida encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {filters.search
                  ? 'Tente ajustar os filtros de busca'
                  : 'Ainda não há esteiras marcadas como vendidas'}
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
                      router.push(`/dashboard/esteiras/${treadmill.id}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.push(`/dashboard/esteiras/${treadmill.id}`)
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
                      {treadmill.deliveryStatus === 'pendente'
                        ? 'Pendente'
                        : treadmill.deliveryStatus === 'em_transito'
                        ? 'Em Trânsito'
                        : treadmill.deliveryStatus === 'entregue'
                        ? 'Entregue'
                        : treadmill.deliveryStatus === 'cancelado'
                        ? 'Cancelado'
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {treadmill.saleDate ? format(treadmill.saleDate, 'dd/MM/yyyy') : format(treadmill.updatedAt, "dd/MM/yyyy", { locale: ptBR })}
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
                            <Link href={`/dashboard/esteiras/${treadmill.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <DropdownMenuItem
                              onClick={() => handleRestoreTreadmill(treadmill.id, treadmill.status)}
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
