<template>
    <ActionNav v-if="isOwn" />
</template>

<script setup lang="ts">
import { ComputedRef, inject, ref } from 'vue'
import ActionNav from './components/ActionNav.vue'

const pluginName = inject<ComputedRef<string>>('plugin:name')
const isOwn = ref(pluginName?.value === 'koishi-plugin-chatluna-actions')
</script>
