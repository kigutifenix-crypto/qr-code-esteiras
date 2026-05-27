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
import { getMaintenance, updateMaintenance } from '@/lib/services/maintenance-service'
import { useAuth } from '@/contexts/auth-context'
import { createLog } from '@/lib/services/logs-service'
import { getTreadmill } from '@/lib/services/treadmill-service'
import { deleteImageFromCloudinary, uploadImageToCloudinary } from '@/lib/cloudinary'
import type { MaintenanceRecord } from '@/lib/types'

export default function EditarManutencaoPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isSoldTreadmill, setIsSoldTreadmill] = useState(false)
  const [maintenance, setMaintenance] = useState<MaintenanceRecord | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    problems: '',
    diagnosis: '',
    notes: '',
    photoUrl: '',
    status: 'em_andamento' as MaintenanceRecord['status'],
  })

  const id = params.id as string
  const { user } = useAuth()

  useEffect(() => {
    async function loadMaintenance() {
      setLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const maintenanceData = await getMaintenance(id)
        if (!maintenanceData) {
          setNotFound(true)
          return
        }

        // Verificar se a esteira foi vendida
        const treadmill = await getTreadmill(maintenanceData.treadmillId)
        if (treadmill?.status === 'vendido') {
          setIsSoldTreadmill(true)
          setMaintenance(maintenanceData)
          setFormData({
            problems: maintenanceData.problems,
            diagnosis: maintenanceData.diagnosis,
            notes: maintenanceData.notes,
            status: maintenanceData.status,
            photoUrl: maintenanceData.photoUrl || '',
          })
          setPhotoPreview(maintenanceData.photoUrl || null)
          return
        }

        setMaintenance(maintenanceData)
        setFormData({
          problems: maintenanceData.problems,
          diagnosis: maintenanceData.diagnosis,
          notes: maintenanceData.notes,
          status: maintenanceData.status,
          photoUrl: maintenanceData.photoUrl || '',
        })
        setPhotoPreview(maintenanceData.photoUrl || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar a manutenção')
      } finally {
        setLoading(false)
      }
    }

    loadMaintenance()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : formData.photoUrl || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      if (!maintenance) return

      let photoUrl = formData.photoUrl || undefined
      const previousPhotoUrl = maintenance.photoUrl

      if (photoFile) {
        photoUrl = await uploadImageToCloudinary(photoFile)
      }

      await updateMaintenance(maintenance.id, {
        problems: formData.problems,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        status: formData.status,
        photoUrl,
      })

      if (photoFile && previousPhotoUrl && previousPhotoUrl !== photoUrl) {
        await deleteImageFromCloudinary(previousPhotoUrl)
      }

      router.push('/dashboard/manutencao')
      try {
        await createLog({
          userId: user?.id || '',
          userName: user?.name || 'Unknown',
          action: 'update',
          entity: 'maintenance',
          entityId: maintenance.id,
          details: JSON.stringify({ ...formData }),
        })
      } catch (e) {
        console.warn('Failed to write maintenance update log', e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a manutenção')
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

  if (notFound || !maintenance) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Manutenção não encontrada</h2>
        <p className="text-muted-foreground mt-2">
          A manutenção solicitada não existe ou foi removida.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/manutencao">Voltar para manutenções</Link>
        </Button>
      </div>
    )
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
          <h1 className="text-2xl font-bold tracking-tight">Editar Manutenção</h1>
          <p className="text-muted-foreground">
            Atualize as informações e o status da manutenção.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isSoldTreadmill && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta esteira foi vendida. O histórico de manutenção é mantido, mas não é possível fazer novas edições.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Informações da Manutenção</CardTitle>
            <CardDescription>Atualize os detalhes da manutenção</CardDescription>
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
                disabled={isSoldTreadmill}
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
                placeholder="Informe o diagnóstico atual"
                disabled={isSoldTreadmill}
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
                disabled={isSoldTreadmill}
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
                disabled={isSoldTreadmill}
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
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as MaintenanceRecord['status'],
                  }))
                }
                disabled={isSoldTreadmill}
              >
                <SelectTrigger className="bg-input/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/manutencao">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving || isSoldTreadmill}>
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
