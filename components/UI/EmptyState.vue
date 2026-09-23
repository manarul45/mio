<script setup>
import Button from './Button.vue';

defineProps({
    title: {
        type: String,
        default: 'Tidak Ada Data Ditemukan',
    },
    description: {
        type: String,
        default: 'Belum ada konten atau data yang tersedia pada bagian ini.',
    },
    actionText: {
        type: String,
        default: null,
    },
    actionHref: {
        type: String,
        default: null,
    },
});

defineEmits(['action']);
</script>

<template>
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-400">
            <slot name="icon">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            </slot>
        </div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            {{ title }}
        </h3>
        <p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {{ description }}
        </p>
        <div v-if="actionText" class="mt-6">
            <Button
                v-if="actionHref"
                as="Link"
                :href="actionHref"
                variant="primary"
                size="sm"
            >
                {{ actionText }}
            </Button>
            <Button
                v-else
                variant="primary"
                size="sm"
                @click="$emit('action')"
            >
                {{ actionText }}
            </Button>
        </div>
    </div>
</template>
