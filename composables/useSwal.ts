import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

// Toast Notification Instance
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
  customClass: {
    popup: 'rounded-2xl shadow-xl font-sans border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white',
  },
})

export function useSwal() {
  const toastSuccess = (title: string) => {
    Toast.fire({
      icon: 'success',
      title: title || 'Berhasil!',
    })
  }

  const toastError = (title: string) => {
    Toast.fire({
      icon: 'error',
      title: title || 'Terjadi kesalahan!',
    })
  }

  const toastWarning = (title: string) => {
    Toast.fire({
      icon: 'warning',
      title: title || 'Peringatan!',
    })
  }

  const toastInfo = (title: string) => {
    Toast.fire({
      icon: 'info',
      title: title || 'Informasi',
    })
  }

  const fireSuccess = (title: string, text = '') => {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      confirmButtonText: 'Selesai',
      confirmButtonColor: '#4f46e5',
      customClass: {
        popup: 'rounded-3xl shadow-2xl font-sans dark:bg-slate-900 dark:text-white',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm',
      },
    })
  }

  const fireError = (title: string, text = '') => {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#e11d48',
      customClass: {
        popup: 'rounded-3xl shadow-2xl font-sans dark:bg-slate-900 dark:text-white',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm',
      },
    })
  }

  const confirmDialog = async ({
    title = 'Apakah Anda yakin?',
    text = 'Tindakan ini tidak dapat dibatalkan.',
    icon = 'warning' as any,
    confirmButtonText = 'Ya, Lanjutkan',
    cancelButtonText = 'Batal',
    confirmButtonColor = '#4f46e5',
    cancelButtonColor = '#94a3b8',
  } = {}) => {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonColor,
      cancelButtonColor,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl shadow-2xl font-sans dark:bg-slate-900 dark:text-white',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm text-white',
        cancelButton: 'px-5 py-2.5 rounded-xl font-bold text-sm text-white',
      },
    })

    return result.isConfirmed
  }

  const confirm = async (title: string, text: string, confirmButtonText = 'Ya, Lanjutkan') => {
    return confirmDialog({
      title,
      text,
      confirmButtonText,
    })
  }

  return {
    Swal,
    Toast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    fireSuccess,
    fireError,
    confirmDialog,
    confirm,
  }
}

export { Swal }
export default useSwal
