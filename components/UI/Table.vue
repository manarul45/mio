<script setup>
defineProps({
    headers: {
        type: Array,
        default: () => [], // Array of string or { key, label, align }
    },
    loading: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="relative overflow-x-auto">
            <!-- Loading overlay -->
            <div
                v-if="loading"
                class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px] dark:bg-slate-900/70"
            >
                <svg class="h-6 w-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>

            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead class="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                        <slot name="headers">
                            <th
                                v-for="(h, idx) in headers"
                                :key="idx"
                                scope="col"
                                :class="[
                                    'px-6 py-3.5',
                                    typeof h === 'object' && h.align === 'right' ? 'text-right' : '',
                                    typeof h === 'object' && h.align === 'center' ? 'text-center' : '',
                                ]"
                            >
                                {{ typeof h === 'object' ? h.label : h }}
                            </th>
                        </slot>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <slot />
                </tbody>
            </table>
        </div>
    </div>
</template>
