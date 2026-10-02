import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { DEFAULT_WHATSAPP_GROUPS, WHATSAPP_GROUP_SETTING_KEYS } from '~/utils/whatsappGroups'

export default defineEventHandler(async (event) => {
  const fallback = {
    muslim: DEFAULT_WHATSAPP_GROUPS.muslim,
    muslimah: DEFAULT_WHATSAPP_GROUPS.muslimah,
  }

  try {
    const client = getAdminSupabaseClient(event)
    const { data, error } = await client
      .from('settings')
      .select('key, value')
      .in('key', [WHATSAPP_GROUP_SETTING_KEYS.muslim, WHATSAPP_GROUP_SETTING_KEYS.muslimah])

    if (error || !data) return fallback

    const saved = Object.fromEntries(data.map((row: { key: string; value: string | null }) => [row.key, row.value]))
    return {
      muslim: saved[WHATSAPP_GROUP_SETTING_KEYS.muslim] || fallback.muslim,
      muslimah: saved[WHATSAPP_GROUP_SETTING_KEYS.muslimah] || fallback.muslimah,
    }
  } catch {
    return fallback
  }
})
