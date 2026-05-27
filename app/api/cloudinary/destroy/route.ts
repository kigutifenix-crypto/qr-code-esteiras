import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function parseCloudinaryUrl(url: string) {
  try {
    const parsed = new URL(url)
    const [username, password] = parsed.username ? [parsed.username, parsed.password] : [null, null]
    return {
      cloudName: parsed.hostname,
      apiKey: username ?? null,
      apiSecret: password ?? null,
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  let cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME
  let apiKey: string | undefined = process.env.CLOUDINARY_API_KEY
  let apiSecret: string | undefined = process.env.CLOUDINARY_API_SECRET

  if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL)
    if (parsed) {
      cloudName = cloudName || parsed.cloudName || undefined
      apiKey = apiKey || parsed.apiKey || undefined
      apiSecret = apiSecret || parsed.apiSecret || undefined
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          'Cloudinary não está configurado para exclusão no servidor. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET, ou CLOUDINARY_URL.',
      },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  const publicId = body?.publicId

  if (!publicId || typeof publicId !== 'string') {
    return NextResponse.json(
      { error: 'O campo publicId é obrigatório.' },
      { status: 400 }
    )
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const params = new URLSearchParams()
  params.append('public_id', publicId)
  params.append('invalidate', 'true')
  params.append('resource_type', 'image')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || data?.result !== 'ok') {
    return NextResponse.json(
      {
        error: 'Falha ao excluir imagem do Cloudinary.',
        details: data,
      },
      { status: response.ok ? 500 : response.status }
    )
  }

  return NextResponse.json({ success: true, details: data })
}
