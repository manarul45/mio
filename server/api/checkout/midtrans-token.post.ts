import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'
import { createSnapTransaction, getMidtransConfig } from '~/server/utils/midtrans'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Anda harus masuk akun terlebih dahulu.' })
  }

  const body = await readBody(event)
  const orderNumber = String(body?.order_number || '').trim()
  if (!orderNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Nomor pesanan wajib diisi.' })
  }

  const client = getAdminSupabaseClient(event)
  const { data: order } = await client
    .from('orders')
    .select('id, order_number, user_id, final_amount, status, customer_whatsapp, payment_gateway_ref')
    .eq('order_number', orderNumber)
    .eq('user_id', userId)
    .maybeSingle()

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
  }
  if (order.status === 'paid') {
    throw createError({ statusCode: 400, statusMessage: 'Pesanan ini sudah lunas.' })
  }

  const { data: item } = await client
    .from('order_items')
    .select('course:courses(title)')
    .eq('order_id', order.id)
    .limit(1)
    .maybeSingle()

  const { data: profile } = await client
    .from('profiles')
    .select('name, email, whatsapp_number')
    .eq('id', userId)
    .maybeSingle()

  const grossAmount = Math.round(Number(order.final_amount))
  if (grossAmount < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Tagihan nol tidak perlu dibayar lewat Midtrans.' })
  }

  const finishUrl = `${getRequestURL(event).origin}/orders/${order.order_number}`
  const courseTitle = (item as any)?.course?.title || 'Kursus MIO Academy'
  let snap: Awaited<ReturnType<typeof createSnapTransaction>>
  try {
    snap = await createSnapTransaction({
      orderNumber: order.order_number,
      grossAmount,
      courseTitle,
      customerName: profile?.name || 'Siswa',
      customerEmail: profile?.email || 'siswa@mioacademy.id',
      customerPhone: order.customer_whatsapp || profile?.whatsapp_number,
      finishUrl,
    })
  } catch (err) {
    const savedRef = String(order.payment_gateway_ref || '')
    if (!savedRef.startsWith('http')) throw err
    const config = getMidtransConfig()
    return {
      token: null,
      redirect_url: savedRef,
      client_key: config.clientKey,
      snap_js: config.snapJs,
    }
  }

  const gatewayRef = snap.redirectUrl.length <= 100 ? snap.redirectUrl : String(snap.token).slice(0, 100)
  await client
    .from('orders')
    .update({
      payment_method: 'midtrans',
      payment_gateway_ref: gatewayRef,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return {
    token: snap.token,
    redirect_url: snap.redirectUrl,
    client_key: snap.clientKey,
    snap_js: snap.snapJs,
  }
})
