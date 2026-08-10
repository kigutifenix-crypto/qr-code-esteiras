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
  Dumbbell,
  MoreHorizontal,
  Printer,
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
  const { hasPermission, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [relatedCounts, setRelatedCounts] = useState<{ maintenance: number; parts: number } | null>(null)
  const [archiveMode, setArchiveMode] = useState<'archive' | 'delete'>('archive')
  const [printingLabels, setPrintingLabels] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Obter status da URL, se houver
  const statusFromUrl = searchParams.get('status')
  const status = ['all', 'pronta', 'manutencao', 'aguardando_pecas', 'vendido'].includes(statusFromUrl ?? '')
    ? (statusFromUrl as TreadmillStatus | 'all')
    : 'all'
  
  const [filters, setFilters] = useState<TreadmillFilters>({
    search: '',
    status,
    hasPartsMissing: null,
    hasPartsPurchased: null,
    equipmentType: 'esteira',
  })

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Atualizar filtros quando a URL mudar
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

  // Seleção de máquinas
  const allVisibleIds = filteredTreadmills.map(t => t.id)
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))
  const someSelected = allVisibleIds.some(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allVisibleIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allVisibleIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    async function fetchCounts() {
      if (!deleteId) return
      try {
        const counts = await countRelatedRecords(deleteId)
        setRelatedCounts(counts)
      } catch (err) {
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
            details: `Archived treadmill ${deleteId}`,
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
            details: `Deleted treadmill ${deleteId}`,
          })
        } catch (e) {
          console.warn('Failed to write delete log', e)
        }
      }

      setDeleteId(null)
      setRelatedCounts(null)
    } catch (error) {
      console.error('Error removing treadmill:', error)
    }
  }

  const canCreate = hasPermission('create_treadmill')
  const canEdit = hasPermission('edit_treadmill')
  const canDelete = hasPermission('delete_treadmill')

  const generateLabels = async (items: Treadmill[]) => {
    if (items.length === 0) return

    setPrintingLabels(true)
    try {
      const origin = window.location.origin
      const QRCodeLib = (await import('qrcode')).default

      const pages = await Promise.all(
        items.map(async (t, idx) => {
          const url = `${origin}/esteira/${t.qrCode}`
          const imgSrc = await QRCodeLib.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          })
          const isLast = idx === items.length - 1
          return `
            <div class="page${isLast ? '' : ' page-break'}">
              <div class="qr-container">
                <div class="header">
                  <span class="company">FENIX COMPANY</span>
                  <span class="badge">Esteira</span>
                </div>
                <h1>${t.name}</h1>
                <p class="subtitle">${t.brand || ''}${t.brand && t.model ? ' — ' : ''}${t.model || ''}</p>
                <div class="qr-wrap">
                  <img src="${imgSrc}" alt="QR Code" width="240" height="240" />
                </div>
                <div class="code">${t.qrCode}</div>
                <p class="scan-text">Escaneie para ver detalhes</p>
              </div>
            </div>`
        })
      )

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiquetas QR Code — Esteiras (${items.length})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; }
    .no-print {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      background: #1e293b; color: white;
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .no-print span { font-size: 14px; opacity: 0.8; }
    .no-print button {
      padding: 8px 28px; background: #3b82f6; color: white;
      border: none; border-radius: 6px; cursor: pointer;
      font-size: 14px; font-weight: 700; letter-spacing: 0.3px;
    }
    .no-print button:hover { background: #2563eb; }
    .spacer { height: 50px; }
    .page {
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
      background: white;
    }
    .page-break { page-break-after: always; border-bottom: 2px dashed #e2e8f0; }
    .qr-container { text-align: center; padding: 40px; max-width: 420px; width: 100%; }
    .header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .company { font-size: 13px; font-weight: 800; color: #3b82f6; letter-spacing: 2px; text-transform: uppercase; }
    .badge { font-size: 12px; font-weight: 700; color: #1e40af; background: #dbeafe; padding: 3px 14px; border-radius: 20px; border: 1px solid #93c5fd; }
    h1 { font-size: 30px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
    .subtitle { font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 24px; }
    .qr-wrap { display: flex; justify-content: center; margin-bottom: 20px; }
    .qr-wrap img { border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.13); border: 6px solid #fff; }
    .code { font-family: monospace; font-size: 20px; font-weight: 800; color: #1e293b; background: #f1f5f9; display: inline-block; padding: 8px 24px; border-radius: 8px; margin-bottom: 10px; }
    .scan-text { font-size: 14px; font-weight: 600; color: #64748b; }
    @media print {
      body { background: white; }
      .no-print, .spacer { display: none !important; }
      .page { min-height: 100vh; border: none; }
      .page-break { border-bottom: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span>🖨️ ${items.length} etiqueta(s) de Esteiras — 1 por página</span>
    <button onclick="window.print()">Imprimir Todas</button>
  </div>
  <div class="spacer"></div>
  ${pages.join('\n')}
</body>
</html>`)
      printWindow.document.close()
    } finally {
      setPrintingLabels(false)
    }
  }

  const printAllLabels = () => generateLabels(filteredTreadmills)

  const printSelectedLabels = () => {
    const selected = filteredTreadmills.filter(t => selectedIds.has(t.id))
    generateLabels(selected)
  }

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/archived">
              Arquivadas
            </Link>
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={printSelectedLabels}
              disabled={printingLabels}
              className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Printer className="h-4 w-4" />
              {printingLabels ? 'Gerando...' : `Imprimir Selecionadas (${selectedIds.size})`}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={printAllLabels}
            disabled={filteredTreadmills.length === 0 || printingLabels}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {printingLabels ? 'Gerando...' : `Imprimir Todas (${filteredTreadmills.length})`}
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/esteiras/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova Esteira
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
                <SelectItem value="pronta">Prontas para Venda</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                <SelectItem value="vendido">Vendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Selection info bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <span><strong>{selectedIds.size}</strong> máquina(s) selecionada(s)</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="font-medium underline hover:no-underline"
          >
            Limpar seleção
          </button>
        </div>
      )}

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
                  <TableHead className="w-[48px]">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={toggleSelectAll}
                      aria-label="Selecionar todas"
                      className="h-4 w-4 cursor-pointer rounded border-2 border-slate-400 bg-white accent-blue-600 dark:bg-slate-700 dark:border-slate-500"
                    />
                  </TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreadmills.map((treadmill) => (
                  <TableRow
                    key={treadmill.id}
                    className={`group cursor-pointer ${selectedIds.has(treadmill.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a, [role="checkbox"]')) return
                      router.push(`/dashboard/esteiras/${treadmill.id}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.push(`/dashboard/esteiras/${treadmill.id}`)
                      }
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(treadmill.id)}
                        onChange={() => toggleSelect(treadmill.id)}
                        aria-label={`Selecionar ${treadmill.name}`}
                        className="h-4 w-4 cursor-pointer rounded border-2 border-slate-400 bg-white accent-blue-600 dark:bg-slate-700 dark:border-slate-500"
                      />
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 rounded bg-muted text-xs font-mono">
                        {treadmill.qrCode}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{treadmill.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{treadmill.brand}</span>
                        <span className="text-xs text-muted-foreground">
                          {treadmill.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={treadmill.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(treadmill.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-100"
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
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeleteId(treadmill.id)
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
            <AlertDialogTitle>Remover esteira</AlertDialogTitle>
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
