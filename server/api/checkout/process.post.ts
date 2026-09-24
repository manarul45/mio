import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { course_id, voucher_code, customer_whatsapp, affiliate_user_id } = body

  if (!course_id) {
    throw createError({ statusCode: 400, statusMessage: 'Kursus wajib dipilih.' })
  }

  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Anda harus masuk akun terlebih dahulu untuk melanjutkan pendaftaran.' })
  }

  // 1. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, price, discount_price, instructor_id, status, custom_commission_rate')
    .eq('id', course_id)
    .single()

  if (courseError || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan.' })
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existingEnrollment) {
    throw createError({ statusCode: 400, statusMessage: 'Anda sudah terdaftar di kursus ini.' })
  }

  const basePrice = course.discount_price && Number(course.discount_price) < Number(course.price)
    ? Number(course.discount_price)
    : Number(course.price)

  let voucherDiscount = 0
  let validVoucherCode: string | null = null

  // 2. Validate voucher if provided
  if (voucher_code) {
    const cleanCode = voucher_code.trim().toUpperCase()
    const { data: voucher } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle()

    if (voucher) {
      validVoucherCode = voucher.code
      if (voucher.type === 'percentage') {
        voucherDiscount = (basePrice * Number(voucher.discount_amount)) / 100
        if (voucher.max_discount_amount && voucherDiscount > Number(voucher.max_discount_amount)) {
          voucherDiscount = Number(voucher.max_discount_amount)
        }
      } else {
        voucherDiscount = Number(voucher.discount_amount)
      }
      voucherDiscount = Math.min(voucherDiscount, basePrice)

      // Increment voucher count
      await supabase
        .from('vouchers')
        .update({ used_count: (voucher.used_count || 0) + 1 })
        .eq('id', voucher.id)
    }
  }

  const finalAmount = Math.max(0, basePrice - voucherDiscount)
  const isFree = finalAmount === 0

  // 3. Generate unique order number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const orderNumber = `MIO-${dateStr}-${randomSuffix}`

  // Validate affiliate user id
  let validAffiliateId: string | null = null
  if (affiliate_user_id && affiliate_user_id !== user.id) {
    const { data: affUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', affiliate_user_id)
      .maybeSingle()
    if (affUser) {
      validAffiliateId = affUser.id
    }
  }

  // 4. Create Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      customer_whatsapp: customer_whatsapp || null,
      affiliate_user_id: validAffiliateId,
      total_amount: course.price,
      discount_amount: course.price - basePrice,
      final_amount: finalAmount,
      voucher_code: validVoucherCode,
      voucher_discount_amount: voucherDiscount,
      status: isFree ? 'paid' : 'pending',
      payment_method: isFree ? 'free_enrollment' : 'bank_transfer',
      paid_at: isFree ? new Date().toISOString() : null
    })
    .select()
    .single()

  if (orderError || !order) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal membuat pesanan: ' + orderError?.message })
  }

  // 5. Calculate revenue shares
  const affiliateRate = validAffiliateId ? (Number(course.custom_commission_rate) || 20) : 0
  const affiliateEarning = (finalAmount * affiliateRate) / 100
  const instructorRate = 70
  const instructorEarning = (finalAmount * instructorRate) / 100
  const platformEarning = Math.max(0, finalAmount - (affiliateEarning + instructorEarning))

  // Create Order Item
  const { data: orderItem } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      course_id: course.id,
      instructor_id: course.instructor_id,
      price: course.price,
      discount_price: course.discount_price,
      final_price: finalAmount,
      instructor_share_rate: instructorRate,
      affiliate_commission_rate: affiliateRate,
      instructor_earning: instructorEarning,
      affiliate_earning: affiliateEarning,
      platform_earning: platformEarning
    })
    .select()
    .single()

  // If affiliate exists and order is free, create cleared commission immediately
  if (validAffiliateId && orderItem && affiliateEarning > 0) {
    await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_user_id: validAffiliateId,
        order_id: order.id,
        order_item_id: orderItem.id,
        course_id: course.id,
        amount: affiliateEarning,
        status: isFree ? 'approved' : 'pending',
        approved_at: isFree ? new Date().toISOString() : null,
      })
  }

  // 6. If Free, enroll immediately!
  if (isFree) {
    await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: course.id,
        order_id: order.id,
        status: 'active'
      })
  }

  return {
    success: true,
    order_number: order.order_number,
    is_free: isFree,
    final_amount: finalAmount,
    message: isFree
      ? 'Pendaftaran kursus gratis berhasil! Selamat belajar.'
      : 'Pesanan berhasil dibuat. Silakan lakukan pembayaran transfer.'
  }
})
