// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  experimental: {
    scanPageMeta: false
  },

  css: ['~/assets/css/main.css'],

  alias: {
    '@/Components': './components',
    '@/Layouts': './layouts',
    '@/Composables': './composables'
  },

  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss'
  ],

  supabase: {
    redirect: false, // Custom role-based middleware handled in pages/layouts
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || 'placeholder-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  },

  nitro: {
    preset: 'vercel'
  },

  app: {
    head: {
      title: 'MIO Learning Academy',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Manarul Ilmi Online Learning Academy' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap' }
      ]
    }
  }
})
