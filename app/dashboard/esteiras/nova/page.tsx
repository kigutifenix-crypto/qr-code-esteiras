'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useAuth } from '@/contexts/auth-context'
import { createTreadmill, getAllTreadmills } from '@/lib/services/treadmill-service'
import { createLog } from '@/lib/services/logs-service'
import type { TreadmillStatus } from '@/lib/types'
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react'

export default function NovaEsteiraPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([])
  const [nextNumber, setNextNumber] = useState<string>('')

  const [formData, setFormData] = useState({
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
    status: 'pronta' as TreadmillStatus,
    number: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    async function loadNumbers() {
      try {
        const treadmills = await getAllTreadmills()
        const takenNumbers = treadmills.map((t) => t.qrCode)
        const allNumbers = Array.from({ length: 200 }, (_, i) => String(i + 1))
        const available = allNumbers.filter((number) => !takenNumbers.includes(number))
        setAvailableNumbers(available)
        
        // Calcular o próximo número automaticamente baseado na quantidade de esteiras
        const nextNum = String(treadmills.length + 1)
        if (available.includes(nextNum)) {
          setNextNumber(nextNum)
        } else {
          // Se o número sequencial já foi usado, pega o primeiro disponível
          setNextNumber(available[0] || '')
        }
      } catch (err) {
        console.error('Erro ao carregar números disponíveis:', err)
      }
    }

    loadNumbers()
  }, [])

  const handleUseAutoNumber = () => {
    if (nextNumber) {
      setFormData((prev) => ({ ...prev, number: nextNumber }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!formData.number) {
      setError('Selecione um número para a esteira.')
      setLoading(false)
      return
    }

    try {
      await createTreadmill({
        ...formData,
        qrCode: formData.number,
        photos: [],
        createdBy: user?.id || '',
        createdByName: user?.name || '',
      })

      // Log the creation
      try {
        await createLog({
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          action: 'create',
          entity: 'treadmill',
          entityId: formData.number,
          details: `Created treadmill ${formData.name} (${formData.number})`,
        })
      } catch (e) {
        console.warn('Failed to write creation log', e)
      }

      router.push('/dashboard/esteiras')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar esteira')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/esteiras">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Esteira</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova esteira no sistema
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

        {/* Basic Info */}
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
                <Label htmlFor="number">Número *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.number}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, number: value }))
                    }
                  >
                    <SelectTrigger id="number" className="bg-input/50 flex-1">
                      <SelectValue placeholder="Selecione um número" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNumbers.map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {nextNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseAutoNumber}
                      className="whitespace-nowrap"
                      title={`Usar o próximo número disponível: ${nextNumber}`}
                    >
                      Auto: {nextNumber}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {nextNumber && `Sugestão automática: ${nextNumber}`}
                </p>
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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs */}
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
                placeholder="Dimensões, funcionalidades especiais, etc."
                rows={3}
                className="bg-input/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
            <CardDescription>Informações detalhadas sobre o equipamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição Técnica</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreva o estado do equipamento, histórico, observações importantes..."
                rows={5}
                className="bg-input/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Esteira
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/esteiras">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
