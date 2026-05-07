import { useEffect, useMemo, useState } from 'react'

export function AudioPlayer({ source }: { source: Blob | string }) {
  const [url, setUrl] = useState<string>('')
  const key = useMemo(() => {
    if (typeof source === 'string') return source
    return `${source.type}:${source.size}`
  }, [source])

  useEffect(() => {
    if (typeof source === 'string') {
      setUrl(source || '')
      return
    }
    const nextUrl = URL.createObjectURL(source)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [source, key])

  if (!url) return null
  return <audio controls src={url} />
}
