<script setup>
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'
import ChatList from './components/ChatList.vue'
import MessageArea from './components/MessageArea.vue'
import MessageInput from './components/MessageInput.vue'

const chats = ref([])
const selectedChatId = ref(null)
const messages = ref([])
const connectionStatus = ref('connecting')
const error = ref('')

const socket = io()

onMounted(() => {
  socket.on('connect', () => { connectionStatus.value = 'connected' })
  socket.on('disconnect', () => { connectionStatus.value = 'disconnected' })

  socket.on('chats_updated', (chatList) => { chats.value = chatList })

  socket.on('chat_messages', (msgs) => { messages.value = msgs })

  socket.on('new_message', (msg) => {
    if (!chats.value.find(c => c.id === msg.chatId)) {
      socket.emit('request_chats')
    }
    if (msg.chatId === selectedChatId.value) {
      messages.value = [...messages.value, msg]
    }
  })

  socket.on('send_error', (err) => {
    error.value = err
    setTimeout(() => { error.value = '' }, 3000)
  })
})

function selectChat(chatId) {
  selectedChatId.value = chatId
  messages.value = []
  socket.emit('select_chat', chatId)
}

function sendMessage(text) {
  if (!selectedChatId.value || !text.trim()) return
  socket.emit('send_message', { chatId: selectedChatId.value, text })
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Telegram Bot Chat</h1>
      <span class="status" :class="connectionStatus">{{ connectionStatus }}</span>
    </header>
    <div class="app-body">
      <ChatList
        :chats="chats"
        :selectedChatId="selectedChatId"
        @select="selectChat"
      />
      <div class="chat-panel" v-if="selectedChatId">
        <MessageArea :messages="messages" />
        <MessageInput @send="sendMessage" />
      </div>
      <div class="no-chat" v-else>
        <p>Select a chat to start messaging</p>
      </div>
    </div>
    <div class="toast" v-if="error">{{ error }}</div>
  </div>
</template>
