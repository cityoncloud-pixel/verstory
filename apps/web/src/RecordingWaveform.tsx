import { useEffect, useRef } from 'react'

export function RecordingWaveform({ stream, height = 28 }: { stream: MediaStream | null; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !stream) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const data = new Uint8Array(analyser.fftSize)

    const draw = () => {
      analyser.getByteTimeDomainData(data)
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#e11d48'
      ctx.beginPath()
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0
        const y = (v * h) / 2
        const x = (i / (data.length - 1)) * w
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      rafRef.current = window.requestAnimationFrame(draw)
    }

    draw()
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      try {
        source.disconnect()
      } catch {
        // ignore
      }
      try {
        analyser.disconnect()
      } catch {
        // ignore
      }
      ac.close().catch(() => {})
    }
  }, [stream])

  return <canvas className="recordWave" ref={canvasRef} width={240} height={height} />
}

