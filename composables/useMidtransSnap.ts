type MidtransCheckout = {
  token?: string | null
  redirect_url?: string
  client_key: string
  snap_js: string
}

export function useMidtransSnap() {
  const openPayment = (snap: MidtransCheckout) => {
    if (!snap.token) {
      if (!snap.redirect_url) {
        return Promise.reject(new Error('Tautan pembayaran tidak tersedia.'))
      }
      window.location.href = snap.redirect_url
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      const start = () => {
        const snapPay = (window as any).snap
        if (!snapPay?.pay) {
          reject(new Error('Halaman pembayaran belum siap.'))
          return
        }
        snapPay.pay(snap.token, {
          onSuccess: () => resolve(),
          onPending: () => resolve(),
          onError: () => reject(new Error('Pembayaran tidak dapat dilanjutkan.')),
          onClose: () => resolve(),
        })
      }

      if ((window as any).snap) {
        start()
        return
      }

      const script = document.createElement('script')
      script.src = snap.snap_js
      script.setAttribute('data-client-key', snap.client_key)
      script.onload = () => start()
      script.onerror = () => reject(new Error('Gagal memuat pembayaran Midtrans.'))
      document.body.appendChild(script)
    })
  }

  return { openPayment }
}
