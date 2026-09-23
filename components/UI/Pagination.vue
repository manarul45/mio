<script setup>
defineProps({
    links: {
        type: Array,
        default: () => [],
    },
});

defineEmits(['change']);
</script>

<template>
    <div v-if="links && links.length > 3" class="flex flex-wrap items-center justify-center gap-1.5 py-4">
        <template v-for="(link, key) in links" :key="key">
            <div
                v-if="link.url === null"
                class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-200 dark:border-slate-800"
                v-html="link.label"
            />
            <NuxtLink
                v-else-if="typeof link.url === 'string' && link.url.startsWith('/')"
                :to="link.url"
                :class="[
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                    link.active
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800',
                ]"
                v-html="link.label"
            />
            <button
                v-else
                type="button"
                @click="$emit('change', link.page || link.url)"
                :class="[
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                    link.active
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800',
                ]"
                v-html="link.label"
            />
        </template>
    </div>
</template>
