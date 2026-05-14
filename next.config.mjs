/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Habilitar verificação de tipos para melhor performance
  },
  images: {
    unoptimized: false, // Otimizar imagens para melhor performance
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Otimizar imports de pacotes
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remover console.logs em produção
  },
  allowedDevOrigins: ['10.100.2.18'],
}

export default nextConfig
