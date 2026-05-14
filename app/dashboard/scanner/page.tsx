'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTreadmillByQRCode } from '@/lib/services/treadmill-service'
import { QrCode, Search, AlertCircle, Loader2 } from 'lucide-react'

export default function ScannerPage() {
  const router = useRouter()
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrCode.trim()) return

    setError(null)
    setLoading(true)

    try {
      const treadmill = await getTreadmillByQRCode(qrCode.trim().toUpperCase())

      if (treadmill) {
        router.push(`/dashboard/esteiras/${treadmill.id}`)
      } else {
        setError('Esteira não encontrada. Verifique o código e tente novamente.')
      }
    } catch (err) {
      setError('Erro ao buscar esteira. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escanear QR Code</h1>
        <p className="text-muted-foreground">
          Digite o código QR da esteira para visualizar seus detalhes
        </p>
      </div>

      {/* Scanner Card */}
      <Card className="border-border/50 max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Buscar por Código</CardTitle>
          <CardDescription>
            Digite o código QR impresso na etiqueta da esteira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Ex: FNX-XXXXX-XXXXXX"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value.toUpperCase())}
                className="bg-input/50 font-mono"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !qrCode.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              O código começa com FNX- seguido de caracteres alfanuméricos
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-border/50 max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-base">Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
              1
            </span>
            <p>Localize a etiqueta com o QR Code na esteira</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
              2
            </span>
            <p>Digite o código que aparece abaixo do QR Code (ex: FNX-...)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
              3
            </span>
            <p>Clique em buscar para ver os detalhes da esteira</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
