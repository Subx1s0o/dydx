import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Define type for message handlers
type MessageHandler = (message: any) => void;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, MessageHandler[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get('REDIS_HOST') || 'localhost';
    const port = this.configService.get('REDIS_PORT') || 6379;

    this.publisher = new Redis({
      host,
      port: Number(port),
    });

    this.subscriber = new Redis({
      host,
      port: Number(port),
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      if (this.handlers.has(channel)) {
        const handlers = this.handlers.get(channel);
        handlers.forEach((handler) => {
          try {
            handler(JSON.parse(message));
          } catch (error) {
            console.error(
              `Error handling Redis message on channel ${channel}:`,
              error,
            );
          }
        });
      }
    });

    console.log('Redis pub/sub service initialized');
  }

  onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber.disconnect();
    console.log('Redis pub/sub connections closed');
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      await this.subscriber.subscribe(channel);
    }

    this.handlers.get(channel).push(handler);
  }

  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    if (!this.handlers.has(channel)) {
      return;
    }

    if (handler) {
      const handlers = this.handlers.get(channel);
      const index = handlers.indexOf(handler);

      if (index !== -1) {
        handlers.splice(index, 1);
      }

      if (handlers.length === 0) {
        this.handlers.delete(channel);
        await this.subscriber.unsubscribe(channel);
      }
    } else {
      this.handlers.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }
}
