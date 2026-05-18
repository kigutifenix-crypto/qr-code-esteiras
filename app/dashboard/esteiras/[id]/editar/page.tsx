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
import { getTreadmill, updateTreadmill } from '@/lib/services/treadmill-service'
import type { TreadmillStatus } from '@/lib/types'

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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const id = params.id as string

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
      })

      router.push(`/dashboard/esteiras/${id}`)
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
                </SelectContent>
              </Select>
            </div>
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
