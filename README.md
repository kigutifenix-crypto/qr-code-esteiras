# 🏃‍♂️ Esteira Management System — Controle & Manutenção de Equipamentos

[![Next.js](https://img.shields.io/badge/Next.js-v16_App--Router-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2F%20RTDB-orange.svg)](https://firebase.google.com/)
[![Radix UI](https://img.shields.io/badge/Radix%20UI-Primitives-darkblue.svg)](https://www.radix-ui.com/)
[![Lucide Icons](https://img.shields.io/badge/Lucide-Icons-pink.svg)](https://lucide.dev/)

O **Esteira Management System** é uma plataforma corporativa completa desenvolvida em Next.js para controle do estoque, rastreabilidade e ciclo de vida de **esteiras ergométricas reformadas** da Fênix Company. 

O sistema integra etiquetas scaneáveis de QR Code, controle de ordens de serviço (manutenção preventiva e corretiva), ordens de compra de peças, painéis analíticos dinâmicos e controle rigoroso de acessos (RBAC) para técnicos, setor de compras e vendedores.

---

## 🎯 Principais Funcionalidades

- 🔐 **Autenticação & Perfis (RBAC):** Restrições baseadas em cargos para garantir que cada colaborador veja apenas o que compete à sua área.
- 📋 **Gestão de Esteiras (Refurbished):** Cadastro de marca, modelo, número de série, potência do motor, voltagem, limite de peso, fotos reais e status físico.
- 🖨️ **Geração e Escaneamento de QR Code:**
  - Gera QR Codes exclusivos para colar nos chassis das esteiras.
  - Leitor de câmera embutido (QR Scanner) no celular para abrir a ficha do equipamento em campo imediatamente.
- 🔧 **Controle de Manutenção:** Registro de diagnósticos, problemas encontrados, mecânicos responsáveis e fotos das peças avariadas.
- 📦 **Requisição Automática de Peças:** Técnicos podem listar peças em falta para uma manutenção. A requisição vai automaticamente para o departamento de compras.
- 🛒 **Painel de Compras:** Interface dedicada para o setor de compras visualizar peças em falta, preencher dados de fornecedores, datas estimadas de entrega e marcar peças como recebidas para reativar as manutenções.
- 📊 **Métricas com Recharts:** Gráficos interativos ilustrando a distribuição de esteiras por status (Manutenção, Pronta, Apenas Aguardando Peças, Vendida) e saúde do inventário de peças.
- 🗂️ **Logs de Auditoria e Notificações:** Registro histórico de quem cadastrou, vendeu, editou ou arquivou cada recurso, além de alertas do sistema.

---

## 👥 Matriz de Papéis & Permissões (RBAC)

O sistema possui quatro tipos de usuários:

| Funcionalidade | Administrador (`admin`) | Técnico (`tecnico`) | Compras (`compras`) | Leitor/Vendedor (`leitor`) |
| :--- | :---: | :---: | :---: | :---: |
| **Visualizar Dashboard** | ✅ | ✅ (Limitado) | ✅ (Limitado) | ✅ (Limitado) |
| **Cadastrar/Editar Esteiras** | ✅ | ✅ | ❌ | ❌ |
| **Visualizar Esteiras e Vendas** | ✅ | ✅ | ❌ | ✅ |
| **Registrar Manutenção** | ✅ | ✅ | ❌ | ❌ |
| **Escanear QR Codes** | ✅ | ✅ | ❌ | ✅ |
| **Requisitar Peças** | ✅ | ✅ | ❌ | ❌ |
| **Aprovar/Registrar Compras** | ✅ | ❌ | ✅ | ❌ |
| **Gerenciar Usuários & Logs** | ✅ | ❌ | ❌ | ❌ |

---

## 🗂️ Estrutura do Projeto (Next.js)

```
esteira-management-system/
├── app/                      # Next.js App Router
│   ├── api/                  # APIs e endpoints do backend serverless
│   ├── dashboard/            # Páginas do painel administrativo
│   │   ├── archived/         # Equipamentos arquivados
│   │   ├── compras/          # Triagem de peças pendentes
│   │   ├── configuracoes/    # Opções do sistema
│   │   ├── esteiras/         # Inventário de esteiras (CRUD)
│   │   ├── logs/             # Logs de auditoria geral
│   │   ├── manutencao/       # Ordens de manutenção
│   │   ├── notificacoes/     # Inbox de alertas
│   │   ├── pecas/            # Inventário de peças
│   │   ├── perfil/           # Edição do perfil de usuário ativo
│   │   ├── relatorios/       # Exportador de PDF e relatórios
│   │   ├── scanner/          # Leitor de câmera QR Code
│   │   ├── usuarios/         # Gerenciador de usuários (Admin)
│   │   └── vendidos/         # Lista de equipamentos faturados/vendidos
│   ├── login/                # Tela de autenticação
│   ├── globals.css           # Estilos globais e Tailwind v4
│   ├── layout.tsx            # Raiz HTML e Contextos globais
│   └── page.tsx              # Roteador inicial de sessão
├── components/               # Componentes de interface (UI)
│   ├── ui/                   # Componentes Radix (Cards, Buttons, Dialogs, etc.)
│   ├── app-sidebar.tsx       # Menu de navegação lateral responsivo com RBAC
│   ├── auth-guard.tsx        # Validador de sessões e rotas privadas
│   ├── status-badge.tsx      # Badges dinâmicas de status
│   └── theme-provider.tsx    # Controle de modo claro/escuro
├── contexts/                 # Contextos do React (AuthContext)
├── hooks/                    # Custom Hooks reutilizáveis
├── lib/                      # Configurações de serviços e tipos
│   ├── services/             # Regras de negócio e CRUDs (treadmills, parts, maintenance, users)
│   │   ├── treadmill-service.ts
│   │   ├── parts-service.ts
│   │   ├── maintenance-service.ts
│   │   ├── logs-service.ts
│   │   └── user-service.ts
│   ├── firebase.ts           # Configuração do Firebase Client SDK
│   ├── cloudinary.ts         # Integração de fotos de esteiras/peças no Cloudinary
│   └── types.ts              # Definições de tipos TypeScript
├── public/                   # Arquivos estáticos (Logos e Ícones)
├── styles/                   # Módulos adicionais de estilo
├── tsconfig.json             # Configuração TypeScript
├── package.json              # Lista de dependências e scripts npm
├── next.config.mjs           # Configurações do compilador Next.js
└── tailwind.config.mjs       # Configurações de layout Tailwind CSS
```

---

## ⚙️ Instalação e Execução Local

### Pré-requisitos
- **Node.js 20.x** (Obrigatório devido à verificação pré-instalação contida no projeto)
- **NPM** ou **PNPM**

### Passo 1: Instalação das Dependências

Instale os pacotes necessários:
```bash
npm install
```
*(Nota: A instalação executa uma validação automática para garantir que você está rodando o Node.js v20.x).*

### Passo 2: Configurar as Variáveis de Ambiente

Crie um arquivo chamado `.env.local` na raiz do projeto com as chaves de acesso do Firebase e do Cloudinary (utilizado para upload de fotos das manutenções e das esteiras):

```env
# Configurações do Firebase Web SDK
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# Cloudinary (Armazenamento de Mídia)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key_cloudinary
CLOUDINARY_API_SECRET=sua_api_secret_cloudinary
```

### Passo 3: Rodar o Servidor de Desenvolvimento

Execute o comando local:
```bash
npm run dev
```
Acesse o painel em: [http://localhost:3000](http://localhost:3000).

---

## ⚡ Geração de Builds e Produção

Para testar o build estático ou compilar o projeto para deploy em produção:

```bash
# Compilar projeto
npm run build

# Iniciar servidor compilado localmente
npm run start

# Executar verificador de lints do TypeScript/ESLint
npm run lint
```

---

## 🗄️ Estrutura de Estados de Equipamento (Treadmills)

- **`pronta`** (Pronta para Venda): Equipamento higienizado, revisado e disponível para o time de vendas.
- **`manutencao`** (Em Manutenção): O equipamento está sob revisão na bancada técnica.
- **`aguardando_pecas`** (Aguardando Peças): Há um registro de peça associada com status `faltando` ou `comprada`. O processo técnico fica pausado até que o item chegue.
- **`indisponivel`** (Indisponível): Retirado de circulação ou sucateado.
- **`vendido`** (Vendido): Equipamento faturado e enviado ao cliente (vinculado a um número de ordem de venda).

---

## 📄 Licença

Este software é de propriedade restrita da **Fênix Company**.
Todos os direitos reservados, 2026.
