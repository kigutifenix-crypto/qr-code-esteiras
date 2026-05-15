'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { getTreadmillByQRCode } from '@/lib/services/treadmill-service'
import { getMaintenanceByTreadmill } from '@/lib/services/maintenance-service'
import { getPartsByTreadmill } from '@/lib/services/parts-service'
import type { Treadmill, MaintenanceRecord, Part } from '@/lib/types'
import {
  Zap,
  Gauge,
  Weight,
  TrendingUp,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PublicTreadmillViewProps {
  qrCode: string
}

export function PublicTreadmillView({ qrCode }: PublicTreadmillViewProps) {
  const [treadmill, setTreadmill] = useState<Treadmill | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const treadmillData = await getTreadmillByQRCode(qrCode.trim().toUpperCase())

        if (treadmillData) {
          setTreadmill(treadmillData)

          const [maintenanceData, partsData] = await Promise.all([
            getMaintenanceByTreadmill(treadmillData.id),
            getPartsByTreadmill(treadmillData.id),
          ])

          setMaintenance(maintenanceData)
          setParts(partsData)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Error loading treadmill:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [qrCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (error || !treadmill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-16 w-16 text-destructive/50 mb-4" />
            <h2 className="text-xl font-semibold">Esteira não encontrada</h2>
            <p className="text-muted-foreground mt-2">
              O código QR informado não corresponde a nenhuma esteira cadastrada.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Código: {qrCode}
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Acessar Sistema</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const latestMaintenance = maintenance[0]
  const missingParts = parts.filter((p) => p.status === 'faltando')
  const purchasedParts = parts.filter((p) => p.status === 'comprada')

  const StatusIcon =
    treadmill.status === 'pronta'
      ? CheckCircle
      : treadmill.status === 'manutencao'
      ? Clock
      : AlertTriangle

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Controle de Esteiras</p>
                <p className="text-xs text-muted-foreground">Fenix Company</p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {treadmill.qrCode}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <Card
          className={`border-2 ${
            treadmill.status === 'pronta'
              ? 'border-status-success bg-status-success/5'
              : treadmill.status === 'manutencao'
              ? 'border-status-warning bg-status-warning/5'
              : 'border-status-danger bg-status-danger/5'
          }`}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div
              className={`p-3 rounded-full ${
                treadmill.status === 'pronta'
                  ? 'bg-status-success/20'
                  : treadmill.status === 'manutencao'
                  ? 'bg-status-warning/20'
                  : 'bg-status-danger/20'
              }`}
            >
              <StatusIcon
                className={`h-8 w-8 ${
                  treadmill.status === 'pronta'
                    ? 'text-status-success'
                    : treadmill.status === 'manutencao'
                    ? 'text-status-warning'
                    : 'text-status-danger'
                }`}
              />
            </div>
            <div>
              <StatusBadge status={treadmill.status} size="lg" />
              <p className="text-sm text-muted-foreground mt-1">
                {treadmill.status === 'pronta'
                  ? 'Equipamento pronto para venda'
                  : treadmill.status === 'manutencao'
                  ? 'Equipamento em processo de manutenção'
                  : 'Equipamento indisponível para venda'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Treadmill Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">{treadmill.name}</CardTitle>
            <CardDescription>
              {treadmill.brand} - {treadmill.model}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {treadmill.serialNumber && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Número de Série:</span>
                <code className="px-2 py-0.5 rounded bg-muted font-mono">
                  {treadmill.serialNumber}
                </code>
              </div>
            )}

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <SpecItem
                icon={Zap}
                label="Voltagem"
                value={treadmill.voltage || '-'}
              />
              <SpecItem
                icon={Gauge}
                label="Motor"
                value={treadmill.motorPower || '-'}
              />
              <SpecItem
                icon={Weight}
                label="Peso Suportado"
                value={treadmill.maxWeight || '-'}
              />
              <SpecItem
                icon={TrendingUp}
                label="Vel. Máxima"
                value={treadmill.maxSpeed || '-'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Status */}
        {treadmill.status === 'manutencao' && latestMaintenance && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-status-warning" />
                Situação da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Problemas Identificados:</p>
                <p className="text-sm text-muted-foreground">
                  {latestMaintenance.problems}
                </p>
              </div>
              {latestMaintenance.diagnosis && (
                <div>
                  <p className="text-sm font-medium mb-1">Diagnóstico:</p>
                  <p className="text-sm text-muted-foreground">
                    {latestMaintenance.diagnosis}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Técnico: {latestMaintenance.technicianName}</span>
                <span>•</span>
                <span>
                  Atualizado em{' '}
                  {format(latestMaintenance.updatedAt, "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Parts */}
        {missingParts.length > 0 && (
          <Card className="border-border/50 border-l-4 border-l-status-danger">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-status-danger" />
                Peças Faltando ({missingParts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {missingParts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Código: {part.code}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-status-danger/10 text-status-danger border-status-danger/30">
                      Aguardando
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchased Parts */}
        {purchasedParts.length > 0 && (
          <Card className="border-border/50 border-l-4 border-l-status-info">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-status-info" />
                Peças em Trânsito ({purchasedParts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {purchasedParts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Previsão:{' '}
                        {part.expectedDelivery
                          ? format(part.expectedDelivery, 'dd/MM/yyyy')
                          : 'Não informada'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-status-info/10 text-status-info border-status-info/30">
                      Comprada
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {treadmill.description && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {treadmill.description}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Fenix Company. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

function SpecItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}
