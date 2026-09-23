<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import { useToast } from '~/composables/useToast';
import {
    MessageSquare,
    Save,
    RotateCcw,
    CheckCircle2,
    Clock,
    UserCheck,
    Tag,
    Eye,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const supabase = useSupabaseClient();
const toast = useToast();

const saving = ref(false);
const activeTab = ref('unpaid');

const defaults = {
    wa_template_unpaid_invoice: `Halo {nama}! 👋\nTerima kasih telah memesan kursus *{nama_kursus}* di MIO Learning Academy.\n\nNomor Pesanan: #{no_invoice}\nTotal Tagihan: {total_bayar}\n\nSilakan selesaikan pembayaran dan konfirmasi melalui link berikut:\n{link_invoice}\n\nTerima kasih!`,
    wa_template_new_user: `Halo {nama}! 🎉\nSelamat datang di platform belajar MIO Learning Academy.\n\nBerikut informasi akun Anda:\nEmail: {email}\nKata Sandi: {password}\n\nSilakan login ke platform kami melalui link:\n{link_login}\n\nSelamat belajar!`,
    wa_template_order_approved: `Halo {nama}! ✅\nPembayaran Anda untuk pesanan #{no_invoice} telah *DISETUJUI*!\n\nAkses kursus *{nama_kursus}* Anda sudah aktif. Anda dapat langsung mulai belajar di:\n{link_kursus}\n\nSemoga ilmunya bermanfaat!`,
};

const templates = ref({ ...defaults });

const unpaidTags = [
    { tag: '{nama}', desc: 'Nama Lengkap Pembeli' },
    { tag: '{email}', desc: 'Email Pembeli' },
    { tag: '{no_invoice}', desc: 'Nomor Invoice' },
    { tag: '{nama_kursus}', desc: 'Judul Kursus' },
    { tag: '{total_bayar}', desc: 'Nominal Transfer' },
    { tag: '{link_invoice}', desc: 'Link Halaman Invoice' },
];

const newUserTags = [
    { tag: '{nama}', desc: 'Nama Lengkap Pengguna' },
    { tag: '{email}', desc: 'Email / Username Akun' },
    { tag: '{password}', desc: 'Kata Sandi Akun' },
    { tag: '{link_login}', desc: 'Link Halaman Login' },
];

const approvedTags = [
    { tag: '{nama}', desc: 'Nama Lengkap Pembeli' },
    { tag: '{email}', desc: 'Email Akun' },
    { tag: '{no_invoice}', desc: 'Nomor Invoice' },
    { tag: '{nama_kursus}', desc: 'Judul Kursus' },
    { tag: '{link_kursus}', desc: 'Link Ruang Belajar Kursus' },
];

const insertTag = (fieldName: keyof typeof templates.value, tag: string) => {
    templates.value[fieldName] = (templates.value[fieldName] || '') + ' ' + tag;
};

const resetToDefault = (fieldName: keyof typeof templates.value) => {
    templates.value[fieldName] = defaults[fieldName];
    toast.info('Template dikembalikan ke teks standar default.');
};

const loadTemplates = async () => {
    try {
        const { data } = await supabase.from('whatsapp_templates').select('*');
        if (data && data.length > 0) {
            data.forEach((item: any) => {
                if (item.template_key in templates.value) {
                    (templates.value as any)[item.template_key] = item.content;
                }
            });
        }
    } catch (err) {
        console.error('Failed to load templates:', err);
    }
};

const saveTemplates = async () => {
    saving.value = true;
    try {
        for (const [key, content] of Object.entries(templates.value)) {
            await supabase
                .from('whatsapp_templates')
                .upsert({
                    template_key: key,
                    content: content,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'template_key' });
        }
        toast.success('Template pesan WhatsApp berhasil disimpan!');
    } catch (err: any) {
        toast.error(err.message || 'Gagal menyimpan template');
    } finally {
        saving.value = false;
    }
};

const previewUnpaid = computed(() => {
    let text = templates.value.wa_template_unpaid_invoice || '';
    text = text.replace(/{nama}/g, 'Budi Santoso');
    text = text.replace(/{email}/g, 'budi@example.com');
    text = text.replace(/{no_invoice}/g, 'INV-20260923-8891');
    text = text.replace(/{nama_kursus}/g, 'Mastering Nuxt 3 & Supabase Full-Stack');
    text = text.replace(/{total_bayar}/g, 'Rp 199.000');
    text = text.replace(/{link_invoice}/g, 'http://localhost:3000/orders/INV-20260923-8891');
    return text;
});

const previewNewUser = computed(() => {
    let text = templates.value.wa_template_new_user || '';
    text = text.replace(/{nama}/g, 'Budi Santoso');
    text = text.replace(/{email}/g, 'budi@example.com');
    text = text.replace(/{password}/g, 'secret12345');
    text = text.replace(/{link_login}/g, 'http://localhost:3000/login');
    return text;
});

const previewApproved = computed(() => {
    let text = templates.value.wa_template_order_approved || '';
    text = text.replace(/{nama}/g, 'Budi Santoso');
    text = text.replace(/{email}/g, 'budi@example.com');
    text = text.replace(/{no_invoice}/g, 'INV-20260923-8891');
    text = text.replace(/{nama_kursus}/g, 'Mastering Nuxt 3 & Supabase Full-Stack');
    text = text.replace(/{link_kursus}/g, 'http://localhost:3000/learning/mastering-nuxt');
    return text;
});

onMounted(() => {
    loadTemplates();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                    <MessageSquare class="h-6 w-6" />
                </div>
                <div>
                    <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                        Template Pesan WhatsApp
                    </h1>
                    <p class="text-xs text-slate-500">Kustomisasi format pesan WhatsApp otomatis untuk penagihan invoice, pendaftaran, dan aktivasi kelas.</p>
                </div>
            </div>

            <Button variant="primary" size="md" :loading="saving" @click="saveTemplates" class="bg-teal-600 hover:bg-teal-700">
                <Save class="mr-1.5 h-4 w-4" />
                <span>Simpan Template</span>
            </Button>
        </div>

        <div class="space-y-6">
            <!-- Tabs -->
            <div class="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
                <button
                    type="button"
                    @click="activeTab = 'unpaid'"
                    :class="[
                        'pb-3 border-b-2 transition flex items-center gap-1.5',
                        activeTab === 'unpaid' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'
                    ]"
                >
                    <Clock class="h-4 w-4" />
                    <span>1. Tagihan Belum Dibayar</span>
                </button>

                <button
                    type="button"
                    @click="activeTab = 'new_user'"
                    :class="[
                        'pb-3 border-b-2 transition flex items-center gap-1.5',
                        activeTab === 'new_user' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'
                    ]"
                >
                    <UserCheck class="h-4 w-4" />
                    <span>2. Akun Siswa Baru</span>
                </button>

                <button
                    type="button"
                    @click="activeTab = 'approved'"
                    :class="[
                        'pb-3 border-b-2 transition flex items-center gap-1.5',
                        activeTab === 'approved' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'
                    ]"
                >
                    <CheckCircle2 class="h-4 w-4" />
                    <span>3. Konfirmasi Lunas & Akses Kelas</span>
                </button>
            </div>

            <!-- Tab 1: Unpaid -->
            <div v-if="activeTab === 'unpaid'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="p-6 rounded-3xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Editor Template</label>
                        <button type="button" @click="resetToDefault('wa_template_unpaid_invoice')" class="text-xs text-rose-500 hover:underline flex items-center gap-1">
                            <RotateCcw class="h-3 w-3" />
                            <span>Reset Default</span>
                        </button>
                    </div>

                    <textarea
                        v-model="templates.wa_template_unpaid_invoice"
                        rows="9"
                        class="w-full text-xs font-mono p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    ></textarea>

                    <div>
                        <span class="text-[11px] font-bold text-slate-400 block mb-1.5">Variabel Tag Tersedia (Klik untuk Menambahkan):</span>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                v-for="t in unpaidTags"
                                :key="t.tag"
                                type="button"
                                @click="insertTag('wa_template_unpaid_invoice', t.tag)"
                                class="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-mono hover:bg-teal-100"
                            >
                                {{ t.tag }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview -->
                <div class="p-6 rounded-3xl bg-slate-900 text-white space-y-3 shadow-xl">
                    <span class="text-xs font-bold uppercase text-teal-400 flex items-center gap-1">
                        <Eye class="h-3.5 w-3.5" />
                        <span>Live Preview WhatsApp</span>
                    </span>
                    <div class="p-4 rounded-2xl bg-slate-800/80 font-sans text-xs whitespace-pre-wrap leading-relaxed border border-slate-700">
                        {{ previewUnpaid }}
                    </div>
                </div>
            </div>

            <!-- Tab 2: New User -->
            <div v-if="activeTab === 'new_user'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="p-6 rounded-3xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Editor Template</label>
                        <button type="button" @click="resetToDefault('wa_template_new_user')" class="text-xs text-rose-500 hover:underline flex items-center gap-1">
                            <RotateCcw class="h-3 w-3" />
                            <span>Reset Default</span>
                        </button>
                    </div>

                    <textarea
                        v-model="templates.wa_template_new_user"
                        rows="9"
                        class="w-full text-xs font-mono p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    ></textarea>

                    <div>
                        <span class="text-[11px] font-bold text-slate-400 block mb-1.5">Variabel Tag Tersedia:</span>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                v-for="t in newUserTags"
                                :key="t.tag"
                                type="button"
                                @click="insertTag('wa_template_new_user', t.tag)"
                                class="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-mono hover:bg-teal-100"
                            >
                                {{ t.tag }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview -->
                <div class="p-6 rounded-3xl bg-slate-900 text-white space-y-3 shadow-xl">
                    <span class="text-xs font-bold uppercase text-teal-400 flex items-center gap-1">
                        <Eye class="h-3.5 w-3.5" />
                        <span>Live Preview WhatsApp</span>
                    </span>
                    <div class="p-4 rounded-2xl bg-slate-800/80 font-sans text-xs whitespace-pre-wrap leading-relaxed border border-slate-700">
                        {{ previewNewUser }}
                    </div>
                </div>
            </div>

            <!-- Tab 3: Approved -->
            <div v-if="activeTab === 'approved'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="p-6 rounded-3xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Editor Template</label>
                        <button type="button" @click="resetToDefault('wa_template_order_approved')" class="text-xs text-rose-500 hover:underline flex items-center gap-1">
                            <RotateCcw class="h-3 w-3" />
                            <span>Reset Default</span>
                        </button>
                    </div>

                    <textarea
                        v-model="templates.wa_template_order_approved"
                        rows="9"
                        class="w-full text-xs font-mono p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    ></textarea>

                    <div>
                        <span class="text-[11px] font-bold text-slate-400 block mb-1.5">Variabel Tag Tersedia:</span>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                v-for="t in approvedTags"
                                :key="t.tag"
                                type="button"
                                @click="insertTag('wa_template_order_approved', t.tag)"
                                class="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-mono hover:bg-teal-100"
                            >
                                {{ t.tag }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview -->
                <div class="p-6 rounded-3xl bg-slate-900 text-white space-y-3 shadow-xl">
                    <span class="text-xs font-bold uppercase text-teal-400 flex items-center gap-1">
                        <Eye class="h-3.5 w-3.5" />
                        <span>Live Preview WhatsApp</span>
                    </span>
                    <div class="p-4 rounded-2xl bg-slate-800/80 font-sans text-xs whitespace-pre-wrap leading-relaxed border border-slate-700">
                        {{ previewApproved }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
