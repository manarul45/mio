<script setup lang="ts">
import { ref } from 'vue';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-vue-next';

const supabase = useSupabaseClient();
const email = ref('');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const handleForgotPassword = async () => {
    if (!email.value) {
        errorMessage.value = 'Harap masukkan alamat email Anda.';
        return;
    }

    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
            redirectTo: redirectUrl,
        });

        if (error) throw error;

        successMessage.value = `Tautan pemulihan kata sandi telah dikirimkan ke ${email.value}. Silakan periksa kotak masuk atau folder spam email Anda.`;
    } catch (err: any) {
        errorMessage.value = err.message || 'Gagal mengirimkan tautan reset password.';
    } finally {
        loading.value = false;
    }
};

useHead({
    title: 'Lupa Kata Sandi — MIO Learning Academy',
});
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div class="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <div class="text-center">
                <NuxtLink to="/login" class="inline-flex items-center gap-2 mb-4 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition">
                    <ArrowLeft class="w-4 h-4" />
                    <span>Kembali ke Halaman Masuk</span>
                </NuxtLink>
                <img
                    src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
                    alt="MIO Logo"
                    class="h-14 w-14 mx-auto object-contain rounded-2xl mb-2"
                />
                <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
                    Lupa Kata Sandi?
                </h2>
                <p class="mt-2 text-xs sm:text-sm text-slate-500">
                    Masukkan email akun Anda. Kami akan mengirimkan tautan untuk menyetel ulang kata sandi Anda.
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

            <form v-if="!successMessage" class="mt-6 space-y-4" @submit.prevent="handleForgotPassword">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Email Akun *</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Mail class="w-4 h-4" />
                        </div>
                        <input
                            v-model="email"
                            type="email"
                            required
                            placeholder="nama@email.com"
                            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                >
                    <Mail v-if="!loading" class="w-4 h-4" />
                    <span>{{ loading ? 'Mengirimkan Tautan...' : 'Kirim Tautan Reset Password' }}</span>
                </button>
            </form>
        </div>
    </div>
</template>
