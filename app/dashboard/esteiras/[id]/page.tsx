'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { getTreadmill } from '@/lib/services/treadmill-service'
import { deleteMaintenance, getMaintenanceByTreadmill } from '@/lib/services/maintenance-service'
import { deletePart, getPartsByTreadmill } from '@/lib/services/parts-service'
import type { Treadmill, MaintenanceRecord, Part } from '@/lib/types'
import { getEquipmentTypeLabel } from '@/lib/types'
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
  Trash2,
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
  const [deletingMaintenanceId, setDeletingMaintenanceId] = useState<string | null>(null)
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null)

  const id = params.id as string
  const searchParams = useSearchParams()
  const backTo = searchParams.get('back') || '/dashboard/esteiras'

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
  const canDeleteMaintenance = hasPermission('delete_maintenance')
  const canDeleteParts = hasPermission('manage_parts')

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    if (!canDeleteMaintenance) return

    if (treadmill?.status === 'vendido') {
      window.alert('Não é possível excluir registros de manutenção de esteiras vendidas')
      return
    }

    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.'
    )
    if (!confirmed) return

    try {
      setDeletingMaintenanceId(maintenanceId)
      await deleteMaintenance(maintenanceId)
      setMaintenance((current) => current.filter((item) => item.id !== maintenanceId))
    } catch (error) {
      console.error('Erro ao excluir manutenção:', error)
      window.alert('Não foi possível excluir a manutenção. Tente novamente.')
    } finally {
      setDeletingMaintenanceId(null)
    }
  }

  const handleDeletePart = async (partId: string) => {
    if (!canDeleteParts) return

    if (treadmill?.status === 'vendido') {
      window.alert('Não é possível excluir peças de esteiras vendidas')
      return
    }

    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.'
    )
    if (!confirmed) return

    try {
      setDeletingPartId(partId)
      await deletePart(partId)
      setParts((current) => current.filter((item) => item.id !== partId))
    } catch (error) {
      console.error('Erro ao excluir peça:', error)
      window.alert('Não foi possível excluir a peça. Tente novamente.')
    } finally {
      setDeletingPartId(null)
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
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={treadmill.status === 'vendido' ? '/dashboard/vendidos' : backTo}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{treadmill.name}</h1>
              <StatusBadge status={treadmill.status} />
              {treadmill.equipmentType && treadmill.equipmentType !== 'esteira' && (
                <Badge variant="secondary" className="text-xs">
                  {getEquipmentTypeLabel(treadmill.equipmentType)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {treadmill.brand} - {treadmill.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/esteiras/${id}/qrcode`}>
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Link>
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/esteiras/${id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
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
                {treadmill.status === 'vendido' && treadmill.orderNumber && (
                  <InfoRow
                    icon={FileText}
                    label="Número do Pedido"
                    value={treadmill.orderNumber}
                  />
                )}
                {treadmill.status === 'vendido' && treadmill.deliveryStatus && (
                  <InfoRow
                    icon={Package}
                    label="Status de Entrega"
                    value={
                      treadmill.deliveryStatus === 'pendente'
                        ? 'Pendente'
                        : treadmill.deliveryStatus === 'em_transito'
                        ? 'Em Trânsito'
                        : treadmill.deliveryStatus === 'entregue'
                        ? 'Entregue'
                        : treadmill.deliveryStatus === 'cancelado'
                        ? 'Cancelado'
                        : treadmill.deliveryStatus
                    }
                  />
                )}
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
            {hasPermission('create_maintenance') && treadmill?.status !== 'vendido' && (
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
                <div key={record.id} className="relative">
                  <Link
                    href={`/dashboard/manutencao/${record.id}/editar`}
                    className="block rounded-xl border border-border/50 bg-card transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <Card className="border-0 bg-transparent">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-4">
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
                        {record.photoUrl && (
                          <div className="mb-4 overflow-hidden rounded-lg border border-border/30 bg-muted">
                            <img
                              src={record.photoUrl}
                              alt={`Foto da manutenção ${record.id}`}
                              className="w-full h-64 object-contain"
                            />
                          </div>
                        )}
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
                          {record.notes && (
                            <div>
                              <span className="font-medium">Observações: </span>
                              <span className="text-muted-foreground">
                                {record.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {canDeleteMaintenance && treadmill?.status !== 'vendido' && (
                    <Button
                      variant="destructive"
                      size="icon"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleDeleteMaintenance(record.id)
                      }}
                      className="absolute right-3 bottom-3 z-10"
                      disabled={deletingMaintenanceId === record.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Parts Tab */}
        <TabsContent value="parts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Peças Relacionadas</h3>
            {(hasPermission('add_parts') || hasPermission('manage_parts')) && treadmill?.status !== 'vendido' && (
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
                <div key={part.id} className="relative">
                  <Link
                    href={`/dashboard/pecas/${part.id}/editar`}
                    className="block rounded-xl border border-border/50 bg-card transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <Card className="border-0 bg-transparent">
                      <CardContent className="space-y-3 pt-4">
                        {part.photoUrl ? (
                          <div className="overflow-hidden rounded-lg border border-border/30 bg-muted">
                            <img
                              src={part.photoUrl}
                              alt={`Foto da peça ${part.name}`}
                              className="w-full h-56 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-56 items-center justify-center rounded-lg border border-border/30 bg-muted text-sm text-muted-foreground">
                            Sem foto
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-medium">{part.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Código: {part.code}
                            </p>
                          </div>
                          <StatusBadge status={part.status} size="sm" />
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">Quantidade: </span>
                            {part.quantity}
                          </div>
                          {part.supplier && (
                            <div>
                              <span className="font-medium text-foreground">Fornecedor: </span>
                              {part.supplier}
                            </div>
                          )}
                          {part.purchasedBy && (
                            <div>
                              <span className="font-medium text-foreground">Comprada por: </span>
                              {part.purchasedBy}
                            </div>
                          )}
                          {part.expectedDelivery && (
                            <div>
                              <span className="font-medium text-foreground">Previsão de entrega: </span>
                              {format(part.expectedDelivery, 'dd/MM/yyyy')}
                            </div>
                          )}
                          {part.purchasedAt && (
                            <div>
                              <span className="font-medium text-foreground">Data de compra: </span>
                              {format(part.purchasedAt, 'dd/MM/yyyy')}
                            </div>
                          )}
                          {part.receivedAt && (
                            <div>
                              <span className="font-medium text-foreground">Recebida em: </span>
                              {format(part.receivedAt, 'dd/MM/yyyy')}
                            </div>
                          )}
                          {part.notes && (
                            <div>
                              <span className="font-medium text-foreground">Observações: </span>
                              {part.notes}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {canDeleteParts && treadmill?.status !== 'vendido' && (
                    <Button
                      variant="destructive"
                      size="icon"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleDeletePart(part.id)
                      }}
                      className="absolute right-3 top-3 z-10"
                      disabled={deletingPartId === part.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
