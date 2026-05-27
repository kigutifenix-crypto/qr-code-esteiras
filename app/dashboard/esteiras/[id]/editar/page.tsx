'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { getTreadmill, updateTreadmill } from '@/lib/services/treadmill-service'
import { useAuth } from '@/contexts/auth-context'
import { createLog } from '@/lib/services/logs-service'
import type { TreadmillStatus, DeliveryStatus } from '@/lib/types'

type TreadmillForm = {
  name: string
  brand: string
  model: string
  serialNumber: string
  description: string
  specifications: string
  voltage: string
  motorPower: string
  maxWeight: string
  maxSpeed: string
  incline: string
  status: TreadmillStatus
  orderNumber: string
  deliveryStatus?: DeliveryStatus
  saleDate?: string
}

export default function EditarEsteiraPage() {
  const params = useParams()
  const router = useRouter()
  const [formData, setFormData] = useState<TreadmillForm>({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    description: '',
    specifications: '',
    voltage: '220V',
    motorPower: '',
    maxWeight: '',
    maxSpeed: '',
    incline: '',
    status: 'pronta',
    orderNumber: '',
    deliveryStatus: undefined,
    saleDate: undefined,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const id = params.id as string
  const { user } = useAuth()

  useEffect(() => {
    async function loadTreadmill() {
      setLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const treadmill = await getTreadmill(id)

        if (!treadmill) {
          setNotFound(true)
          return
        }

        const formatDateInput = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : '')

        setFormData({
          name: treadmill.name,
          brand: treadmill.brand,
          model: treadmill.model,
          serialNumber: treadmill.serialNumber,
          description: treadmill.description,
          specifications: treadmill.specifications,
          voltage: treadmill.voltage || '220V',
          motorPower: treadmill.motorPower,
          maxWeight: treadmill.maxWeight,
          maxSpeed: treadmill.maxSpeed,
          incline: treadmill.incline,
          status: treadmill.status,
          orderNumber: treadmill.orderNumber || '',
          deliveryStatus: treadmill.deliveryStatus || undefined,
          saleDate: treadmill.saleDate ? formatDateInput(treadmill.saleDate) : undefined,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar a esteira')
      } finally {
        setLoading(false)
      }
    }

    loadTreadmill()
  }, [id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Validar que orderNumber é obrigatório quando status é vendido
    if (formData.status === 'vendido' && !formData.orderNumber.trim()) {
      setError('Número do pedido é obrigatório para esteiras vendidas')
      setSaving(false)
      return
    }

    try {
      await updateTreadmill(id, {
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        serialNumber: formData.serialNumber,
        description: formData.description,
        specifications: formData.specifications,
        voltage: formData.voltage,
        motorPower: formData.motorPower,
        maxWeight: formData.maxWeight,
        maxSpeed: formData.maxSpeed,
        incline: formData.incline,
        status: formData.status,
        orderNumber: formData.orderNumber || undefined,
        deliveryStatus: formData.deliveryStatus || undefined,
        saleDate: formData.saleDate ? new Date(formData.saleDate) : undefined,
      })

      router.push(`/dashboard/esteiras/${id}`)
      try {
        await createLog({
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          action: 'update',
          entity: 'treadmill',
          entityId: id,
          details: JSON.stringify({ ...formData }),
        })
      } catch (e) {
        console.warn('Failed to write update log', e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a esteira')
    } finally {
      setSaving(false)
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
        <Skeleton className="h-[500px]" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Esteira não encontrada</h2>
        <p className="text-muted-foreground mt-2">
          A esteira que você está tentando editar não existe.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/esteiras">Voltar para lista</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/esteiras/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Esteira</h1>
          <p className="text-muted-foreground">
            Atualize as informações da esteira selecionada.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados de identificação da esteira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Esteira Profissional X1"
                  required
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Número de Série</Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Ex: SN-2024-001"
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Ex: Movement"
                  required
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Ex: R5 Professional"
                  required
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descrição da esteira"
                className="bg-input/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value as TreadmillStatus }))
                }
              >
                <SelectTrigger className="bg-input/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pronta">Pronta para Venda</SelectItem>
                  <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                  <SelectItem value="indisponivel">Indisponível</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.status === 'vendido' && (
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Número do Pedido *</Label>
                <Input
                  id="orderNumber"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  placeholder="Ex: PED-2024-001"
                  required
                  className="bg-input/50"
                />
                <p className="text-xs text-muted-foreground">Campo obrigatório quando o status é "Vendido"</p>
              </div>
            )}

            {formData.status === 'vendido' && (
              <div className="space-y-2">
                <Label htmlFor="deliveryStatus">Status de Entrega</Label>
                <Select
                  value={formData.deliveryStatus}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, deliveryStatus: value as DeliveryStatus }))
                  }
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_transito">Em Trânsito</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Informe o status de entrega da esteira vendida</p>
              </div>
            )}

            {formData.status === 'vendido' && (
              <div className="space-y-2">
                <Label htmlFor="saleDate">Data da Venda</Label>
                <Input
                  id="saleDate"
                  name="saleDate"
                  type="date"
                  value={formData.saleDate || ''}
                  onChange={handleChange}
                  className="bg-input/50"
                />
                <p className="text-xs text-muted-foreground">Opcional: ajuste a data da venda, se necessário</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Especificações Técnicas</CardTitle>
            <CardDescription>Dados técnicos do equipamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="voltage">Voltagem</Label>
                <Select
                  value={formData.voltage}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, voltage: value }))
                  }
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="220V">220V</SelectItem>
                    <SelectItem value="110V">110V</SelectItem>
                    <SelectItem value="Bivolt">Bivolt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motorPower">Potência do Motor</Label>
                <Input
                  id="motorPower"
                  name="motorPower"
                  value={formData.motorPower}
                  onChange={handleChange}
                  placeholder="Ex: 2.5 HP"
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWeight">Peso Suportado</Label>
                <Input
                  id="maxWeight"
                  name="maxWeight"
                  value={formData.maxWeight}
                  onChange={handleChange}
                  placeholder="Ex: 150 kg"
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxSpeed">Velocidade Máxima</Label>
                <Input
                  id="maxSpeed"
                  name="maxSpeed"
                  value={formData.maxSpeed}
                  onChange={handleChange}
                  placeholder="Ex: 18 km/h"
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incline">Inclinação</Label>
                <Input
                  id="incline"
                  name="incline"
                  value={formData.incline}
                  onChange={handleChange}
                  placeholder="Ex: 0-15%"
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specifications">Especificações Adicionais</Label>
              <Textarea
                id="specifications"
                name="specifications"
                value={formData.specifications}
                onChange={handleChange}
                placeholder="Dados extras sobre a esteira"
                className="bg-input/50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/esteiras/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}
