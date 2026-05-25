<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const text = ref('')

function handleSend() {
  if (!text.value.trim()) return
  emit('send', text.value)
  text.value = ''
}
</script>

<template>
  <div class="message-input">
    <input
      v-model="text"
      placeholder="Type a message..."
      @keyup.enter="handleSend"
    />
    <button @click="handleSend">Send</button>
  </div>
</template>
