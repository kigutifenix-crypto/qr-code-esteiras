'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/auth-context'
import { createPart } from '@/lib/services/parts-service'
import { getAllTreadmills } from '@/lib/services/treadmill-service'
import type { Treadmill } from '@/lib/types'
import { ArrowLeft, Loader2, Package, AlertCircle } from 'lucide-react'

export default function NovaPecaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const treadmillIdFromQuery = searchParams?.get('esteira') || ''
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingTreadmills, setLoadingTreadmills] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [formData, setFormData] = useState({
    treadmillId: treadmillIdFromQuery,
    name: '',
    code: '',
    quantity: 1,
    notes: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }))
  }

  useEffect(() => {
    const fetchTreadmills = async () => {
      try {
        setLoadingTreadmills(true)
        const data = await getAllTreadmills()
        setTreadmills(data)
      } catch (err) {
        console.error('Erro carregando esteiras:', err)
      } finally {
        setLoadingTreadmills(false)
      }
    }

    fetchTreadmills()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.treadmillId) {
        throw new Error('Informe a esteira relacionada')
      }

      await createPart({
        treadmillId: formData.treadmillId,
        name: formData.name,
        code: formData.code,
        quantity: formData.quantity,
        status: 'faltando',
        notes: formData.notes || undefined,
      })

      router.push(
        formData.treadmillId
          ? `/dashboard/esteiras/${formData.treadmillId}`
          : '/dashboard/pecas'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar peça')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pecas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Peça</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova peça relacionada a uma esteira
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

        {formData.treadmillId && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Esteira Relacionada</CardTitle>
              <CardDescription>Esteira selecionada pelo contexto da página</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-medium">ID: {formData.treadmillId}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Dados da Peça</CardTitle>
            <CardDescription>Preencha as informações básicas da peça</CardDescription>
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
                  placeholder="Ex: Esteira de Rolamento"
                  required
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Ex: PR-001"
                  required
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treadmillId">Selecione a Esteira *</Label>
                <Select
                  value={formData.treadmillId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, treadmillId: value }))
                  }
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue placeholder={loadingTreadmills ? 'Carregando...' : 'Escolha uma esteira'} />
                  </SelectTrigger>
                  <SelectContent>
                    {treadmills.length > 0 ? (
                      treadmills.map((treadmill) => (
                        <SelectItem key={treadmill.id} value={treadmill.id}>
                          {treadmill.name} — {treadmill.model}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {loadingTreadmills ? 'Carregando...' : 'Nenhuma esteira disponível'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Informações adicionais sobre a peça"
                className="bg-input/50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild>
            <Link href={formData.treadmillId ? `/dashboard/esteiras/${formData.treadmillId}` : '/dashboard/pecas'}>
              Voltar
            </Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Salvar Peça
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
