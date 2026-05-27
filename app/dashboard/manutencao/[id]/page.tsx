"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { getMaintenance, deleteMaintenance } from '@/lib/services/maintenance-service'
import type { MaintenanceRecord } from '@/lib/types'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const id = params.id as string

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await getMaintenance(id)
        setRecord(res)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!hasPermission('delete_maintenance')) return
    const conf = window.confirm('Confirma exclusão desta manutenção? Esta ação é irreversível.')
    if (!conf) return

    try {
      setDeleting(true)
      await deleteMaintenance(id)
      router.push('/dashboard/manutencao')
    } catch (err) {
      console.error(err)
      window.alert('Falha ao excluir manutenção')
    } finally {
      setDeleting(false)
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
        <Skeleton className="h-[400px] max-w-2xl" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Manutenção não encontrada</h2>
        <p className="text-muted-foreground mt-2">Este registro pode ter sido removido.</p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/dashboard/manutencao">Voltar</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/manutencao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Manutenção #{record.id.slice(-6)}</h1>
          <p className="text-muted-foreground">{format(record.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
          <CardDescription>Técnico: {record.technicianName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Problemas</h3>
              <p className="text-muted-foreground">{record.problems}</p>
            </div>
            {record.diagnosis && (
              <div>
                <h3 className="font-medium">Diagnóstico</h3>
                <p className="text-muted-foreground">{record.diagnosis}</p>
              </div>
            )}
            {record.notes && (
              <div>
                <h3 className="font-medium">Observações</h3>
                <p className="text-muted-foreground">{record.notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              {hasPermission('edit_maintenance') && (
                <Button asChild>
                  <Link href={`/dashboard/manutencao/${record.id}/editar`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              )}
              {hasPermission('delete_maintenance') && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
