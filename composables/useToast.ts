import { Toast, useSwal } from './useSwal'

export function useToast() {
  const swal = useSwal()

  const success = (msg: string) => {
    if (!msg) return
    Toast.fire({
      icon: 'success',
      title: msg,
    })
  }

  const error = (msg: string) => {
    if (!msg) return
    Toast.fire({
      icon: 'error',
      title: msg,
    })
  }

  const warning = (msg: string) => {
    if (!msg) return
    Toast.fire({
      icon: 'warning',
      title: msg,
    })
  }

  const info = (msg: string) => {
    if (!msg) return
    Toast.fire({
      icon: 'info',
      title: msg,
    })
  }

  return {
    success,
    error,
    warning,
    info,
    ...swal,
  }
}

export default useToast
