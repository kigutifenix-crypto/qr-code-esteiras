'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'

function formatDate(date?: Date | string | null) {
  if (!date) return 'Não disponível'

  const parsedDate = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(parsedDate)
}

export default function PerfilPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize e verifique suas informações de conta.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Informações do Usuário</CardTitle>
          <CardDescription>Dados cadastrais e status da conta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Nome</p>
            <p className="text-base font-semibold text-foreground">{user?.name ?? 'Não disponível'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">E-mail</p>
            <p className="text-base font-semibold text-foreground">{user?.email ?? 'Não disponível'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Função</p>
            <Badge variant="secondary" className="uppercase tracking-wide">
              {user?.role ?? 'Não disponível'}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge variant={user?.active ? 'success' : 'destructive'}>
              {user?.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Criado em</p>
            <p className="text-base font-semibold text-foreground">{formatDate(user?.createdAt)}</p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
            <p className="text-base font-semibold text-foreground">{formatDate(user?.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
