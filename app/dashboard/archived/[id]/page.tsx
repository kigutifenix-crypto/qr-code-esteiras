'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { getArchivedTreadmill, restoreArchivedTreadmill } from '@/lib/services/treadmill-service'
import type { ArchivedTreadmill } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ArchivedTreadmillDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [treadmill, setTreadmill] = useState<ArchivedTreadmill | null>(null)
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadArchivedTreadmill() {
      setLoading(true)
      setError(null)
      try {
        const data = await getArchivedTreadmill(id)
        if (!data) {
          setError('Esteira arquivada não encontrada.')
          setTreadmill(null)
        } else {
          setTreadmill(data)
        }
      } catch (err) {
        console.error('Erro ao carregar esteira arquivada:', err)
        setError(err instanceof Error ? err.message : 'Não foi possível carregar a esteira arquivada.')
      } finally {
        setLoading(false)
      }
    }

    loadArchivedTreadmill()
  }, [id])

  const handleRestore = async () => {
    if (!treadmill) return
    setRestoring(true)
    try {
      await restoreArchivedTreadmill(id)
      toast({
        title: 'Restaurado com sucesso',
        description: 'A esteira foi movida de volta para a lista ativa.',
      })
      setTreadmill(null)
    } catch (err) {
      console.error('Erro ao restaurar esteira arquivada:', err)
      toast({
        title: 'Falha ao restaurar',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível restaurar a esteira arquivada.',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[240px]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/archived">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Esteira Arquivada</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Verifique se o arquivo ainda existe ou volte para a lista de arquivadas.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/archived">Voltar para arquivadas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/archived">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{treadmill?.name || 'Esteira Arquivada'}</h1>
            <p className="text-muted-foreground">
              {treadmill?.brand} - {treadmill?.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/archived">Voltar</Link>
          </Button>
          <Button onClick={handleRestore} disabled={restoring}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Dados da Esteira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p>{treadmill?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marca</p>
              <p>{treadmill?.brand || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modelo</p>
              <p>{treadmill?.model || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">{treadmill?.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID original</p>
              <p className="font-mono text-sm text-muted-foreground">{treadmill?.originalId}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Histórico de arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Arquivado em</p>
              <p>{treadmill ? format(treadmill.archivedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">QR Code</p>
              <p className="font-mono text-sm text-muted-foreground">{treadmill?.qrCode || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Série</p>
              <p>{treadmill?.serialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p>{treadmill?.createdAt ? format(treadmill.createdAt, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Descrição e especificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p>{treadmill?.description || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Especificações</p>
            <p>{treadmill?.specifications || '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
