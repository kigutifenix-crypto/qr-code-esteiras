'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QRCodeComponent from 'react-qr-code'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { getTreadmill } from '@/lib/services/treadmill-service'
import type { Treadmill } from '@/lib/types'
import { ArrowLeft, Download, Printer, Share2, Copy, Check } from 'lucide-react'

export default function QRCodePage() {
  const params = useParams()
  const [treadmill, setTreadmill] = useState<Treadmill | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const id = params.id as string

  useEffect(() => {
    async function loadTreadmill() {
      try {
        const data = await getTreadmill(id)
        setTreadmill(data)
      } catch (error) {
        console.error('Error loading treadmill:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTreadmill()
  }, [id])

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/esteira/${treadmill?.qrCode}`
    : ''

  const handleDownload = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2

      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const link = document.createElement('a')
        link.download = `qrcode-${treadmill?.qrCode}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${treadmill?.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            .qr-code {
              margin: 20px 0;
            }
            h1 {
              font-size: 24px;
              margin: 0;
            }
            .code {
              font-family: monospace;
              font-size: 18px;
              color: #666;
              margin-top: 10px;
            }
            .info {
              font-size: 14px;
              color: #888;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${treadmill?.name}</h1>
            <div class="code">${treadmill?.qrCode}</div>
            <div class="info">${treadmill?.brand} - ${treadmill?.model}</div>
            <div class="qr-code">${svgData}</div>
            <p>Escaneie para ver detalhes</p>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Code - ${treadmill?.name}`,
          text: `Esteira: ${treadmill?.name} (${treadmill?.qrCode})`,
          url: qrUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[500px] max-w-md mx-auto" />
      </div>
    )
  }

  if (!treadmill) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Esteira não encontrada</h2>
        <Button asChild className="mt-4">
          <Link href="/dashboard/esteiras">Voltar para lista</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/esteiras/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Code</h1>
          <p className="text-muted-foreground">{treadmill.name}</p>
        </div>
      </div>

      {/* QR Code Card */}
      <div className="max-w-md mx-auto">
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <CardTitle>{treadmill.name}</CardTitle>
            <CardDescription>
              {treadmill.brand} - {treadmill.model}
            </CardDescription>
            <div className="flex justify-center mt-2">
              <StatusBadge status={treadmill.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div
              ref={qrRef}
              className="bg-white p-6 rounded-lg flex items-center justify-center"
            >
              <QRCodeComponent
                value={qrUrl}
                size={200}
                level="H"
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            </div>

            {/* Code */}
            <div className="text-center">
              <code className="px-4 py-2 rounded-lg bg-muted text-lg font-mono">
                {treadmill.qrCode}
              </code>
            </div>

            {/* URL */}
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs truncate">
                {qrUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-status-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
