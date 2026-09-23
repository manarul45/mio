<script setup>
defineProps({
    text: {
        type: String,
        default: 'Memuat data...',
    },
    lines: {
        type: Number,
        default: 3,
    },
});
</script>

<template>
    <div class="flex flex-col items-center justify-center p-8 space-y-4">
        <svg class="h-8 w-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
            {{ text }}
        </p>
    </div>
</template>
