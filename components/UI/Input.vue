<script setup>
const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: '',
    },
    label: {
        type: String,
        default: null,
    },
    id: {
        type: String,
        default: () => 'input-' + Math.random().toString(36).substring(2, 9),
    },
    type: {
        type: String,
        default: 'text',
    },
    placeholder: {
        type: String,
        default: '',
    },
    error: {
        type: String,
        default: null,
    },
    hint: {
        type: String,
        default: null,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    required: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['update:modelValue']);
</script>

<template>
    <div class="w-full space-y-1.5">
        <label
            v-if="label"
            :for="id"
            class="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
            {{ label }}
            <span v-if="required" class="text-rose-500">*</span>
        </label>
        <div class="relative rounded-lg shadow-sm">
            <input
                :id="id"
                :type="type"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :required="required"
                @input="$emit('update:modelValue', $event.target.value)"
                :class="[
                    'block w-full rounded-lg border text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
                    error
                        ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-700 dark:text-rose-200'
                        : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-indigo-600/20 dark:border-slate-700 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                    $slots.prefix ? 'pl-10' : 'px-3.5 py-2.5',
                    $slots.suffix ? 'pr-10' : '',
                ]"
            />
            <div
                v-if="$slots.prefix"
                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
            >
                <slot name="prefix" />
            </div>
            <div
                v-if="$slots.suffix"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
            >
                <slot name="suffix" />
            </div>
        </div>
        <p v-if="error" class="text-xs font-medium text-rose-600 dark:text-rose-400">
            {{ error }}
        </p>
        <p v-else-if="hint" class="text-xs text-slate-500 dark:text-slate-400">
            {{ hint }}
        </p>
    </div>
</template>
