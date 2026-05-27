import { cn } from '@/lib/utils'
import type { TreadmillStatus, PartStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: TreadmillStatus | PartStatus
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

const statusConfig: Record<
  TreadmillStatus | PartStatus,
  { label: string; className: string; dotColor: string }
> = {
  pronta: {
    label: 'Pronta para Venda',
    className: 'bg-status-success/15 text-status-success border-status-success/30',
    dotColor: 'bg-status-success',
  },
  manutencao: {
    label: 'Em Manutenção',
    className: 'bg-status-warning/15 text-status-warning border-status-warning/30',
    dotColor: 'bg-status-warning',
  },
  aguardando_pecas: {
    label: 'Aguardando Peças',
    className: 'bg-status-info/15 text-status-info border-status-info/30',
    dotColor: 'bg-status-info',
  },
  indisponivel: {
    label: 'Indisponível',
    className: 'bg-status-danger/15 text-status-danger border-status-danger/30',
    dotColor: 'bg-status-danger',
  },
  vendido: {
    label: 'Vendido',
    className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    dotColor: 'bg-blue-600',
  },
  faltando: {
    label: 'Faltando',
    className: 'bg-status-danger/15 text-status-danger border-status-danger/30',
    dotColor: 'bg-status-danger',
  },
  comprada: {
    label: 'Comprada',
    className: 'bg-status-info/15 text-status-info border-status-info/30',
    dotColor: 'bg-status-info',
  },
  recebida: {
    label: 'Recebida',
    className: 'bg-status-success/15 text-status-success border-status-success/30',
    dotColor: 'bg-status-success',
  },
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  if (!config) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeStyles[size],
        config.className,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full animate-pulse-status',
            dotSizes[size],
            config.dotColor
          )}
        />
      )}
      {config.label}
    </span>
  )
}

// Compact version for tables
export function StatusDot({ status }: { status: TreadmillStatus }) {
  const config = statusConfig[status]

  if (!config) {
    return null
  }

  return (
    <span
      className={cn('inline-block w-3 h-3 rounded-full', config.dotColor)}
      title={config.label}
    />
  )
}
