'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { getRoleLabel } from '@/lib/types'
import {
  LayoutDashboard,
  Dumbbell,
  Wrench,
  Package,
  Users,
  Settings,
  QrCode,
  FileText,
  Archive,
  LogOut,
  ChevronUp,
  Zap,
  ShoppingCart,
  Bell,
  BarChart3,
} from 'lucide-react'

const navigation = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        permissions: ['view_dashboard'],
      },
      {
        title: 'Esteiras',
        url: '/dashboard/esteiras',
        icon: Dumbbell,
        permissions: ['view_treadmills', 'create_treadmill'],
      },
      {
        title: 'Arquivadas',
        url: '/dashboard/archived',
        icon: Archive,
        permissions: ['view_treadmills'],
      },
      {
        title: 'Vendidos',
        url: '/dashboard/vendidos',
        icon: ShoppingCart,
        permissions: ['view_treadmills', 'create_treadmill'],
      },
      {
        title: 'Escanear QR Code',
        url: '/dashboard/scanner',
        icon: QrCode,
        permissions: ['create_maintenance'],
      },
    ],
  },
  {
    title: 'Manutenção',
    items: [
      {
        title: 'Manutenções',
        url: '/dashboard/manutencao',
        icon: Wrench,
        permissions: ['create_maintenance'],
      },
      {
        title: 'Peças',
        url: '/dashboard/pecas',
        icon: Package,
        permissions: ['add_parts', 'manage_parts', 'edit_parts', 'delete_parts', 'update_part_status'],
      },
    ],
  },
  {
    title: 'Compras',
    items: [
      {
        title: 'Peças Faltando',
        url: '/dashboard/compras',
        icon: ShoppingCart,
        permissions: ['view_missing_parts'],
      },
    ],
  },
  {
    title: 'Administração',
    items: [
      {
        title: 'Usuários',
        url: '/dashboard/usuarios',
        icon: Users,
        permissions: ['create_user'],
      },
      {
        title: 'Relatórios',
        url: '/dashboard/relatorios',
        icon: BarChart3,
        permissions: ['view_dashboard', 'manage_settings'],
      },
      {
        title: 'Logs',
        url: '/dashboard/logs',
        icon: FileText,
        permissions: ['manage_settings'],
      },
      {
        title: 'Notificações',
        url: '/dashboard/notificacoes',
        icon: Bell,
        permissions: ['view_all'],
      },
      {
        title: 'Configurações',
        url: '/dashboard/configuracoes',
        icon: Settings,
        permissions: ['manage_settings'],
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut, hasPermission } = useAuth()
  const { setOpenMobile } = useSidebar()

  const closeMobile = () => setOpenMobile(false)

  const userInitials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const canAccessItem = (permissions: string[]) => {
    return permissions.some((p) => hasPermission(p))
  }

  const isGuest = !user

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" onClick={closeMobile}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Zap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Controle de Esteiras</span>
                  <span className="text-xs text-muted-foreground">Fenix Company</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => {
          const visibleItems = group.items.filter((item) =>
            canAccessItem(item.permissions)
          )

          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url} onClick={closeMobile}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isGuest ? (
              <SidebarMenuButton size="lg" asChild>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <span>Login</span>
                  <LogOut className="size-4" />
                </Link>
              </SidebarMenuButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.role ? getRoleLabel(user.role) : ''}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/perfil">
                      <Settings className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
