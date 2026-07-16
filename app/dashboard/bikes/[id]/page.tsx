'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function BikeDetailRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/dashboard/esteiras/${id}?back=/dashboard/bikes`)
  }, [id, router])

  return null
}
