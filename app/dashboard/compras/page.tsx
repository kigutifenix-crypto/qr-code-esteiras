'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { markPartAsPurchased, markPartAsReceived, subscribePartsByStatus } from '@/lib/services/parts-service'
import type { Part } from '@/lib/types'
import {
  ShoppingCart,
  Package,
  Calendar,
  Check,
  Truck,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ComprasPage() {
  const { user, hasPermission } = useAuth()
  const [missingParts, setMissingParts] = useState<Part[]>([])
  const [purchasedParts, setPurchasedParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [purchaseDialog, setPurchaseDialog] = useState<Part | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    expectedDelivery: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribeMissing = subscribePartsByStatus('faltando', (data) => {
      setMissingParts(data)
      setLoading(false)
    })

    const unsubscribePurchased = subscribePartsByStatus('comprada', setPurchasedParts)

    return () => {
      unsubscribeMissing()
      unsubscribePurchased()
    }
  }, [])

  const canMarkPurchased = hasPermission('mark_purchased')
  const canMarkReceived = hasPermission('update_part_status')

  const handlePurchase = async () => {
    if (!purchaseDialog || !purchaseForm.supplier || !purchaseForm.expectedDelivery) return

    setSaving(true)
    try {
      await markPartAsPurchased(
        purchaseDialog.id,
        user?.id || '',
        purchaseForm.supplier,
        new Date(purchaseForm.expectedDelivery)
      )
      setPurchaseDialog(null)
      setPurchaseForm({ supplier: '', expectedDelivery: '' })
    } catch (error) {
      console.error('Error marking part as purchased:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReceive = async (partId: string) => {
    try {
      await markPartAsReceived(partId)
    } catch (error) {
      console.error('Error marking part as received:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground">
          Gerencie as peças faltantes e compras do sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-danger/15">
                <AlertCircle className="h-5 w-5 text-status-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{missingParts.length}</p>
                <p className="text-sm text-muted-foreground">Peças Faltando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-info/15">
                <Truck className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{purchasedParts.length}</p>
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Parts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-status-danger" />
          Peças Faltando
        </h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : missingParts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Check className="h-12 w-12 text-status-success/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma peça faltando no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {missingParts.map((part) => (
              <Card key={part.id} className="border-border/50 border-l-4 border-l-status-danger">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{part.name}</CardTitle>
                      <CardDescription>
                        Código: {part.code} | Qtd: {part.quantity}
                      </CardDescription>
                    </div>
                    <StatusBadge status={part.status} size="sm" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Solicitada em {format(part.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/esteiras/${part.treadmillId}`}>
                          Ver Esteira
                        </Link>
                      </Button>
                      {canMarkPurchased && (
                        <Button
                          size="sm"
                          onClick={() => setPurchaseDialog(part)}
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          Comprar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchased Parts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-status-info" />
          Peças em Trânsito
        </h2>
        {purchasedParts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma peça em trânsito
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {purchasedParts.map((part) => (
              <Card key={part.id} className="border-border/50 border-l-4 border-l-status-info">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{part.name}</CardTitle>
                      <CardDescription>
                        Código: {part.code} | Qtd: {part.quantity}
                      </CardDescription>
                    </div>
                    <StatusBadge status={part.status} size="sm" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Previsão:</span>
                      <span className="font-medium">
                        {part.expectedDelivery
                          ? format(part.expectedDelivery, "dd/MM/yyyy", { locale: ptBR })
                          : 'Não informada'}
                      </span>
                    </div>
                    {part.supplier && (
                      <p className="text-xs text-muted-foreground">
                        Fornecedor: {part.supplier}
                      </p>
                    )}
                    <div className="flex justify-end mt-2">
                      {canMarkReceived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReceive(part.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Marcar Recebida
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
            <DialogDescription>
              Informe os dados da compra para a peça: {purchaseDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={purchaseForm.supplier}
                onChange={(e) =>
                  setPurchaseForm((prev) => ({ ...prev, supplier: e.target.value }))
                }
                placeholder="Nome do fornecedor"
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Previsão de Entrega</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={purchaseForm.expectedDelivery}
                onChange={(e) =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    expectedDelivery: e.target.value,
                  }))
                }
                className="bg-input/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={saving || !purchaseForm.supplier || !purchaseForm.expectedDelivery}
            >
              {saving ? 'Salvando...' : 'Confirmar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
