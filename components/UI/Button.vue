<script setup>
import { computed } from 'vue';

const props = defineProps({
    as: {
        type: String,
        default: 'button',
    },
    href: {
        type: String,
        default: null,
    },
    to: {
        type: String,
        default: null,
    },
    type: {
        type: String,
        default: 'button',
    },
    variant: {
        type: String,
        default: 'primary', // primary, secondary, danger, success, outline, ghost
    },
    size: {
        type: String,
        default: 'md', // sm, md, lg
    },
    loading: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const targetUrl = computed(() => props.to || props.href);

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5';
        case 'lg':
            return 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5';
        case 'md':
        default:
            return 'px-4 py-2 text-sm font-medium rounded-lg gap-2';
    }
});

const variantClasses = computed(() => {
    switch (props.variant) {
        case 'secondary':
            return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300/80 focus:ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700';
        case 'danger':
            return 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm shadow-rose-200';
        case 'success':
            return 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm shadow-emerald-200';
        case 'outline':
            return 'bg-transparent text-indigo-600 border border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-indigo-950/30';
        case 'ghost':
            return 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800';
        case 'primary':
        default:
            return 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm shadow-indigo-200 hover:shadow';
    }
});
</script>

<template>
    <NuxtLink
        v-if="(as === 'Link' || as === 'NuxtLink') && targetUrl && !disabled"
        :to="targetUrl"
        :class="[
            'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium select-none',
            sizeClasses,
            variantClasses,
            loading || disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        ]"
    >
        <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
            />
            <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
            />
        </svg>
        <slot />
    </NuxtLink>
    <a
        v-else-if="as === 'a' && targetUrl && !disabled"
        :href="targetUrl"
        :class="[
            'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium select-none',
            sizeClasses,
            variantClasses,
            loading || disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        ]"
    >
        <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
            />
            <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
            />
        </svg>
        <slot />
    </a>
    <button
        v-else
        :type="type"
        :disabled="disabled || loading"
        :class="[
            'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium select-none',
            sizeClasses,
            variantClasses,
            loading || disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ]"
    >
        <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
            />
            <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
            />
        </svg>
        <slot />
    </button>
</template>
