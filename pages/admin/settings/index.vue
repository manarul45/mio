<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Input from '~/components/UI/Input.vue';
import Textarea from '~/components/UI/Textarea.vue';
import { useSwal } from '~/composables/useSwal';
import {
    Cloud,
    Database,
    Zap,
    PhoneCall,
    Eye,
    EyeOff,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
    middleware: ['admin'],
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const isSaving = ref(false);
const showSecretKey = ref(false);
const showCloudinarySecretKey = ref(false);

const form = ref({
    admin_whatsapp_number: '6281234567890',
    bank_transfer_instructions: 'Bank Central Asia (BCA)\nNo. Rekening: 1234-5678-90\nAtas Nama: MIO Learning Academy',
    cloudflare_r2_enabled: false,
    cloudflare_account_id: '',
    cloudflare_r2_access_key_id: '',
    cloudflare_r2_secret_access_key: '',
    cloudflare_r2_bucket: '',
    cloudflare_r2_public_domain: '',
    cloudinary_enabled: false,
    cloudinary_cloud_name: '',
    cloudinary_api_key: '',
    cloudinary_api_secret: '',
    cloudinary_upload_preset: '',
});

const loadSettings = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;
        if (data && data.length > 0) {
            data.forEach((item: any) => {
                const k = item.key as keyof typeof form.value;
                if (k in form.value) {
                    if (typeof form.value[k] === 'boolean') {
                        (form.value as any)[k] = item.value === 'true' || item.value === '1';
                    } else {
                        (form.value as any)[k] = item.value || '';
                    }
                }
            });
        }
    } catch (err: any) {
        console.error('Failed to load settings:', err);
    } finally {
        loading.value = false;
    }
};

const submit = async () => {
    isSaving.value = true;
    try {
        const entries = Object.entries(form.value);
        for (const [key, value] of entries) {
            await supabase
                .from('settings')
                .upsert({
                    key,
                    value: String(value),
                    type: typeof value === 'boolean' ? 'boolean' : 'string',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'key' });
        }
        swal.fireSuccess('Tersimpan!', 'Pengaturan global sistem berhasil diperbarui.');
    } catch (err: any) {
        swal.fireError('Gagal Menyimpan', err.message || 'Terjadi kesalahan.');
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    loadSettings();
});
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-8 pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Pengaturan Global Sistem
                </h1>
                <p class="text-xs text-slate-500">Konfigurasi Cloudflare CDN & R2, Cloudinary, WhatsApp admin, dan rekening transfer bank.</p>
            </div>

            <div class="flex items-center gap-3">
                <NuxtLink
                    to="/admin/database"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-bold dark:bg-purple-950 dark:border-purple-900 dark:text-purple-300 transition"
                >
                    <Database class="h-4 w-4 text-purple-600" />
                    <span>Database & Backup</span>
                </NuxtLink>
            </div>
        </div>

        <form @submit.prevent="submit" class="space-y-8">
            <!-- Cloudflare CDN & R2 Storage Settings -->
            <div class="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white p-8 shadow-sm dark:border-amber-900/40 dark:from-slate-900 dark:to-slate-900 space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-100 dark:border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                            <Cloud class="h-5 w-5" />
                        </div>
                        <div>
                            <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Cloudflare CDN & Object Storage (R2)</span>
                                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                    Global CDN
                                </span>
                            </h2>
                            <p class="text-xs text-slate-500">Arahkan semua file upload (thumbnail kursus, avatar, audio kuis, sertifikat) ke Cloudflare R2 CDN.</p>
                        </div>
                    </div>

                    <!-- Enable Cloudflare Toggle -->
                    <label class="flex items-center gap-3 cursor-pointer self-start sm:self-auto bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <input
                            type="checkbox"
                            v-model="form.cloudflare_r2_enabled"
                            class="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {{ form.cloudflare_r2_enabled ? '🟢 CDN Aktif' : '⚪ CDN Nonaktif (Supabase Storage)' }}
                        </span>
                    </label>
                </div>

                <!-- Info Alert -->
                <div class="p-4 rounded-2xl bg-amber-100/60 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <Zap class="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div class="space-y-1">
                        <p class="font-bold">Keuntungan Menggunakan Cloudflare R2 & CDN:</p>
                        <p class="text-[11px] leading-relaxed opacity-90">
                            Biaya egress $0 (bebas biaya kuota unduh), latensi global ultra-cepat, dan keamanan edge caching Cloudflare.
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                        v-model="form.cloudflare_account_id"
                        label="Cloudflare Account ID"
                        placeholder="Contoh: a1b2c3d4e5f6g7h8..."
                    />

                    <Input
                        v-model="form.cloudflare_r2_bucket"
                        label="R2 Bucket Name"
                        placeholder="Contoh: appmio-assets"
                    />

                    <Input
                        v-model="form.cloudflare_r2_access_key_id"
                        label="R2 Access Key ID"
                        placeholder="Contoh: 1a2b3c4d5e6f..."
                    />

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                            R2 Secret Access Key
                        </label>
                        <div class="relative">
                            <input
                                :type="showSecretKey ? 'text' : 'password'"
                                v-model="form.cloudflare_r2_secret_access_key"
                                placeholder="Masukkan Secret Access Key R2..."
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 focus:ring-indigo-500 dark:text-white pr-10"
                            />
                            <button
                                type="button"
                                @click="showSecretKey = !showSecretKey"
                                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <Eye v-if="!showSecretKey" class="h-4 w-4" />
                                <EyeOff v-else class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div class="sm:col-span-2">
                        <Input
                            v-model="form.cloudflare_r2_public_domain"
                            label="Public CDN / Custom Domain URL (Opsional)"
                            placeholder="Contoh: https://pub-xxxxxxxx.r2.dev atau https://cdn.appmio.com"
                        />
                    </div>
                </div>
            </div>

            <!-- Cloudinary Media CDN Settings -->
            <div class="rounded-3xl border border-sky-200/80 bg-gradient-to-b from-sky-50/40 to-white p-8 shadow-sm dark:border-sky-900/40 dark:from-slate-900 dark:to-slate-900 space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-100 dark:border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                            <Cloud class="h-5 w-5" />
                        </div>
                        <div>
                            <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Cloudinary Media Management & CDN</span>
                                <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                    Media CDN
                                </span>
                            </h2>
                            <p class="text-xs text-slate-500">Kelola dan optimasikan gambar, thumbnail, & asset media dengan kompresi AI otomatis Cloudinary.</p>
                        </div>
                    </div>

                    <label class="flex items-center gap-3 cursor-pointer self-start sm:self-auto bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <input
                            type="checkbox"
                            v-model="form.cloudinary_enabled"
                            class="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {{ form.cloudinary_enabled ? '🟢 Cloudinary Aktif' : '⚪ Cloudinary Nonaktif' }}
                        </span>
                    </label>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                        v-model="form.cloudinary_cloud_name"
                        label="Cloudinary Cloud Name"
                        placeholder="Contoh: dxy123abc"
                    />

                    <Input
                        v-model="form.cloudinary_api_key"
                        label="Cloudinary API Key"
                        placeholder="Contoh: 123456789012345"
                    />

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Cloudinary API Secret
                        </label>
                        <div class="relative">
                            <input
                                :type="showCloudinarySecretKey ? 'text' : 'password'"
                                v-model="form.cloudinary_api_secret"
                                placeholder="Masukkan API Secret Cloudinary..."
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 focus:ring-indigo-500 dark:text-white pr-10"
                            />
                            <button
                                type="button"
                                @click="showCloudinarySecretKey = !showCloudinarySecretKey"
                                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <Eye v-if="!showCloudinarySecretKey" class="h-4 w-4" />
                                <EyeOff v-else class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <Input
                        v-model="form.cloudinary_upload_preset"
                        label="Upload Preset (Opsional)"
                        placeholder="Contoh: appmio_preset"
                    />
                </div>
            </div>

            <!-- WhatsApp & Manual Transfer Settings -->
            <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <PhoneCall class="h-5 w-5 text-emerald-600" />
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Pengaturan Pembelian via WhatsApp & Rekening Transfer</h2>
                </div>

                <div class="space-y-5">
                    <Input
                        v-model="form.admin_whatsapp_number"
                        label="Nomor WhatsApp Admin / CS (Format 62xxx tanpa + atau spasi)"
                        placeholder="6281234567890"
                        required
                    />
                    <p class="text-[11px] text-slate-400 -mt-3">
                        Nomor ini akan digunakan sebagai tujuan pesan otomatis saat pembeli klik konfirmasi pembayaran via WhatsApp pada halaman invoice.
                    </p>

                    <Textarea
                        v-model="form.bank_transfer_instructions"
                        label="Instruksi Pembayaran & Rekening Bank Admin"
                        placeholder="Bank Central Asia (BCA)&#10;No. Rekening: 1234-5678-90&#10;Atas Nama: MIO Learning Academy"
                        rows="3"
                        required
                    />
                    <p class="text-[11px] text-slate-400 -mt-3">
                        Teks ini akan ditampilkan kepada pembeli pada halaman checkout dan invoice sebagai tujuan transfer dana manual.
                    </p>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="flex justify-end">
                <Button type="submit" :loading="isSaving" variant="primary" size="lg" class="bg-indigo-600 hover:bg-indigo-700">
                    Simpan Semua Pengaturan
                </Button>
            </div>
        </form>
    </div>
</template>
