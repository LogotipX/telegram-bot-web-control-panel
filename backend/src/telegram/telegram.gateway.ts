import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TelegramService } from './telegram.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class TelegramGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly telegramService: TelegramService) {
    this.telegramService.setCallbacks({
      onNewMessage: (message) => {
        this.server.emit('new_message', message);
      },
      onChatsUpdated: (chats) => {
        this.server.emit('chats_updated', chats);
      },
    });
  }

  handleConnection(client: Socket) {
    client.emit('chats_updated', this.telegramService.getChats());
  }

  @SubscribeMessage('select_chat')
  handleSelectChat(client: Socket, chatId: number) {
    client.emit('chat_messages', this.telegramService.getMessages(chatId));
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    client: Socket,
    payload: { chatId: number; text: string },
  ) {
    const { chatId, text } = payload;

    if (!chatId || typeof text !== 'string' || !text.trim()) {
      client.emit('send_error', 'Invalid message parameters');
      return;
    }

    try {
      const message = await this.telegramService.sendMessage(chatId, text);
      this.server.emit('new_message', message);
    } catch (err: any) {
      client.emit('send_error', err.message);
    }
  }

  @SubscribeMessage('request_chats')
  handleRequestChats(client: Socket) {
    client.emit('chats_updated', this.telegramService.getChats());
  }
}
