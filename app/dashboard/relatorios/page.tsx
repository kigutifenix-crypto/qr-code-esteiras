'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllTreadmills } from '@/lib/services/treadmill-service'
import { getMissingParts } from '@/lib/services/parts-service'
import type { Treadmill, Part, EquipmentType } from '@/lib/types'
import {
  FileText,
  Download,
  Wrench,
  CheckCircle,
  ShoppingCart,
  RefreshCw,
  Calendar,
  Package,
  Loader2,
  AlertCircle,
  Dumbbell,
  Bike,
  Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ReportType = 'manutencao' | 'disponiveis' | 'pecas'

interface ReportData {
  manutencao: Treadmill[]
  disponiveis: Treadmill[]
  pecas: Part[]
  pecasTreadmills: Record<string, string>
  loadedAt: Date | null
}

const TAB_LABELS: Record<EquipmentType, string> = {
  esteira: 'Esteiras',
  bike: 'Bikes',
  eliptico: 'Elípticos',
}

export default function RelatoriosPage() {
  const [allTreadmills, setAllTreadmills] = useState<Treadmill[]>([])
  const [allMissingParts, setAllMissingParts] = useState<Part[]>([])
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [activeTab, setActiveTab] = useState<EquipmentType>('esteira')

  // Derived data filtered by active tab
  const data = useMemo((): ReportData => {
    const typeTreadmills = allTreadmills.filter(
      (t) => (t.equipmentType || 'esteira') === activeTab
    )
    const treadmillIds = new Set(typeTreadmills.map((t) => t.id))
    const treadmillNameMap = allTreadmills.reduce<Record<string, string>>((acc, t) => {
      acc[t.id] = t.name
      return acc
    }, {})
    return {
      manutencao: typeTreadmills.filter((t) => t.status === 'manutencao'),
      disponiveis: typeTreadmills.filter((t) => t.status === 'pronta'),
      pecas: allMissingParts.filter((p) => treadmillIds.has(p.treadmillId)),
      pecasTreadmills: treadmillNameMap,
      loadedAt,
    }
  }, [allTreadmills, allMissingParts, activeTab, loadedAt])

  const loadData = async () => {
    setLoading(true)
    try {
      const [allTreadmillsData, pecasData] = await Promise.all([
        getAllTreadmills(),
        getMissingParts(),
      ])
      setAllTreadmills(allTreadmillsData)
      setAllMissingParts(pecasData)
      setLoadedAt(new Date())
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const generatePDF = async (type: ReportType) => {
    setGenerating(type)
    try {
      // Dynamic import to avoid SSR issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsPDFModule = await import('jspdf' as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsPDF: any = jsPDFModule.default ?? jsPDFModule

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let y = margin

      const now = data.loadedAt ? format(data.loadedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

      // Helpers
      const checkNewPage = (neededSpace: number) => {
        if (y + neededSpace > pageHeight - margin) {
          doc.addPage()
          y = margin
          drawPageHeader()
        }
      }

      const drawPageHeader = () => {
        // Faixa azul escuro no topo
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, pageWidth, 12, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`FENIX COMPANY • Controle de ${TAB_LABELS[activeTab]}`, margin, 8)
        doc.text(`Gerado em: ${now}`, pageWidth - margin, 8, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      const drawSectionTitle = (title: string, color: [number, number, number]) => {
        checkNewPage(20)
        doc.setFillColor(...color)
        doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(title, margin + 4, y + 7)
        doc.setTextColor(0, 0, 0)
        y += 14
      }

      const drawRow = (cols: string[], widths: number[], isHeader = false, isEven = false) => {
        checkNewPage(10)
        if (isHeader) {
          doc.setFillColor(226, 232, 240)
        } else if (isEven) {
          doc.setFillColor(248, 250, 252)
        } else {
          doc.setFillColor(255, 255, 255)
        }
        doc.rect(margin, y, contentWidth, 8, 'F')
        doc.setDrawColor(203, 213, 225)
        doc.rect(margin, y, contentWidth, 8, 'S')

        doc.setFontSize(8)
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
        doc.setTextColor(isHeader ? 30 : 60, isHeader ? 30 : 60, isHeader ? 30 : 60)

        let x = margin + 2
        cols.forEach((col, i) => {
          const maxWidth = widths[i] - 2
          const truncated = doc.splitTextToSize(col, maxWidth)[0] || ''
          doc.text(truncated, x, y + 5.5)
          x += widths[i]
        })
        y += 8
      }

      // ===================== CAPA =====================
      // Fundo gradiente simulado
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageWidth, 60, 'F')

      doc.setFillColor(30, 41, 59)
      doc.rect(0, 50, pageWidth, 20, 'F')

      // Logo / ícone decorativo
      doc.setFillColor(59, 130, 246)
      doc.circle(pageWidth / 2, 25, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('FC', pageWidth / 2, 29, { align: 'center' })

      // Título principal
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)

      let reportTitle = ''
      let reportSubtitle = ''
      let accentColor: [number, number, number] = [59, 130, 246]

      if (type === 'manutencao') {
        reportTitle = 'Relatório de Manutenção'
        reportSubtitle = 'Máquinas em processo de manutenção'
        accentColor = [234, 88, 12]
      } else if (type === 'disponiveis') {
        reportTitle = 'Relatório de Disponibilidade'
        reportSubtitle = 'Máquinas disponíveis para venda'
        accentColor = [22, 163, 74]
      } else {
        reportTitle = 'Relatório de Compras'
        reportSubtitle = 'Peças que precisam ser adquiridas'
        accentColor = [124, 58, 237]
      }

      doc.text(reportTitle, pageWidth / 2, 75, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(reportSubtitle, pageWidth / 2, 83, { align: 'center' })

      // Info boxes na capa
      doc.setFillColor(30, 41, 59)
      doc.roundedRect(margin, 95, contentWidth, 25, 3, 3, 'F')

      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('EMPRESA', margin + 8, 104)
      doc.text('DATA DE GERAÇÃO', pageWidth / 2 - 10, 104)
      doc.text('TOTAL DE REGISTROS', pageWidth - margin - 45, 104)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Fenix Company', margin + 8, 114)
      doc.text(now, pageWidth / 2 - 10, 114)

      const totalRecords = type === 'manutencao' ? data.manutencao.length
        : type === 'disponiveis' ? data.disponiveis.length
        : data.pecas.length
      doc.text(String(totalRecords), pageWidth - margin - 45, 114)

      // Linha decorativa colorida
      doc.setFillColor(...accentColor)
      doc.rect(margin, 128, contentWidth, 1.5, 'F')

      y = 140

      // ===================== CONTEÚDO =====================
      drawPageHeader()

      if (type === 'manutencao') {
        const items = data.manutencao

        // Resumo
        doc.setFillColor(255, 237, 213)
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(154, 52, 18)
        doc.text(`Total em manutenção: ${items.length} máquina(s)`, margin + 4, y + 10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        y += 20

        if (items.length === 0) {
          doc.setFontSize(10)
          doc.text('Nenhuma máquina em manutenção no momento.', margin, y + 8)
        } else {
          drawSectionTitle('Máquinas em Manutenção', [234, 88, 12])
          const colWidths = [55, 35, 35, 30, 25]
          drawRow(['Nome', 'Marca', 'Modelo', 'Nº de Série', 'QR Code'], colWidths, true)
          items.forEach((t, i) => {
            drawRow(
              [t.name, t.brand || '-', t.model || '-', t.serialNumber || '-', t.qrCode],
              colWidths,
              false,
              i % 2 === 0
            )
          })

          y += 10

          // Detalhe de cada esteira
          drawSectionTitle('Detalhes das Manutenções', [234, 88, 12])
          items.forEach((t, idx) => {
            checkNewPage(35)
            doc.setFillColor(255, 247, 237)
            doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F')
            doc.setDrawColor(234, 88, 12)
            doc.setLineWidth(0.5)
            doc.line(margin, y, margin, y + 28)
            doc.setLineWidth(0.2)

            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(30, 30, 30)
            doc.text(`${idx + 1}. ${t.name}`, margin + 5, y + 8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(80, 80, 80)
            doc.setFontSize(8)
            doc.text(`Marca: ${t.brand || '-'}   Modelo: ${t.model || '-'}   Tensão: ${t.voltage || '-'}`, margin + 5, y + 15)
            doc.text(`Motor: ${t.motorPower || '-'}   Vel. Máx: ${t.maxSpeed || '-'}   Peso Máx: ${t.maxWeight || '-'}`, margin + 5, y + 21)
            doc.text(`Cadastro: ${format(t.createdAt, 'dd/MM/yyyy', { locale: ptBR })}   Atualizado: ${format(t.updatedAt, 'dd/MM/yyyy', { locale: ptBR })}`, margin + 5, y + 27)

            y += 32
          })
        }

      } else if (type === 'disponiveis') {
        const items = data.disponiveis

        // Resumo
        doc.setFillColor(220, 252, 231)
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 83, 45)
        doc.text(`Total disponíveis para venda: ${items.length} máquina(s)`, margin + 4, y + 10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        y += 20

        if (items.length === 0) {
          doc.setFontSize(10)
          doc.text('Nenhuma máquina disponível para venda no momento.', margin, y + 8)
        } else {
          drawSectionTitle('Máquinas Disponíveis para Venda', [22, 163, 74])
          const colWidths = [50, 32, 32, 30, 36]
          drawRow(['Nome', 'Marca', 'Modelo', 'Tensão', 'Nº de Série'], colWidths, true)
          items.forEach((t, i) => {
            drawRow(
              [t.name, t.brand || '-', t.model || '-', t.voltage || '-', t.serialNumber || '-'],
              colWidths,
              false,
              i % 2 === 0
            )
          })

          y += 10

          // Especificações técnicas
          drawSectionTitle('Especificações Técnicas', [22, 163, 74])
          items.forEach((t, idx) => {
            checkNewPage(35)
            doc.setFillColor(240, 253, 244)
            doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F')
            doc.setDrawColor(22, 163, 74)
            doc.setLineWidth(0.5)
            doc.line(margin, y, margin, y + 28)
            doc.setLineWidth(0.2)

            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(30, 30, 30)
            doc.text(`${idx + 1}. ${t.name}`, margin + 5, y + 8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(80, 80, 80)
            doc.setFontSize(8)
            doc.text(`Marca: ${t.brand || '-'}   Modelo: ${t.model || '-'}   QR Code: ${t.qrCode}`, margin + 5, y + 15)
            doc.text(`Motor: ${t.motorPower || '-'}   Vel. Máx: ${t.maxSpeed || '-'}   Inclinação: ${t.incline || '-'}   Peso Máx: ${t.maxWeight || '-'}`, margin + 5, y + 21)
            doc.text(`Cadastro: ${format(t.createdAt, 'dd/MM/yyyy', { locale: ptBR })}   Atualizado: ${format(t.updatedAt, 'dd/MM/yyyy', { locale: ptBR })}`, margin + 5, y + 27)

            y += 32
          })
        }

      } else {
        // Peças para compra
        const items = data.pecas

        // Resumo
        doc.setFillColor(237, 233, 254)
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(76, 29, 149)
        doc.text(`Total de peças faltando: ${items.length} item(ns) a comprar`, margin + 4, y + 10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        y += 20

        if (items.length === 0) {
          doc.setFontSize(10)
          doc.text('Nenhuma peça pendente de compra.', margin, y + 8)
        } else {
          drawSectionTitle('Lista de Peças para Compra', [124, 58, 237])
          const colWidths = [48, 22, 18, 40, 52]
          drawRow(['Nome da Peça', 'Código', 'Qtd.', 'Máquina', 'Observações'], colWidths, true)
          items.forEach((p, i) => {
            const treadmillName = data.pecasTreadmills[p.treadmillId] || 'N/D'
            drawRow(
              [p.name, p.code, String(p.quantity), treadmillName, p.notes || '-'],
              colWidths,
              false,
              i % 2 === 0
            )
          })

          y += 10

          // Agrupado por esteira
          const byTreadmill: Record<string, Part[]> = {}
          items.forEach((p) => {
            const key = data.pecasTreadmills[p.treadmillId] || 'Máquina não identificada'
            if (!byTreadmill[key]) byTreadmill[key] = []
            byTreadmill[key].push(p)
          })

          drawSectionTitle('Peças por Máquina', [124, 58, 237])
          Object.entries(byTreadmill).forEach(([treadmillName, parts]) => {
            checkNewPage(20)
            doc.setFillColor(245, 243, 255)
            doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(76, 29, 149)
            doc.text(`${treadmillName} (${parts.length} peça(s))`, margin + 3, y + 5.5)
            doc.setTextColor(60, 60, 60)
            y += 10

            parts.forEach((p) => {
              checkNewPage(8)
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(8)
              doc.setTextColor(80, 80, 80)
              doc.text(`  • ${p.name} — Cód: ${p.code}  |  Qtd: ${p.quantity}${p.notes ? `  |  Obs: ${p.notes}` : ''}`, margin + 3, y + 5)
              y += 7
            })
            y += 3
          })
        }
      }

      // Rodapé em todas as páginas
      const totalPages = (doc.internal as any).getNumberOfPages?.() || 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(248, 250, 252)
        doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')
        doc.setDrawColor(203, 213, 225)
        doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text('Fenix Company — Sistema de Controle de Máquinas', margin, pageHeight - 4)
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' })
      }

      // Salvar PDF
      const fileNames: Record<ReportType, string> = {
        manutencao: `relatorio_manutencao_${format(new Date(), 'dd-MM-yyyy')}.pdf`,
        disponiveis: `relatorio_disponiveis_${format(new Date(), 'dd-MM-yyyy')}.pdf`,
        pecas: `relatorio_pecas_compra_${format(new Date(), 'dd-MM-yyyy')}.pdf`,
      }
      doc.save(fileNames[type])
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setGenerating(null)
    }
  }

  const reportCards = [
    {
      type: 'manutencao' as ReportType,
      title: 'Máquinas em Manutenção',
      description: 'Lista completa de esteiras que estão em processo de manutenção, com especificações técnicas e datas.',
      icon: Wrench,
      count: data.manutencao.length,
      countLabel: 'em manutenção',
      accentColor: 'orange',
      bgClass: 'from-orange-500/10 to-orange-600/5',
      borderClass: 'border-orange-500/20',
      iconBg: 'bg-orange-500/15',
      iconColor: 'text-orange-600',
      badgeBg: 'bg-orange-100 text-orange-800',
      buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
    {
      type: 'disponiveis' as ReportType,
      title: 'Máquinas Disponíveis',
      description: 'Relatório de esteiras prontas para venda, incluindo especificações completas e dados técnicos.',
      icon: CheckCircle,
      count: data.disponiveis.length,
      countLabel: 'disponíveis',
      accentColor: 'green',
      bgClass: 'from-green-500/10 to-green-600/5',
      borderClass: 'border-green-500/20',
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      badgeBg: 'bg-green-100 text-green-800',
      buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      type: 'pecas' as ReportType,
      title: 'Peças para Compra',
      description: 'Lista de todas as peças com status "faltando", agrupadas por esteira, para facilitar o processo de aquisição.',
      icon: ShoppingCart,
      count: data.pecas.length,
      countLabel: 'peças faltando',
      accentColor: 'purple',
      bgClass: 'from-purple-500/10 to-purple-600/5',
      borderClass: 'border-purple-500/20',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-600',
      badgeBg: 'bg-purple-100 text-purple-800',
      buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatórios em PDF
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere relatórios detalhados para impressão ou arquivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.loadedAt && (
            <p className="text-xs text-muted-foreground">
              <Calendar className="inline h-3 w-3 mr-1" />
              Dados de {format(data.loadedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Equipment type tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EquipmentType)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="esteira" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Esteiras
          </TabsTrigger>
          <TabsTrigger value="bike" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Bikes
          </TabsTrigger>
          <TabsTrigger value="eliptico" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Elípticos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/15">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.manutencao.length}</p>
                <p className="text-xs text-muted-foreground">Em manutenção</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/5 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/15">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.disponiveis.length}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/15">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.pecas.length}</p>
                <p className="text-xs text-muted-foreground">Peças faltando</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {reportCards.map((card) => {
          const Icon = card.icon
          const isGenerating = generating === card.type

          return (
            <Card
              key={card.type}
              className={`border ${card.borderClass} bg-gradient-to-br ${card.bgClass} relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5`}
            >
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                <Icon className="w-full h-full" />
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className={`p-3 rounded-xl ${card.iconBg}`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  {loading ? (
                    <Skeleton className="h-6 w-16 rounded-full" />
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${card.badgeBg}`}>
                      {card.count} {card.countLabel}
                    </span>
                  )}
                </div>
                <CardTitle className="text-base mt-3">{card.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </p>

                {/* Preview list */}
                {!loading && (
                  <div className="rounded-lg border border-border/40 bg-background/50 divide-y divide-border/30 max-h-32 overflow-hidden">
                    {card.type === 'manutencao' && (
                      data.manutencao.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma em manutenção</p>
                      ) : (
                        data.manutencao.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-medium truncate">{t.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.brand}</span>
                          </div>
                        ))
                      )
                    )}
                    {card.type === 'disponiveis' && (
                      data.disponiveis.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma disponível</p>
                      ) : (
                        data.disponiveis.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-medium truncate">{t.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.brand}</span>
                          </div>
                        ))
                      )
                    )}
                    {card.type === 'pecas' && (
                      data.pecas.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma peça faltando</p>
                      ) : (
                        data.pecas.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-medium truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">Qtd: {p.quantity}</span>
                          </div>
                        ))
                      )
                    )}
                    {((card.type === 'manutencao' && data.manutencao.length > 3) ||
                      (card.type === 'disponiveis' && data.disponiveis.length > 3) ||
                      (card.type === 'pecas' && data.pecas.length > 3)) && (
                      <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                        + {card.count - 3} mais no relatório completo
                      </div>
                    )}
                  </div>
                )}

                {loading ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : (
                  <Button
                    className={`w-full gap-2 ${card.buttonClass}`}
                    onClick={() => generatePDF(card.type)}
                    disabled={isGenerating || generating !== null}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar PDF
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Sobre os relatórios</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Os PDFs são gerados diretamente no navegador com os dados mais recentes do sistema.
            Clique em <strong>"Atualizar"</strong> antes de gerar para garantir que os dados estejam atualizados.
            Os arquivos são salvos automaticamente na pasta de downloads do seu computador.
          </p>
        </div>
      </div>
    </div>
  )
}
