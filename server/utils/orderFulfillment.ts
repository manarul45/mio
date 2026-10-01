import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Tandai pesanan lunas, aktifkan akses semua kursus di dalamnya, dan setujui komisi afiliasinya.
 * Progres belajar pada pendaftaran yang sudah ada tidak diubah.
 */
export async function fulfillPaidOrder(
  client: SupabaseClient,
  order: { id: number; user_id: string },
  paymentInfo: { payment_method?: string; payment_gateway_ref?: string | null } = {},
) {
  const now = new Date().toISOString()

  const { error: orderError } = await client
    .from('orders')
    .update({ status: 'paid', paid_at: now, updated_at: now, ...paymentInfo })
    .eq('id', order.id)
  if (orderError) throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui pesanan: ' + orderError.message })

  const { data: items, error: itemsError } = await client
    .from('order_items')
    .select('course_id')
    .eq('order_id', order.id)
  if (itemsError) throw createError({ statusCode: 500, statusMessage: itemsError.message })

  const courseIds = [...new Set((items || []).map((item: any) => Number(item.course_id)))]
  if (courseIds.length) {
    const { error: enrollError } = await client.from('enrollments').upsert(
      courseIds.map((course_id) => ({
        user_id: order.user_id,
        course_id,
        order_id: order.id,
        status: 'active',
        updated_at: now,
      })),
      { onConflict: 'user_id,course_id' },
    )
    if (enrollError) throw createError({ statusCode: 500, statusMessage: 'Gagal mengaktifkan kursus: ' + enrollError.message })
  }

  await client
    .from('affiliate_commissions')
    .update({ status: 'approved', approved_at: now })
    .eq('order_id', order.id)
    .eq('status', 'pending')

  return { course_ids: courseIds }
}

/** Batalkan pesanan yang belum lunas dan hapus komisi afiliasi yang masih menunggu. */
export async function cancelPendingOrder(
  client: SupabaseClient,
  orderId: number,
  status: 'cancelled' | 'failed' = 'cancelled',
) {
  const { error } = await client
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Gagal membatalkan pesanan: ' + error.message })

  await client
    .from('affiliate_commissions')
    .delete()
    .eq('order_id', orderId)
    .eq('status', 'pending')
}
