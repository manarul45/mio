export const DEFAULT_INSTRUCTOR_NAMES = [
  'Muh. Arvan Amal, M.Pd.I.',
  'Baskah Firmansyah Bakhtiar',
]

const ROSTER_KEY = 'instructor_roster'
const MAP_KEY = 'course_instructor_names'

function parseStringList(value: string | null | undefined) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const names = parsed.map((item) => String(item || '').trim()).filter(Boolean)
    return names.length ? names : null
  } catch {
    return null
  }
}

function parseNameMap(value: string | null | undefined) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const map: Record<string, string> = {}
    for (const [id, name] of Object.entries(parsed)) {
      const clean = String(name || '').trim()
      if (clean) map[String(id)] = clean
    }
    return map
  } catch {
    return {}
  }
}

async function readSetting(client: any, key: string) {
  const { data, error } = await client.from('settings').select('value').eq('key', key).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: 'Gagal membaca daftar pengajar.' })
  return data?.value as string | null | undefined
}

async function writeSetting(client: any, key: string, value: string) {
  const { error } = await client.from('settings').upsert({
    key,
    value,
    type: 'json',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan daftar pengajar.' })
}

export async function getInstructorRoster(client: any) {
  const saved = parseStringList(await readSetting(client, ROSTER_KEY))
  if (saved) return saved
  await writeSetting(client, ROSTER_KEY, JSON.stringify(DEFAULT_INSTRUCTOR_NAMES))
  return [...DEFAULT_INSTRUCTOR_NAMES]
}

export async function getCourseInstructorMap(client: any) {
  return parseNameMap(await readSetting(client, MAP_KEY))
}

export async function addInstructorName(client: any, rawName: string) {
  const name = String(rawName || '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Nama pengajar wajib diisi.' })
  if (name.length > 120) throw createError({ statusCode: 400, statusMessage: 'Nama pengajar terlalu panjang.' })

  const roster = await getInstructorRoster(client)
  if (roster.some((item) => item.toLowerCase() === name.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: 'Nama pengajar itu sudah ada.' })
  }
  roster.push(name)
  await writeSetting(client, ROSTER_KEY, JSON.stringify(roster))
  return roster
}

export async function removeInstructorName(client: any, rawName: string) {
  const name = String(rawName || '').trim()
  const roster = (await getInstructorRoster(client)).filter((item) => item !== name)
  await writeSetting(client, ROSTER_KEY, JSON.stringify(roster))

  const map = await getCourseInstructorMap(client)
  const nextMap = Object.fromEntries(Object.entries(map).filter(([, value]) => value !== name))
  await writeSetting(client, MAP_KEY, JSON.stringify(nextMap))
  return roster
}

export async function setCourseInstructorName(client: any, courseId: string | number, rawName: string) {
  const name = String(rawName || '').trim()
  const roster = await getInstructorRoster(client)
  if (!roster.includes(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih nama pengajar dari daftar.' })
  }
  const map = await getCourseInstructorMap(client)
  map[String(courseId)] = name
  await writeSetting(client, MAP_KEY, JSON.stringify(map))
  return name
}

export function applyInstructorName(course: any, map: Record<string, string>) {
  if (!course?.id) return course
  const name = map[String(course.id)]
  if (!name) return course
  course.instructor = { ...(course.instructor || {}), name }
  return course
}
