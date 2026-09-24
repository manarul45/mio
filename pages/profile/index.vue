<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Input from '~/components/UI/Input.vue';
import Textarea from '~/components/UI/Textarea.vue';
import { useToast } from '~/composables/useToast';
import { useSwal } from '~/composables/useSwal';
import {
    User,
    Mail,
    Phone,
    Lock,
    Key,
    AlertTriangle,
    Shield,
    Camera,
    Save,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user, profile, fetchProfile, logout } = useAuthProfile();
const supabase = useSupabaseClient();
const toast = useToast();
const swal = useSwal();

const isSavingProfile = ref(false);
const isChangingPassword = ref(false);

const profileForm = ref({
    name: '',
    email: '',
    whatsapp_number: '',
    headline: '',
    bio: '',
    avatar_url: '',
});

const passwordForm = ref({
    newPassword: '',
    confirmPassword: '',
});

onMounted(() => {
    if (user.value) {
        profileForm.value = {
            name: profile.value?.name || user.value.user_metadata?.name || '',
            email: user.value.email || '',
            whatsapp_number: profile.value?.whatsapp_number || '',
            headline: profile.value?.headline || '',
            bio: profile.value?.bio || '',
            avatar_url: profile.value?.avatar_url || '',
        };
    }
});

const saveProfile = async () => {
    if (!profileForm.value.name.trim()) {
        toast.warning('Nama lengkap wajib diisi.');
        return;
    }

    isSavingProfile.value = true;
    try {
        if (!user.value) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                name: profileForm.value.name.trim(),
                whatsapp_number: profileForm.value.whatsapp_number.trim() || null,
                headline: profileForm.value.headline.trim() || null,
                bio: profileForm.value.bio.trim() || null,
                avatar_url: profileForm.value.avatar_url.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.value.id);

        if (error) throw error;

        await fetchProfile();
        swal.toastSuccess('Profil Anda berhasil diperbarui!');
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal memperbarui profil.');
    } finally {
        isSavingProfile.value = false;
    }
};

const changePassword = async () => {
    if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) {
        toast.warning('Kata sandi baru minimal 6 karakter.');
        return;
    }
    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        toast.warning('Konfirmasi kata sandi tidak cocok.');
        return;
    }

    isChangingPassword.value = true;
    try {
        const { error } = await supabase.auth.updateUser({
            password: passwordForm.value.newPassword,
        });

        if (error) throw error;

        swal.fireSuccess('Kata Sandi Berhasil Diperbarui!', 'Gunakan kata sandi baru Anda saat login berikutnya.');
        passwordForm.value = { newPassword: '', confirmPassword: '' };
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal mengubah kata sandi.');
    } finally {
        isChangingPassword.value = false;
    }
};

const deleteAccount = async () => {
    const isConfirmed = await swal.confirmDialog({
        title: 'Hapus Akun Anda?',
        text: 'Tindakan ini tidak dapat dibatalkan. Seluruh data riwayat belajar, transaksi, dan sertifikat Anda akan dihapus secara permanen.',
        confirmButtonText: 'Ya, Hapus Akun Saya',
        confirmButtonColor: '#ef4444',
    });

    if (!isConfirmed) return;

    try {
        if (user.value) {
            await supabase.from('profiles').delete().eq('id', user.value.id);
        }
        await logout();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menghapus akun.');
    }
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-8 pb-16">
        <!-- Header -->
        <div class="border-b border-slate-200 pb-5 dark:border-slate-800">
            <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
                Pengaturan Profil & Akun
            </h1>
            <p class="mt-1 text-xs sm:text-sm text-slate-500">
                Kelola informasi pribadi, nomor kontak WhatsApp, serta keamanan kata sandi Anda.
            </p>
        </div>

        <!-- Section 1: Profil Pribadi -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <User class="h-5 w-5" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Informasi Pribadi</h3>
                    <p class="text-xs text-slate-500">Perbarui identitas profil yang ditampilkan di platform.</p>
                </div>
            </div>

            <form @submit.prevent="saveProfile" class="space-y-4">
                <div class="flex items-center gap-5">
                    <div class="relative">
                        <div class="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xl text-slate-600 dark:text-slate-300">
                            <img
                                v-if="profileForm.avatar_url"
                                :src="profileForm.avatar_url"
                                alt="Avatar"
                                class="h-full w-full object-cover"
                            />
                            <span v-else>{{ profileForm.name ? profileForm.name[0].toUpperCase() : 'U' }}</span>
                        </div>
                    </div>

                    <div class="flex-1 space-y-1">
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">URL Foto Profil / Avatar</label>
                        <input
                            v-model="profileForm.avatar_url"
                            type="text"
                            placeholder="https://... atau biarkan kosong untuk inisial nama"
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="profileForm.name"
                        label="Nama Lengkap *"
                        required
                    />

                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Alamat Email (Akun)
                        </label>
                        <input
                            :value="profileForm.email"
                            disabled
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
                        />
                        <p class="text-[11px] text-slate-400 mt-1">Email login terikat dengan akun Supabase Auth.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="profileForm.whatsapp_number"
                        label="Nomor WhatsApp"
                        placeholder="08123456789 atau 628123456789"
                    />

                    <Input
                        v-model="profileForm.headline"
                        label="Headline / Profesi Singkat"
                        placeholder="Contoh: Mahasiswa Teknik / Praktisi Fiqih"
                    />
                </div>

                <Textarea
                    v-model="profileForm.bio"
                    label="Bio / Tentang Anda"
                    placeholder="Tuliskan pengalaman atau latar belakang Anda secara singkat..."
                    rows="3"
                />

                <div class="pt-3 flex justify-end">
                    <Button variant="primary" size="md" type="submit" :disabled="isSavingProfile">
                        <Save class="mr-1.5 h-4 w-4" />
                        <span>{{ isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil' }}</span>
                    </Button>
                </div>
            </form>
        </div>

        <!-- Section 2: Ganti Password -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <Lock class="h-5 w-5" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Keamanan & Ganti Kata Sandi</h3>
                    <p class="text-xs text-slate-500">Perbarui kata sandi akun Anda secara berkala demi keamanan.</p>
                </div>
            </div>

            <form @submit.prevent="changePassword" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="passwordForm.newPassword"
                        type="password"
                        label="Kata Sandi Baru *"
                        placeholder="Minimal 6 karakter"
                        required
                    />

                    <Input
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        label="Konfirmasi Kata Sandi Baru *"
                        placeholder="Ulangi kata sandi baru"
                        required
                    />
                </div>

                <div class="pt-3 flex justify-end">
                    <Button variant="primary" size="md" type="submit" :disabled="isChangingPassword">
                        <Key class="mr-1.5 h-4 w-4" />
                        <span>{{ isChangingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi' }}</span>
                    </Button>
                </div>
            </form>
        </div>

        <!-- Section 3: Zona Berbahaya (Hapus Akun) -->
        <div class="rounded-3xl border border-rose-200 bg-rose-50/30 p-6 sm:p-8 dark:border-rose-950 dark:bg-rose-950/20 space-y-4">
            <div class="flex items-center gap-3">
                <AlertTriangle class="h-5 w-5 text-rose-600" />
                <h3 class="text-base font-bold text-rose-900 dark:text-rose-300">Zona Berbahaya</h3>
            </div>
            <p class="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                Setelah akun Anda dihapus, semua data akses kursus, progres pembelajaran, kuis kelulusan, dan sertifikat yang Anda miliki akan terhapus secara permanen.
            </p>
            <div class="pt-2">
                <Button variant="danger" size="sm" @click="deleteAccount">
                    Hapus Akun Saya Secara Permanen
                </Button>
            </div>
        </div>
    </div>
</template>
