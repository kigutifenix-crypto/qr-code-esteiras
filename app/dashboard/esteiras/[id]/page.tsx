'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { getTreadmill } from '@/lib/services/treadmill-service'
import { getMaintenanceByTreadmill } from '@/lib/services/maintenance-service'
import { getPartsByTreadmill } from '@/lib/services/parts-service'
import type { Treadmill, MaintenanceRecord, Part } from '@/lib/types'
import {
  ArrowLeft,
  Edit,
  QrCode,
  Wrench,
  Package,
  Calendar,
  User,
  Zap,
  Gauge,
  Weight,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EsteiraDetailPage() {
  const params = useParams()
  const { hasPermission } = useAuth()
  const [treadmill, setTreadmill] = useState<Treadmill | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    async function loadData() {
      try {
        const [treadmillData, maintenanceData, partsData] = await Promise.all([
          getTreadmill(id),
          getMaintenanceByTreadmill(id),
          getPartsByTreadmill(id),
        ])

        setTreadmill(treadmillData)
        setMaintenance(maintenanceData)
        setParts(partsData)
      } catch (error) {
        console.error('Error loading treadmill data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const canEdit = hasPermission('edit_treadmill')

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
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (!treadmill) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Esteira não encontrada</h2>
        <p className="text-muted-foreground mt-2">
          A esteira solicitada não existe ou foi removida.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/esteiras">Voltar para lista</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link href="/dashboard/esteiras">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-bold tracking-tight truncate">{treadmill.name}</h1>
              <StatusBadge status={treadmill.status} />
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2">
              {treadmill.brand} - {treadmill.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <Link href={`/dashboard/esteiras/${id}/qrcode`}>
              <QrCode className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">QR Code</span>
              <span className="sm:hidden">QR</span>
            </Link>
          </Button>
          {canEdit && (
            <Button size="sm" asChild className="flex-1 sm:flex-none">
              <Link href={`/dashboard/esteiras/${id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
                <span className="sm:hidden">Edit</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-sm">
          {treadmill.qrCode}
        </Badge>
        {treadmill.serialNumber && (
          <Badge variant="secondary" className="font-mono text-sm">
            S/N: {treadmill.serialNumber}
          </Badge>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="maintenance">
            Manutenção ({maintenance.length})
          </TabsTrigger>
          <TabsTrigger value="parts">
            Peças ({parts.length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Technical Specs */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Especificações Técnicas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <InfoRow
                  icon={Zap}
                  label="Voltagem"
                  value={treadmill.voltage || 'Não informado'}
                />
                <InfoRow
                  icon={Gauge}
                  label="Potência do Motor"
                  value={treadmill.motorPower || 'Não informado'}
                />
                <InfoRow
                  icon={Weight}
                  label="Peso Suportado"
                  value={treadmill.maxWeight || 'Não informado'}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Velocidade Máxima"
                  value={treadmill.maxSpeed || 'Não informado'}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Inclinação"
                  value={treadmill.incline || 'Não informado'}
                />
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <InfoRow
                  icon={Calendar}
                  label="Data de Cadastro"
                  value={format(treadmill.createdAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                />
                <InfoRow
                  icon={User}
                  label="Cadastrado por"
                  value={treadmill.createdByName || 'Não informado'}
                />
                <InfoRow
                  icon={Calendar}
                  label="Última Atualização"
                  value={format(treadmill.updatedAt, "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                />
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {treadmill.description && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {treadmill.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {treadmill.specifications && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Especificações Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {treadmill.specifications}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Histórico de Manutenção</h3>
            {hasPermission('create_maintenance') && (
              <Button asChild>
                <Link href={`/dashboard/manutencao/nova?esteira=${id}`}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Nova Manutenção
                </Link>
              </Button>
            )}
          </div>

          {maintenance.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma manutenção registrada
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {maintenance.map((record) => (
                <Card key={record.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          Manutenção - {format(record.createdAt, 'dd/MM/yyyy')}
                        </CardTitle>
                        <CardDescription>
                          Técnico: {record.technicianName}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          record.status === 'concluida'
                            ? 'default'
                            : record.status === 'aguardando_pecas'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {record.status === 'concluida'
                          ? 'Concluída'
                          : record.status === 'aguardando_pecas'
                          ? 'Aguardando Peças'
                          : 'Em Andamento'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Problemas: </span>
                        <span className="text-muted-foreground">
                          {record.problems}
                        </span>
                      </div>
                      {record.diagnosis && (
                        <div>
                          <span className="font-medium">Diagnóstico: </span>
                          <span className="text-muted-foreground">
                            {record.diagnosis}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Parts Tab */}
        <TabsContent value="parts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Peças Relacionadas</h3>
            {hasPermission('add_parts') && (
              <Button asChild>
                <Link href={`/dashboard/pecas/nova?esteira=${id}`}>
                  <Package className="mr-2 h-4 w-4" />
                  Adicionar Peça
                </Link>
              </Button>
            )}
          </div>

          {parts.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma peça registrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {parts.map((part) => (
                <Card key={part.id} className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{part.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {part.code} | Qtd: {part.quantity}
                        </p>
                      </div>
                      <StatusBadge status={part.status} size="sm" />
                    </div>
                    {part.expectedDelivery && part.status === 'comprada' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Previsão:{' '}
                        {format(part.expectedDelivery, 'dd/MM/yyyy')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
