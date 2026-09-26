export class QuizWriteError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

function questionLabel(question: any) {
  const text = String(question?.question || question?.question_text || '').trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : (text || 'tanpa teks')
}

/** Nomor correct_answer di file latihan dimulai dari 0. */
export function correctAnswerIndex(question: any): number | null {
  const raw = question?.correct_answer
  if (raw === undefined || raw === null || raw === '') return null
  const index = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isInteger(index)) return null
  return index
}

export function optionText(opt: any) {
  if (typeof opt === 'string') return opt.trim()
  return String(opt?.option_text || '').trim()
}

/**
 * Pilihan berupa teks memakai nomor correct_answer.
 * Pilihan yang sudah membawa is_correct tetap memakai tanda itu.
 */
export function optionIsCorrect(opt: any, optIdx: number, question: any) {
  if (typeof opt === 'string') {
    const index = correctAnswerIndex(question)
    if (index === null) {
      throw new QuizWriteError(
        `Soal "${questionLabel(question)}" punya pilihan berupa teks, tetapi correct_answer kosong atau bukan angka.`,
      )
    }
    return optIdx === index
  }

  if (opt && typeof opt.is_correct === 'boolean' && correctAnswerIndex(question) === null) {
    return opt.is_correct
  }

  const index = correctAnswerIndex(question)
  if (index !== null) return optIdx === index
  return !!opt?.is_correct
}

export function buildOptionRows(question: any, sortFromImport: boolean) {
  if (!Array.isArray(question?.options) || question.options.length < 2) {
    throw new QuizWriteError(`Soal "${questionLabel(question)}" perlu minimal dua pilihan jawaban.`)
  }

  const rows = question.options.map((opt: any, optIdx: number) => ({
    option_text: optionText(opt),
    is_correct: optionIsCorrect(opt, optIdx, question),
    sort_order: optIdx + 1,
  }))

  if (sortFromImport && rows.some((row: { option_text: string }) => !row.option_text)) {
    throw new QuizWriteError(`Soal "${questionLabel(question)}" punya pilihan jawaban yang kosong.`)
  }

  if (!rows.some((row: { is_correct: boolean }) => row.is_correct)) {
    const index = correctAnswerIndex(question)
    const hint = index === null
      ? 'Tandai satu jawaban benar.'
      : `correct_answer ${index} tidak menunjuk ke salah satu pilihan (pilihan dihitung dari 0).`
    throw new QuizWriteError(`Soal "${questionLabel(question)}" belum punya jawaban benar. ${hint}`)
  }

  return rows
}

/** Urutan modul di file dihitung dari 1, sama seperti urutan yang tampil di halaman kursus. */
export function sectionOrderNumber(section: any, fallbackIndex: number) {
  const raw = section?.section_order ?? section?.sort_order ?? fallbackIndex
  const order = Number(raw)
  return Number.isInteger(order) && order > 0 ? order : fallbackIndex
}

export function pickSectionByOrder(
  sections: Array<{ id: number; sort_order?: number | null }>,
  order: number,
) {
  const ordered = [...sections].sort((a, b) => {
    const byOrder = (a.sort_order || 0) - (b.sort_order || 0)
    if (byOrder !== 0) return byOrder
    return a.id - b.id
  })
  return ordered[order - 1] || null
}

export function slugifyTitle(value: string) {
  const base = (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return `${base || 'materi'}-${suffix}`
}

export function extractYouTubeId(url: string) {
  if (!url) return ''
  const trimmed = url.trim()
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (match) return match[1]
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  return ''
}
