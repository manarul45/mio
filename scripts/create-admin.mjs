/**
 * MIO ACADEMY - SCRIPT PEMBUATAN AKUN ADMIN SUPABASE
 *
 * Cara Penggunaan:
 * node scripts/create-admin.mjs <email> <password> [nama]
 *
 * Contoh:
 * node scripts/create-admin.mjs admin@mioacademy.com Password123! "Administrator MIO"
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes('placeholder')) {
  console.error('\n❌ ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env')
  console.error('Silakan isi kredensial Supabase Anda di file .env terlebih dahulu.\n')
  process.exit(1)
}

const args = process.argv.slice(2)
const email = args[0] || 'admin@mioacademy.com'
const password = args[1] || 'Admin123456!'
const name = args[2] || 'Admin MIO Academy'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdmin() {
  console.log('====================================================')
  console.log('🛡️  PEMBUATAN AKUN ADMIN MIO LEARNING ACADEMY')
  console.log('====================================================')
  console.log(`Email   : ${email}`)
  console.log(`Password: ${password}`)
  console.log(`Nama    : ${name}`)
  console.log(`Target  : ${supabaseUrl}\n`)

  try {
    // 1. Cek apakah user sudah terdaftar di Supabase Auth
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr

    const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let userId

    if (existing) {
      console.log(`ℹ️  User dengan email ${email} sudah ada di Supabase Auth.`)
      userId = existing.id

      // Update password & metadata
      await supabase.auth.admin.updateUserById(userId, {
        password: password,
        user_metadata: { name, role: 'ADMIN' },
        email_confirm: true
      })
      console.log(`✅ Password dan metadata user telah diperbarui.`)
    } else {
      // 2. Buat user baru di Supabase Auth
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name,
          role: 'ADMIN'
        }
      })

      if (createErr) throw createErr
      userId = newUser.user.id
      console.log(`✅ Berhasil membuat akun di Supabase Auth (UID: ${userId}).`)
    }

    // 3. Upsert ke public.profiles dengan role ADMIN
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: name,
        email: email,
        role: 'ADMIN'
      })

    if (profileErr) {
      console.warn(`⚠️ Catatan profil: ${profileErr.message}`)
    } else {
      console.log(`✅ Role akun di tabel public.profiles telah diatur ke: ADMIN.`)
    }

    console.log('\n====================================================')
    console.log('🎉 AKUN ADMIN SIAP DIGUNAKAN!')
    console.log(`Silakan login di halaman: http://localhost:3000/login`)
    console.log(`Email   : ${email}`)
    console.log(`Password: ${password}`)
    console.log('====================================================\n')
  } catch (err) {
    console.error(`\n❌ Gagal membuat akun admin:`, err.message || err)
    process.exit(1)
  }
}

createAdmin()
