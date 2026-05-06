import { useEffect, useMemo, useState } from 'react'

export function AudioPlayer({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>('')
  const key = useMemo(() => `${blob.type}:${blob.size}`, [blob.type, blob.size])

  useEffect(() => {
    const nextUrl = URL.createObjectURL(blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
    // blob reference is stable from IndexedDB objects; key change forces refresh
  }, [blob, key])

  return <audio controls src={url} />
}

