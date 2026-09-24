export const DEFAULT_LANDING_PAGE_TEMPLATE = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{course_title}} — {{site_name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-[#0A0A0C] text-slate-100 antialiased min-h-screen">
    <div class="max-w-4xl mx-auto px-6 py-16">
        <div class="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-6 border border-indigo-500/30">
            {{category_name}}
        </div>
        
        <h1 class="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
            {{course_title}}
        </h1>
        
        <p class="text-lg text-slate-300 leading-relaxed mb-8">
            {{course_description}}
        </p>

        <div class="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <span class="text-xs text-slate-400 block font-medium">Investasi Belajar:</span>
                <span class="text-3xl font-extrabold text-emerald-400">{{course_price}}</span>
            </div>
            <a href="{{course_url}}" class="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition shadow-lg shadow-indigo-600/30">
                Daftar & Mulai Belajar Sekarang &rarr;
            </a>
        </div>

        [stats_overview]

        <div class="mt-12 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-5">
            <img src="{{instructor_avatar}}" alt="{{instructor_name}}" class="w-16 h-16 rounded-full object-cover border-2 border-indigo-500" />
            <div>
                <h4 class="text-base font-bold text-white">{{instructor_name}}</h4>
                <p class="text-sm text-slate-400 mt-0.5">{{instructor_bio}}</p>
            </div>
        </div>

        [whatsapp_button label="Tanya Admin via WhatsApp"]
    </div>
</body>
</html>`
