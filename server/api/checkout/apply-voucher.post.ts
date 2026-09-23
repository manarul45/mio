import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, amount } = body

  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Kode voucher harus diisi.' })
  }

  const supabase = await serverSupabaseClient(event)
  const cleanCode = code.trim().toUpperCase()

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', cleanCode)
    .eq('is_active', true)
    .single()

  if (error || !voucher) {
    throw createError({ statusCode: 422, statusMessage: `Kode voucher '${cleanCode}' tidak ditemukan atau sudah tidak aktif.` })
  }

  // Check expiration
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    throw createError({ statusCode: 422, statusMessage: `Kode voucher '${cleanCode}' sudah kedaluwarsa.` })
  }

  // Check usage limit
  if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
    throw createError({ statusCode: 422, statusMessage: `Kuota penggunaan voucher '${cleanCode}' telah habis.` })
  }

  // Check minimum amount
  const baseAmount = Number(amount) || 0
  if (voucher.min_order_amount && baseAmount < Number(voucher.min_order_amount)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Voucher ini memerlukan minimal pembelian Rp ${Number(voucher.min_order_amount).toLocaleString('id-ID')}.`
    })
  }

  // Calculate discount
  let discount = 0
  if (voucher.type === 'percentage') {
    discount = (baseAmount * Number(voucher.discount_amount)) / 100
    if (voucher.max_discount_amount && discount > Number(voucher.max_discount_amount)) {
      discount = Number(voucher.max_discount_amount)
    }
  } else {
    discount = Number(voucher.discount_amount)
  }

  discount = Math.min(discount, baseAmount)

  return {
    success: true,
    code: voucher.code,
    name: voucher.name,
    type: voucher.type,
    discount_amount: discount,
    message: `Voucher '${voucher.code}' berhasil diterapkan! Hemat Rp ${discount.toLocaleString('id-ID')}`
  }
})
