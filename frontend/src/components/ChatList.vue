<script setup>
defineProps({
  chats: { type: Array, default: () => [] },
  selectedChatId: { type: [String, Number], default: null }
})
defineEmits(['select'])
</script>

<template>
  <aside class="chat-list">
    <div
      v-for="chat in chats"
      :key="chat.id"
      class="chat-item"
      :class="{ active: chat.id === selectedChatId }"
      @click="$emit('select', chat.id)"
    >
      <span class="chat-title">{{ chat.title }}</span>
      <span class="chat-type">{{ chat.type }}</span>
    </div>
    <div v-if="chats.length === 0" class="chat-list-empty">
      No chats yet. Send a message to your bot in Telegram to see it here.
    </div>
  </aside>
</template>
