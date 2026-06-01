import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chat, Message } from './telegram.types';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly chats = new Map<number, Chat>();
  private readonly messages = new Map<number, Message[]>();
  private updateOffset = 0;
  private botApiUrl: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private onNewMessage: ((message: Message) => void) | null = null;
  private onChatsUpdated: ((chats: Chat[]) => void) | null = null;

  constructor(private readonly configService: ConfigService) {}

  setCallbacks(handlers: {
    onNewMessage: (message: Message) => void;
    onChatsUpdated: (chats: Chat[]) => void;
  }) {
    this.onNewMessage = handlers.onNewMessage;
    this.onChatsUpdated = handlers.onChatsUpdated;
  }

  onModuleInit() {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      this.logger.warn('BOT_TOKEN not set. No bot will be polled.');
      return;
    }
    this.botApiUrl = `https://api.telegram.org/bot${token}`;
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  startPolling() {
    this.pollUpdates();
  }

  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getChats(): Chat[] {
    return Array.from(this.chats.values());
  }

  getMessages(chatId: number): Message[] {
    return this.messages.get(chatId) || [];
  }

  async sendMessage(chatId: number, text: string): Promise<Message> {
    const res = await fetch(`${this.botApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.description);
    }

    const msg = data.result;
    const message: Message = {
      id: msg.message_id,
      text: msg.text,
      from: 'Bot',
      fromId: msg.from?.id || 0,
      date: msg.date,
      chatId,
      isBot: true,
    };

    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    this.messages.get(chatId)!.push(message);

    return message;
  }

  processMessage(msg: any): { chatUpdated: boolean; message: Message } {
    const chatId = msg.chat.id;
    const isNewChat = !this.chats.has(chatId);

    if (isNewChat) {
      this.chats.set(chatId, {
        id: chatId,
        title:
          msg.chat.title ||
          msg.chat.username ||
          `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim() ||
          String(chatId),
        type: msg.chat.type,
      });
      this.messages.set(chatId, []);
    }

    const message: Message = {
      id: msg.message_id,
      text: msg.text || '',
      from: msg.from.first_name || 'Unknown',
      fromId: msg.from.id,
      date: msg.date,
      chatId,
      isBot: msg.from.is_bot,
    };

    this.messages.get(chatId)!.push(message);

    return { chatUpdated: isNewChat, message };
  }

  private async pollUpdates() {
    try {
      const res = await fetch(
        `${this.botApiUrl}/getUpdates?offset=${this.updateOffset}`,
      );
      const data = await res.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          this.updateOffset = update.update_id + 1;
          if (update.message) {
            const result = this.processMessage(update.message);
            if (result.chatUpdated && this.onChatsUpdated) {
              this.onChatsUpdated(this.getChats());
            }
            if (this.onNewMessage) {
              this.onNewMessage(result.message);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error('Polling error: ' + err.message);
    }

    this.pollTimer = setTimeout(() => this.pollUpdates(), 2000);
  }
}
