import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramGateway } from './telegram.gateway';

@Module({
  imports: [ConfigModule],
  providers: [TelegramService, TelegramGateway],
})
export class TelegramModule {}
