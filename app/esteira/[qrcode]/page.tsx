import { Metadata } from 'next'
import { PublicTreadmillView } from './public-treadmill-view'

interface PageProps {
  params: Promise<{ qrcode: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { qrcode } = await params
  return {
    title: `Esteira ${qrcode} - Fenix Company`,
    description: 'Detalhes da esteira - Sistema de Controle Fenix Company',
  }
}

export default async function PublicEsteiraPage({ params }: PageProps) {
  const { qrcode } = await params
  return <PublicTreadmillView qrCode={qrcode} />
}
