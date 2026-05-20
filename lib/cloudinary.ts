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
