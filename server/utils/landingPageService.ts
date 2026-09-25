export interface ShortcodeItem {
  code: string
  description: string
}

export const WHITELISTED_SHORTCODES: ShortcodeItem[] = [
  { code: '{{course_title}}', description: 'Judul kursus' },
  { code: '{{course_description}}', description: 'Deskripsi lengkap kursus' },
  { code: '{{course_price}}', description: 'Harga kursus (Format Rp)' },
  { code: '{{course_thumbnail}}', description: 'URL gambar thumbnail kursus' },
  { code: '{{course_url}}', description: 'URL halaman detail kursus / checkout' },
  { code: '{{instructor_name}}', description: 'Nama instruktur kursus' },
  { code: '{{instructor_avatar}}', description: 'URL foto profil instruktur' },
  { code: '{{instructor_bio}}', description: 'Bio / profil singkat instruktur' },
  { code: '{{category_name}}', description: 'Nama kategori kursus' },
  { code: '{{site_name}}', description: 'Nama platform / aplikasi' },
  { code: '{{site_logo}}', description: 'URL logo platform' },
  { code: '[whatsapp_button label="Daftar via WhatsApp"]', description: 'Tombol CTA WhatsApp interaktif' },
  { code: '[stats_overview]', description: 'Komponen kartu 4 statistik santri & kursus' },
  { code: '[portal_classes]', description: 'Tombol CTA Jelajah Seluruh Program Kelas' },
]

export function resolveShortcodes(content: string, course?: any, settings?: Record<string, string>): string {
  const siteName = settings?.platform_name || 'MIO Academy'
  const siteLogo = settings?.site_logo || 'https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png'
  const adminWhatsapp = settings?.admin_whatsapp_number || '6281234567890'

  let replacements: Record<string, string> = {}

  if (course) {
    const effectivePrice = course.discount_price && Number(course.discount_price) < Number(course.price)
      ? Number(course.discount_price)
      : Number(course.price)

    const priceText = effectivePrice > 0
      ? 'Rp ' + Number(effectivePrice).toLocaleString('id-ID')
      : 'Gratis'

    replacements = {
      '{{course_title}}': course.title || '',
      '{{course_description}}': course.description || course.subtitle || '',
      '{{course_price}}': priceText,
      '{{course_thumbnail}}': course.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      '{{course_url}}': `/courses/${course.slug || ''}`,
      '{{instructor_name}}': course.instructor?.name || 'Instruktur MIO Academy',
      '{{instructor_avatar}}': course.instructor?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      '{{instructor_bio}}': course.instructor?.bio || course.instructor?.headline || 'Pendidik & Praktisi Ahli',
      '{{category_name}}': course.category?.name || 'Umum',
      '{{site_name}}': siteName,
      '{{site_logo}}': siteLogo,
      '{{platform:name}}': siteName,
      '{{platform:whatsapp}}': adminWhatsapp,
    }
  } else {
    replacements = {
      '{{course_title}}': 'Fiqih Muamalah & Literasi Syariah',
      '{{course_description}}': 'Kuasai kaidah fikih muamalah kontemporer bersama para asatidz berpengalaman.',
      '{{course_price}}': 'Rp 199.000',
      '{{course_thumbnail}}': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      '{{course_url}}': '/courses',
      '{{instructor_name}}': 'Ustadz Manarul Ilmi, Lc., M.H.',
      '{{instructor_avatar}}': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      '{{instructor_bio}}': 'Pakar Hukum Syariah & Edukator Akademik',
      '{{category_name}}': 'Syariah & Fiqih',
      '{{site_name}}': siteName,
      '{{site_logo}}': siteLogo,
      '{{platform:name}}': siteName,
      '{{platform:whatsapp}}': adminWhatsapp,
    }
  }

  let html = content
  for (const [key, val] of Object.entries(replacements)) {
    html = html.split(key).join(val)
  }

  // Resolve [whatsapp_button]
  html = html.replace(/\[whatsapp_button(?:\s+([^\]]+))?\]/gi, (_match, paramsStr) => {
    let phone = adminWhatsapp
    let text = 'Halo Admin, saya ingin konsultasi pendaftaran kelas.'
    let label = 'Konsultasi Pendaftaran via WhatsApp'

    if (paramsStr) {
      const phoneMatch = paramsStr.match(/phone=["']?([^"'\s]+)["']?/i)
      const textMatch = paramsStr.match(/text=["']?([^"']+)["']?/i)
      const labelMatch = paramsStr.match(/label=["']?([^"']+)["']?/i)
      if (phoneMatch) phone = phoneMatch[1]
      if (textMatch) text = textMatch[1]
      if (labelMatch) label = labelMatch[1]
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    return `<div class="text-center my-8"><a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition shadow-lg">${label} &rarr;</a></div>`
  })

  // Resolve [stats_overview]
  html = html.split('[stats_overview]').join(
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center my-8"><div class="p-6 rounded-2xl bg-white/5 border border-white/10"><div class="text-3xl font-extrabold text-emerald-400">1,250+</div><div class="text-xs text-slate-400 mt-1 font-medium">Santri & Siswa</div></div><div class="p-6 rounded-2xl bg-white/5 border border-white/10"><div class="text-3xl font-extrabold text-teal-300">24+</div><div class="text-xs text-slate-400 mt-1 font-medium">Kitab & Materi</div></div><div class="p-6 rounded-2xl bg-white/5 border border-white/10"><div class="text-3xl font-extrabold text-cyan-400">890+</div><div class="text-xs text-slate-400 mt-1 font-medium">Sertifikat Resmi</div></div><div class="p-6 rounded-2xl bg-white/5 border border-white/10"><div class="text-3xl font-extrabold text-amber-400">99.8%</div><div class="text-xs text-slate-400 mt-1 font-medium">Kepuasan Belajar</div></div></div>'
  )

  // Resolve [portal_classes]
  html = html.split('[portal_classes]').join(
    '<div class="text-center my-6"><a href="/courses" class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-xl transition">Buka Seluruh Katalog Program Kelas &rarr;</a></div>'
  )

  // Auto-wrap in HTML5 shell with Tailwind if needed
  if (!/<!DOCTYPE\s+html/i.test(html) && !/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-[#0A0A0C] text-white antialiased min-h-screen">
    ${html}
</body>
</html>`
  }

  return html
}
