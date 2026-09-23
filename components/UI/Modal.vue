<script setup>
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    maxWidth: {
        type: String,
        default: 'md', // sm, md, lg, xl, 2xl, full
    },
    closeable: {
        type: Boolean,
        default: true,
    },
    title: {
        type: String,
        default: null,
    },
});

const emit = defineEmits(['close']);

watch(
    () => props.show,
    () => {
        if (typeof document !== 'undefined') {
            if (props.show) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    },
);

const close = () => {
    if (props.closeable) {
        emit('close');
    }
};

const closeOnEscape = (e) => {
    if (e.key === 'Escape' && props.show) {
        close();
    }
};

onMounted(() => {
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', closeOnEscape);
    }
});

onUnmounted(() => {
    if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', closeOnEscape);
        document.body.style.overflow = '';
    }
});

const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    full: 'sm:max-w-4xl',
}[props.maxWidth] || 'sm:max-w-md';
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="ease-out duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="ease-in duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-show="show"
                class="fixed inset-0 z-50 overflow-hidden px-4 py-6 sm:px-0 flex items-center justify-center"
            >
                <!-- Backdrop -->
                <div
                    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                    @click="close"
                />

                <!-- Modal Content -->
                <div
                    v-show="show"
                    :class="[
                        'relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:w-full dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] my-auto z-10',
                        maxWidthClass,
                    ]"
                >
                    <!-- Fixed Header -->
                    <div
                        v-if="title || $slots.header"
                        class="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10"
                    >
                        <h3
                            v-if="title"
                            class="text-base font-bold text-slate-900 dark:text-slate-100"
                        >
                            {{ title }}
                        </h3>
                        <slot name="header" />
                        <button
                            v-if="closeable"
                            type="button"
                            @click="close"
                            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
                        >
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- Scrollable Body -->
                    <div class="px-6 py-5 overflow-y-auto flex-1 space-y-4">
                        <slot />
                    </div>

                    <!-- Fixed Footer -->
                    <div
                        v-if="$slots.footer"
                        class="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0 z-10"
                    >
                        <slot name="footer" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
