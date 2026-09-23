<script setup>
import { computed } from 'vue';

const props = defineProps({
    variant: {
        type: String,
        default: 'info', // success, error, warning, info
    },
    title: {
        type: String,
        default: null,
    },
    dismissible: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['dismiss']);

const classes = computed(() => {
    switch (props.variant) {
        case 'success':
            return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200';
        case 'error':
        case 'danger':
            return 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200';
        case 'warning':
            return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200';
        case 'info':
        default:
            return 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200';
    }
});
</script>

<template>
    <div :class="['rounded-xl border p-4 text-sm flex items-start gap-3 shadow-sm', classes]">
        <div class="flex-1">
            <h4 v-if="title" class="font-semibold mb-1">
                {{ title }}
            </h4>
            <div>
                <slot />
            </div>
        </div>
        <button
            v-if="dismissible"
            type="button"
            @click="$emit('dismiss')"
            class="rounded-lg p-1 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
</template>
