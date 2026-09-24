<script setup lang="ts">
import { ref } from 'vue';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-vue-next';

const supabase = useSupabaseClient();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const handleResetPassword = async () => {
    if (!password.value || password.value.length < 6) {
        errorMessage.value = 'Kata sandi minimal 6 karakter.';
        return;
    }
    if (password.value !== confirmPassword.value) {
        errorMessage.value = 'Konfirmasi kata sandi tidak cocok.';
        return;
    }

    loading.value = true;
    errorMessage.value = '';

    try {
        const { error } = await supabase.auth.updateUser({
            password: password.value,
        });

        if (error) throw error;

        successMessage.value = 'Kata sandi Anda berhasil diperbarui! Anda akan diarahkan ke dashboard dalam beberapa detik.';
        setTimeout(() => {
            router.push('/dashboard');
        }, 2000);
    } catch (err: any) {
        errorMessage.value = err.message || 'Gagal menyetel ulang kata sandi.';
    } finally {
        loading.value = false;
    }
};

useHead({
    title: 'Setel Ulang Kata Sandi — MIO Learning Academy',
});
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div class="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <div class="text-center">
                <img
                    src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
                    alt="MIO Logo"
                    class="h-14 w-14 mx-auto object-contain rounded-2xl mb-2"
                />
                <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
                    Setel Ulang Kata Sandi
                </h2>
                <p class="mt-2 text-xs sm:text-sm text-slate-500">
                    Masukkan kata sandi baru untuk akun Anda.
                </p>
            </div>

            <div v-if="successMessage" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-3 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                <CheckCircle2 class="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <span class="leading-relaxed">{{ successMessage }}</span>
            </div>

            <div v-if="errorMessage" class="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-3 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{{ errorMessage }}</span>
            </div>

            <form v-if="!successMessage" class="mt-6 space-y-4" @submit.prevent="handleResetPassword">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kata Sandi Baru *</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock class="w-4 h-4" />
                        </div>
                        <input
                            v-model="password"
                            type="password"
                            required
                            placeholder="Minimal 6 karakter"
                            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Konfirmasi Kata Sandi Baru *</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock class="w-4 h-4" />
                        </div>
                        <input
                            v-model="confirmPassword"
                            type="password"
                            required
                            placeholder="Ulangi kata sandi baru"
                            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                >
                    <Lock v-if="!loading" class="w-4 h-4" />
                    <span>{{ loading ? 'Memperbarui...' : 'Simpan Kata Sandi Baru' }}</span>
                </button>
            </form>
        </div>
    </div>
</template>
