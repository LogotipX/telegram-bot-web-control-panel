import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN is not set. Check your .env file.');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const chats = new Map();
const messages = new Map();
let updateOffset = 0;

async function getUpdates() {
  const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${updateOffset}`);
  return res.json();
}

async function sendTelegramMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return res.json();
}

function processMessage(msg) {
  const chatId = msg.chat.id;
  const isNewChat = !chats.has(chatId);

  if (isNewChat) {
    chats.set(chatId, {
      id: chatId,
      title: msg.chat.title
        || `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim()
        || String(chatId),
      type: msg.chat.type
    });
    messages.set(chatId, []);
    io.emit('chats_updated', Array.from(chats.values()));
  }

  const message = {
    id: msg.message_id,
    text: msg.text || '',
    from: msg.from.first_name || 'Unknown',
    fromId: msg.from.id,
    date: msg.date,
    chatId,
    isBot: msg.from.is_bot
  };

  messages.get(chatId).push(message);
  io.emit('new_message', message);
}

async function pollUpdates() {
  try {
    const data = await getUpdates();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        updateOffset = update.update_id + 1;
        if (update.message) {
          processMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
  setTimeout(pollUpdates, 2000);
}

io.on('connection', (socket) => {
  socket.emit('chats_updated', Array.from(chats.values()));

  socket.on('select_chat', (chatId) => {
    socket.emit('chat_messages', messages.get(chatId) || []);
  });

  socket.on('send_message', async ({ chatId, text }) => {
    try {
      const data = await sendTelegramMessage(chatId, text);
      if (data.ok) {
        const msg = data.result;
        const message = {
          id: msg.message_id,
          text: msg.text,
          from: 'Bot',
          fromId: msg.from.id,
          date: msg.date,
          chatId,
          isBot: true
        };
        if (!messages.has(chatId)) {
          messages.set(chatId, []);
        }
        messages.get(chatId).push(message);
        io.emit('new_message', message);
      } else {
        socket.emit('send_error', data.description);
      }
    } catch (err) {
      socket.emit('send_error', err.message);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  pollUpdates();
});
