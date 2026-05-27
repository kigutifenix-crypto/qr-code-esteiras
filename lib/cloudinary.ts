export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary não está configurado. Defina NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'imagens')

  let response: Response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    console.error('Network error while uploading to Cloudinary', err)
    throw new Error('Erro de rede ao enviar imagem para Cloudinary')
  }

  let data: any
  try {
    data = await response.json()
  } catch (err) {
    console.error('Invalid JSON response from Cloudinary', err)
    throw new Error(`Resposta inválida do Cloudinary (status ${response.status})`)
  }

  if (!response.ok) {
    console.error('Cloudinary upload error', response.status, data)
    const msg = data?.error?.message || data?.message || JSON.stringify(data) || `Upload failed with status ${response.status}`
    throw new Error(`Cloudinary upload failed: ${msg}`)
  }

  return data.secure_url as string
}

export function getCloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname
    const uploadIndex = path.indexOf('/upload/')
    if (uploadIndex === -1) {
      return null
    }

    const afterUpload = path.slice(uploadIndex + '/upload/'.length)
    const segments = afterUpload.split('/')
    let publicIdStartIndex = 0

    while (publicIdStartIndex < segments.length && !/^v\d+$/.test(segments[publicIdStartIndex])) {
      publicIdStartIndex += 1
    }

    if (publicIdStartIndex < segments.length && /^v\d+$/.test(segments[publicIdStartIndex])) {
      publicIdStartIndex += 1
    }

    const publicIdSegments = segments.slice(publicIdStartIndex)
    if (publicIdSegments.length === 0) {
      return null
    }

    let publicId = publicIdSegments.join('/')
    const extensionIndex = publicId.lastIndexOf('.')
    if (extensionIndex !== -1) {
      publicId = publicId.slice(0, extensionIndex)
    }

    return decodeURIComponent(publicId)
  } catch (err) {
    console.error('Erro ao extrair public_id do Cloudinary URL', err)
    return null
  }
}

export async function deleteImageFromCloudinary(url: string): Promise<void> {
  const publicId = getCloudinaryPublicIdFromUrl(url)
  if (!publicId) {
    throw new Error('Não foi possível extrair o public_id da imagem do Cloudinary.')
  }

  const response = await fetch('/api/cloudinary/destroy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ publicId }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Falha ao excluir imagem antiga no Cloudinary: ${text}`)
  }

  const responseData = await response.json().catch(() => null)
  if (!responseData?.success) {
    throw new Error(
      `Falha ao excluir imagem antiga no Cloudinary: ${JSON.stringify(responseData)}`
    )
  }
}
