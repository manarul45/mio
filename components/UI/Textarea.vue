<script setup>
const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    label: {
        type: String,
        default: null,
    },
    id: {
        type: String,
        default: () => 'textarea-' + Math.random().toString(36).substring(2, 9),
    },
    placeholder: {
        type: String,
        default: '',
    },
    rows: {
        type: [Number, String],
        default: 4,
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
            <textarea
                :id="id"
                :rows="rows"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :required="required"
                @input="$emit('update:modelValue', $event.target.value)"
                :class="[
                    'block w-full rounded-lg border text-sm px-3.5 py-2.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
                    error
                        ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-700'
                        : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-indigo-600/20 dark:border-slate-700 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                ]"
            />
        </div>
        <p v-if="error" class="text-xs font-medium text-rose-600 dark:text-rose-400">
            {{ error }}
        </p>
        <p v-else-if="hint" class="text-xs text-slate-500 dark:text-slate-400">
            {{ hint }}
        </p>
    </div>
</template>
