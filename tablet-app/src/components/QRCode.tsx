import { useEffect, useState } from 'react'
import QRCodeLib from 'qrcode'
import { Loader2 } from 'lucide-react'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

export function QRCode({ value, size = 256, className = '' }: QRCodeProps) {
  const [qrImage, setQrImage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!value) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrImage(url)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [value, size])

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-white rounded-2xl ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !qrImage) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-2xl text-gray-500 ${className}`}
        style={{ width: size, height: size }}
      >
        Ошибка генерации QR
      </div>
    )
  }

  return (
    <div className={`bg-white p-4 rounded-2xl inline-block ${className}`}>
      <img 
        src={qrImage} 
        alt="QR Code" 
        width={size} 
        height={size}
        className="block"
      />
    </div>
  )
}
