<script setup>
import Modal from './Modal.vue';
import Button from './Button.vue';

defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: 'Konfirmasi Tindakan',
    },
    message: {
        type: String,
        default: 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    },
    confirmText: {
        type: String,
        default: 'Lanjutkan',
    },
    cancelText: {
        type: String,
        default: 'Batal',
    },
    variant: {
        type: String,
        default: 'danger', // danger, primary, warning
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['confirm', 'cancel', 'close']);
</script>

<template>
    <Modal :show="show" max-width="md" :title="title" @close="$emit('close')">
        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ message }}
        </p>

        <template #footer>
            <Button
                variant="secondary"
                size="sm"
                :disabled="loading"
                @click="$emit('cancel')"
            >
                {{ cancelText }}
            </Button>
            <Button
                :variant="variant"
                size="sm"
                :loading="loading"
                @click="$emit('confirm')"
            >
                {{ confirmText }}
            </Button>
        </template>
    </Modal>
</template>
