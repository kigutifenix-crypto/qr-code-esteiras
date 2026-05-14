'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react'
import { getPart, updatePart } from '@/lib/services/parts-service'
import type { Part, PartStatus } from '@/lib/types'

function formatDateInput(value?: Date) {
  if (!value) return ''
  return value.toISOString().split('T')[0]
}

export default function EditarPecaPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [part, setPart] = useState<Part | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    quantity: 1,
    status: 'faltando' as PartStatus,
    expectedDelivery: '',
    supplier: '',
    notes: '',
  })

  const id = params.id as string

  useEffect(() => {
    async function loadPart() {
      setLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const partData = await getPart(id)
        if (!partData) {
          setNotFound(true)
          return
        }

        setPart(partData)
        setFormData({
          name: partData.name,
          code: partData.code,
          quantity: partData.quantity,
          status: partData.status,
          expectedDelivery: formatDateInput(partData.expectedDelivery),
          supplier: partData.supplier || '',
          notes: partData.notes || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar a peça')
      } finally {
        setLoading(false)
      }
    }

    loadPart()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      if (!part) return

      await updatePart(part.id, {
        name: formData.name,
        code: formData.code,
        quantity: formData.quantity,
        status: formData.status,
        supplier: formData.supplier || undefined,
        notes: formData.notes || undefined,
        expectedDelivery: formData.expectedDelivery
          ? new Date(formData.expectedDelivery)
          : undefined,
      })

      router.push('/dashboard/pecas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a peça')
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
        <Skeleton className="h-[480px]" />
      </div>
    )
  }

  if (notFound || !part) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Peça não encontrada</h2>
        <p className="text-muted-foreground mt-2">
          A peça solicitada não existe ou foi removida.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/pecas">Voltar para peças</Link>
        </Button>
      </div>
    )
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
          <h1 className="text-2xl font-bold tracking-tight">Editar Peça</h1>
          <p className="text-muted-foreground">
            Atualize as informações e o status da peça.
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
            <CardTitle>Informações da Peça</CardTitle>
            <CardDescription>Atualize os dados básicos da peça</CardDescription>
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
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as PartStatus,
                    }))
                  }
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faltando">Faltando</SelectItem>
                    <SelectItem value="comprada">Comprada</SelectItem>
                    <SelectItem value="recebida">Recebida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Detalhes de Aquisição</CardTitle>
            <CardDescription>Atualize fornecedor, data esperada e observações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Previsão de entrega</Label>
                <Input
                  id="expectedDelivery"
                  name="expectedDelivery"
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={handleChange}
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="bg-input/50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/pecas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
