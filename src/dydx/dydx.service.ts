import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  Network,
  CompositeClient,
  SocketClient,
} from '@dydxprotocol/v4-client-js';
import { EventEmitter2 } from 'eventemitter2';
import { ConfigService } from '@nestjs/config';
import { DydxSocketMessage } from 'types/dydx-message.type';

@Injectable()
export class DydxService implements OnModuleInit, OnModuleDestroy {
  private restClient: CompositeClient | null = null;
  private wsClient: SocketClient | null = null;
  private network: Network;
  private isWsConnected = false;

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private lastMessageTime: number = 0;
  private reconnectAttempts = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
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
      this.network =
        this.configService.get('IS_TESTNET') === true
          ? Network.testnet()
          : Network.mainnet();

      this.restClient = await CompositeClient.connect(this.network);

      console.log('Connected to dYdX REST API');
    } catch (error) {
      console.error('Failed to connect to REST API:', error.message);
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

          this.eventEmitter.emit('websocketConnected');
        },

        // On disconnect
        () => {
          this.handleWebSocketDisconnect();
        },

        // On message
        (message) => {
          this.lastMessageTime = Date.now();

          try {
            const data: DydxSocketMessage = JSON.parse(message.data);

            if (data.channel === 'v4_orderbook') {
              this.eventEmitter.emit('handleOrderbookMessage', data.id, data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error.message);
          }
        },

        // On error
        (error) => {
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

      if (timeSinceLastMessage > 15000) {
        console.log(
          'No messages received in the last interval, checking connection...',
        );

        try {
          this.wsClient.subscribeToMarkets();

          this.heartbeatTimeout = setTimeout(() => {
            const timeSinceLastMessageAfterPing =
              Date.now() - this.lastMessageTime;

            if (timeSinceLastMessageAfterPing > 5000) {
              console.log('Heartbeat failed - no response received after ping');
              this.reconnectWebSocket();
            }
          }, 5000);
        } catch (error) {
          console.error('Error during heartbeat check:', error.message);
          this.reconnectWebSocket();
        }
      }
    }, 15000);
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
      this.eventEmitter.emit('websocketDisconnected');
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
      `Attempting to reconnect in 3 seconds (attempt ${this.reconnectAttempts + 1})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectWebSocket();
    }, 3000);
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

    this.eventEmitter.emit('websocketDisconnected');
    this.eventEmitter.removeAllListeners();
  }

  getRestClient(): CompositeClient | null {
    return this.restClient;
  }

  getSocketClient(): SocketClient | null {
    return this.wsClient;
  }

  isWebSocketConnected(): boolean {
    return this.wsClient !== null && this.isWsConnected;
  }
}
