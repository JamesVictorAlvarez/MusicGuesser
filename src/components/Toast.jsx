import { useEffect } from 'react'
import './Toast.css'

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div className="toast" onClick={onClose}>
      <div className="toast-content">
        <span className="toast-message">{message}</span>
      </div>
    </div>
  )
}

