<script setup>
import { computed } from 'vue';

const props = defineProps({
    variant: {
        type: String,
        default: 'gray', // gray, primary, success, warning, danger, purple
    },
    size: {
        type: String,
        default: 'md', // sm, md
    },
});

const classes = computed(() => {
    const sizeCls = props.size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';
    
    switch (props.variant) {
        case 'primary':
            return `${sizeCls} bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800`;
        case 'success':
            return `${sizeCls} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800`;
        case 'warning':
            return `${sizeCls} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800`;
        case 'danger':
            return `${sizeCls} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800`;
        case 'purple':
            return `${sizeCls} bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800`;
        case 'gray':
        default:
            return `${sizeCls} bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700`;
    }
});
</script>

<template>
    <span :class="['inline-flex items-center gap-1 rounded-full font-medium', classes]">
        <slot />
    </span>
</template>
