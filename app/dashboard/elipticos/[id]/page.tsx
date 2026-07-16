'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ElipticoDetailRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/dashboard/esteiras/${id}?back=/dashboard/elipticos`)
  }, [id, router])

  return null
}
