'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Archive, Eye, RotateCcw } from 'lucide-react'
import { getArchivedTreadmills, restoreArchivedTreadmill } from '@/lib/services/treadmill-service'
import type { ArchivedTreadmill } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ArchivedPage() {
  const [treadmills, setTreadmills] = useState<ArchivedTreadmill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchArchivedTreadmills = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getArchivedTreadmills()
      setTreadmills(data)
    } catch (err) {
      console.error('Erro ao buscar esteiras arquivadas:', err)
      setTreadmills([])
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as esteiras arquivadas. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRestore = async (archiveId: string) => {
    setRestoringId(archiveId)
    try {
      await restoreArchivedTreadmill(archiveId)
      toast({
        title: 'Restaurado com sucesso',
        description: 'A esteira foi restaurada para a lista ativa.',
      })
      await fetchArchivedTreadmills()
    } catch (err) {
      console.error('Erro ao restaurar esteira arquivada:', err)
      toast({
        title: 'Falha ao restaurar',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível restaurar esta esteira arquivada.',
        variant: 'destructive',
      })
    } finally {
      setRestoringId(null)
    }
  }

  useEffect(() => {
    let mounted = true

    fetchArchivedTreadmills().catch((err) => {
      if (mounted) {
        setTreadmills([])
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar arquivadas')
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [fetchArchivedTreadmills])

  const filteredTreadmills = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return treadmills

    return treadmills.filter((t) =>
      [t.name, t.brand, t.model, t.serialNumber, t.qrCode, t.originalId]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [search, treadmills])

  const stats = {
    total: treadmills.length,
    archivedThisMonth: treadmills.filter((t) => {
      const now = new Date()
      return (
        t.archivedAt.getMonth() === now.getMonth() &&
        t.archivedAt.getFullYear() === now.getFullYear()
      )
    }).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Esteiras Arquivadas</h1>
          <p className="text-muted-foreground">
            Lista oculta de esteiras que foram arquivadas como backup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/esteiras">Voltar para Esteiras</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Total arquivadas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Arquivadas este mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{stats.archivedThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por nome, marca, modelo, QR ou ID original..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-input/50"
          />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Falha ao carregar</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button variant="outline" onClick={fetchArchivedTreadmills}>
                Recarregar
              </Button>
            </div>
          ) : filteredTreadmills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma esteira arquivada encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search ? 'Ajuste seus critérios de busca.' : 'A lista de arquivos está vazia no momento.'}
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
                  <TableHead>Arquivado em</TableHead>
                  <TableHead>ID original</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreadmills.map((treadmill) => (
                  <TableRow key={treadmill.id} className="group">
                    <TableCell className="font-medium">{treadmill.name}</TableCell>
                    <TableCell>{treadmill.brand || '-'}</TableCell>
                    <TableCell>{treadmill.model || '-'}</TableCell>
                    <TableCell>{treadmill.status}</TableCell>
                    <TableCell>{format(treadmill.archivedAt, 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {treadmill.originalId}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/archived/${treadmill.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => handleRestore(treadmill.id)}
                          disabled={restoringId === treadmill.id}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
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
