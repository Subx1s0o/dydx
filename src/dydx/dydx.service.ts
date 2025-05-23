import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  Network,
  CompositeClient,
  SocketClient,
  SubaccountInfo,
  LocalWallet,
  BECH32_PREFIX,
} from '@dydxprotocol/v4-client-js';

import { ConfigService } from '@nestjs/config';
import { DydxSocketMessage } from 'types/dydx-message.type';
import { config } from 'src/config';
import { RedisService } from '../redis/redis.service';
import { RedisEvent, RedisMessage } from 'src/redis/event.enum';
import { DydxChannel } from './dydx.enum';
@Injectable()
export class DydxService implements OnModuleInit, OnModuleDestroy {
  private restClient: CompositeClient | null = null;
  private wsClient: SocketClient | null = null;
  private network: Network;
  private subaccount: SubaccountInfo;
  private isWsConnected = false;

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private lastMessageTime: number = 0;
  private reconnectAttempts = 0;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connectRest();
    this.connectWebSocket();
  }

  onModuleDestroy() {
    this.cleanup();
  }

  private async connectRest() {
    try {
      const isTestnet = this.configService.getOrThrow('IS_TESTNET');
      this.network =
        isTestnet === 'true' ? Network.testnet() : Network.mainnet();
      this.restClient = await CompositeClient.connect(this.network);

      const wallet = await LocalWallet.fromMnemonic(
        this.configService.get('WALLET_MNEMONIC'),
        BECH32_PREFIX,
      );

      this.subaccount = new SubaccountInfo(wallet, 0);

      console.log('Connected to dYdX REST API');
    } catch (error) {
      console.error('Failed to connect to REST API:', error);
    }
  }

  private connectWebSocket() {
    if (!this.network) {
      console.warn('Cannot connect WebSocket: network not initialized');
      return;
    }

    try {
      this.wsClient = new SocketClient(
        this.network.indexerConfig,

        // On connect
        () => {
          this.isWsConnected = true;
          this.lastMessageTime = Date.now();
          console.log('WebSocket connected');

          this.reconnectAttempts = 0;
          this.startHeartbeat();

          this.redisService.publish(RedisEvent.WEBSOCKET, {
            event: RedisMessage.CONNECTED,
          });
        },

        // On disconnect AKA not working
        () => {},

        // On message
        (message) => {
          this.lastMessageTime = Date.now();

          try {
            const data: DydxSocketMessage = JSON.parse(message.data);

            if (data.channel === DydxChannel.ORDERBOOK) {
              this.redisService.publish(RedisEvent.ORDERBOOK, {
                id: data.id,
                data,
              });
            }

            // TODO: Handle other channels
          } catch (error) {
            console.error('Error parsing WebSocket message:', error.message);
          }
        },

        // On error
        () => {
          this.handleWebSocketDisconnect();
          this.reconnectWebSocket();
        },
      );

      this.wsClient.connect();
      console.log('Connecting to dYdX WebSocket...');
    } catch (error) {
      console.error('Error creating WebSocket client:', error.message);
      this.handleWebSocketDisconnect();
    }
  }

  subcribeTo(channel: string, options: any): void {
    if (this.isWebSocketConnected()) {
      try {
        this.wsClient.subscribe(channel, options);
        console.log(`Subscribed to ${channel} with options:`, options);
      } catch (error) {
        console.error('Subscription error:', error.message);
      }
    } else {
      console.warn('Cannot subscribe: WebSocket not connected');
      this.reconnectWebSocket();
    }
  }

  getRestClient(): CompositeClient | null {
    return this.restClient;
  }

  getSubaccount(): SubaccountInfo {
    return this.subaccount;
  }

  getSocketClient(): SocketClient | null {
    return this.wsClient;
  }

  isWebSocketConnected(): boolean {
    return this.wsClient !== null && this.isWsConnected;
  }

  private startHeartbeat() {
    console.log('Starting WebSocket heartbeat');

    this.heartbeatInterval = setInterval(() => {
      if (!this.isWsConnected || !this.wsClient) {
        console.log('WebSocket not connected, stopping heartbeat');
        this.stopHeartbeat();
        this.reconnectWebSocket();
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastMessage = currentTime - this.lastMessageTime;

      if (timeSinceLastMessage > config.intervals.heartbeat) {
        console.log(
          'No messages received in the last interval, checking connection...',
        );

        try {
          this.wsClient.subscribeToMarkets();

          this.heartbeatTimeout = setTimeout(() => {
            const timeSinceLastMessageAfterPing =
              Date.now() - this.lastMessageTime;

            if (timeSinceLastMessageAfterPing > config.intervals.ping) {
              console.log('Heartbeat failed - no response received after ping');
              this.reconnectWebSocket();
            }
          }, config.intervals.ping);
        } catch (error) {
          console.error('Error during heartbeat check:', error.message);
          this.reconnectWebSocket();
        }
      }
    }, config.intervals.heartbeat);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleWebSocketDisconnect() {
    this.stopHeartbeat();

    if (this.isWsConnected) {
      this.isWsConnected = false;
      this.redisService.publish(RedisEvent.WEBSOCKET, {
        event: RedisMessage.DISCONNECTED,
      });
    }

    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch (err) {
        console.error('Error closing WebSocket:', err?.message);
      }
      this.wsClient = null;
    }
  }

  private reconnectWebSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    console.log(
      `Attempting to reconnect in ${config.intervals.reconnect} milliseconds (attempt ${this.reconnectAttempts + 1})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectWebSocket();
    }, config.intervals.reconnect);
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch (err) {
        console.error('Error closing WebSocket during cleanup:', err?.message);
      }
      this.wsClient = null;
    }

    this.restClient = null;
    this.isWsConnected = false;

    this.redisService.publish(RedisEvent.WEBSOCKET, {
      event: RedisMessage.DISCONNECTED,
    });
  }
}
