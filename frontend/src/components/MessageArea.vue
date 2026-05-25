<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] }
})

const container = ref(null)

watch(() => props.messages.length, async () => {
  await nextTick()
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight
  }
})
</script>

<template>
  <div class="message-area" ref="container">
    <div
      v-for="msg in messages"
      :key="`${msg.chatId}-${msg.id}`"
      class="message"
      :class="msg.isBot ? 'sent' : 'received'"
    >
      <div class="message-bubble">
        <span class="message-text">{{ msg.text }}</span>
      </div>
      <span class="message-from">{{ msg.from }}</span>
    </div>
    <div v-if="messages.length === 0" class="messages-empty">
      No messages yet
    </div>
  </div>
</template>
