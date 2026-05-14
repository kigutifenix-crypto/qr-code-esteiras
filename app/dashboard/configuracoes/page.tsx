'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Settings, Save, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SystemSettings {
  maintenanceReminderDays: number
  lowStockThreshold: number
  enableNotifications: boolean
  enableEmailNotifications: boolean
  systemName: string
  systemDescription: string
  defaultMaintenanceInterval: number
  autoBackupEnabled: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  logRetentionDays: number
}

export default function ConfiguracoesPage() {
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceReminderDays: 7,
    lowStockThreshold: 5,
    enableNotifications: true,
    enableEmailNotifications: false,
    systemName: 'Sistema de Gestão de Esteiras',
    systemDescription: 'Sistema para gerenciamento de esteiras, manutenções e peças.',
    defaultMaintenanceInterval: 30,
    autoBackupEnabled: true,
    backupFrequency: 'weekly',
    logRetentionDays: 90,
  })

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('system-settings')
    if (savedSettings) {
      try {
        setSettings({ ...settings, ...JSON.parse(savedSettings) })
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      }
    }
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem('system-settings', JSON.stringify(settings))

      toast({
        title: 'Configurações salvas',
        description: 'As configurações do sistema foram atualizadas com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      maintenanceReminderDays: 7,
      lowStockThreshold: 5,
      enableNotifications: true,
      enableEmailNotifications: false,
      systemName: 'Sistema de Gestão de Esteiras',
      systemDescription: 'Sistema para gerenciamento de esteiras, manutenções e peças.',
      defaultMaintenanceInterval: 30,
      autoBackupEnabled: true,
      backupFrequency: 'weekly',
      logRetentionDays: 90,
    })
  }

  if (!hasPermission('manage_settings')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Configure as opções do sistema.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Acesso Negado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Você não tem permissão para acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as opções e preferências do sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Redefinir
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Sistema Geral */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Sistema Geral</CardTitle>
            <CardDescription>
              Configurações básicas do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nome do Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultMaintenanceInterval">Intervalo Padrão de Manutenção (dias)</Label>
                <Input
                  id="defaultMaintenanceInterval"
                  type="number"
                  value={settings.defaultMaintenanceInterval}
                  onChange={(e) => setSettings({ ...settings, defaultMaintenanceInterval: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemDescription">Descrição do Sistema</Label>
              <Textarea
                id="systemDescription"
                value={settings.systemDescription}
                onChange={(e) => setSettings({ ...settings, systemDescription: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Manutenção */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Manutenção</CardTitle>
            <CardDescription>
              Configurações relacionadas à manutenção das esteiras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maintenanceReminderDays">Dias para Lembrete de Manutenção</Label>
                <Input
                  id="maintenanceReminderDays"
                  type="number"
                  value={settings.maintenanceReminderDays}
                  onChange={(e) => setSettings({ ...settings, maintenanceReminderDays: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Limite Baixo de Estoque</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Notificações</CardTitle>
            <CardDescription>
              Configure as notificações do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableNotifications">Habilitar Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre eventos importantes do sistema.
                </p>
              </div>
              <Switch
                id="enableNotifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableEmailNotifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar notificações também por email.
                </p>
              </div>
              <Switch
                id="enableEmailNotifications"
                checked={settings.enableEmailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
                disabled={!settings.enableNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup e Logs */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Backup e Logs</CardTitle>
            <CardDescription>
              Configurações de backup automático e retenção de logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoBackupEnabled">Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Realizar backups automáticos dos dados do sistema.
                </p>
              </div>
              <Switch
                id="autoBackupEnabled"
                checked={settings.autoBackupEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, autoBackupEnabled: checked })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Frequência do Backup</Label>
                <Select
                  value={settings.backupFrequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setSettings({ ...settings, backupFrequency: value })
                  }
                  disabled={!settings.autoBackupEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logRetentionDays">Retenção de Logs (dias)</Label>
                <Input
                  id="logRetentionDays"
                  type="number"
                  value={settings.logRetentionDays}
                  onChange={(e) => setSettings({ ...settings, logRetentionDays: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
