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
import { createMaintenance } from '@/lib/services/maintenance-service'
import { createLog } from '@/lib/services/logs-service'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { getAllTreadmills, getTreadmill } from '@/lib/services/treadmill-service'
import type { Treadmill } from '@/lib/types'
import { ArrowLeft, Loader2, Wrench, AlertCircle } from 'lucide-react'

export default function NovaManutencaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const treadmillIdFromQuery = searchParams?.get('esteira') || ''
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingTreadmills, setLoadingTreadmills] = useState(true)
  const [treadmills, setTreadmills] = useState<Treadmill[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    treadmillId: treadmillIdFromQuery,
    problems: '',
    diagnosis: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchTreadmills() {
      try {
        setLoadingTreadmills(true)
        const data = await getAllTreadmills()
        // Filtrar esteiras vendidas - não podem ter manutenção
        const availableTreadmills = data.filter(t => t.status !== 'vendido')
        setTreadmills(availableTreadmills)
      } catch (err) {
        console.error('Erro carregando esteiras:', err)
      } finally {
        setLoadingTreadmills(false)
      }
    }

    fetchTreadmills()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.treadmillId) {
        throw new Error('Informe a esteira relacionada')
      }

      // Validar que a esteira não foi vendida
      const selectedTreadmill = await getTreadmill(formData.treadmillId)
      if (!selectedTreadmill) {
        throw new Error('Esteira não encontrada')
      }
      if (selectedTreadmill.status === 'vendido') {
        throw new Error('Não é possível criar manutenção para esteiras vendidas')
      }

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      let photoUrl: string | undefined
      if (photoFile) {
        photoUrl = await uploadImageToCloudinary(photoFile)
      }

      await createMaintenance({
        treadmillId: formData.treadmillId,
        problems: formData.problems,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        photoUrl,
        technicianId: user.id,
        technicianName: user.name,
        partsNeeded: [],
        status: 'em_andamento',
      })

      router.push(
        formData.treadmillId
          ? `/dashboard/esteiras/${formData.treadmillId}`
          : '/dashboard/manutencao'
      )
      try {
        await createLog({
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          action: 'create',
          entity: 'maintenance',
          entityId: formData.treadmillId,
          details: `Created maintenance for treadmill ${formData.treadmillId}`,
        })
      } catch (e) {
        console.warn('Failed to write maintenance creation log', e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar manutenção')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/manutencao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Manutenção</h1>
          <p className="text-muted-foreground">
            Registre um novo atendimento de manutenção
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

        <Alert className="bg-blue-500/10 border-blue-500/30">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Esteiras com status "Vendido" não aparecem na lista, pois não podem receber novas manutenções.
          </AlertDescription>
        </Alert>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Esteira Relacionada</CardTitle>
            <CardDescription>Escolha a esteira que receberá a manutenção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Detalhes da Manutenção</CardTitle>
            <CardDescription>Descreva o problema e o diagnóstico inicial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problems">Problemas *</Label>
              <Textarea
                id="problems"
                name="problems"
                value={formData.problems}
                onChange={handleChange}
                placeholder="Descreva os problemas identificados"
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Informe o diagnóstico inicial"
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Informações adicionais sobre a manutenção"
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Foto da Manutenção</Label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="block w-full rounded border border-input bg-background px-3 py-2 text-sm shadow-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Prévia da foto da manutenção"
                  className="h-auto max-h-80 w-full rounded object-contain border border-border/50"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild>
            <Link href={formData.treadmillId ? `/dashboard/esteiras/${formData.treadmillId}` : '/dashboard/manutencao'}>
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
                <Wrench className="mr-2 h-4 w-4" />
                Registrar Manutenção
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
