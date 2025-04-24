import { Injectable, OnModuleInit } from '@nestjs/common';

import {
  Network,
  CompositeClient,
  SocketClient,
} from '@dydxprotocol/v4-client-js';
import { EventEmitter2 } from 'eventemitter2';
@Injectable()
export class DydxService implements OnModuleInit {
  private client: CompositeClient;
  private socketClient: SocketClient;
  private network: Network;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    await this.connect();
    this.connectSocket();
  }

  async connect() {
    try {
      this.network = Network.testnet();
      this.client = await CompositeClient.connect(this.network);
      console.log('Connected to dYdX network');
    } catch (error) {
      console.error('Failed to connect to dYdX network:', error);
    }
  }

  connectSocket() {
    try {
      this.socketClient = new SocketClient(
        this.network.indexerConfig,
        () => {
          console.log('Socket connection details:', this.network.indexerConfig);
        },
        () => {
          console.log('Socket closed');
        },
        (message) => {
          console.log(message.data);
          this.eventEmitter.emit('message', message.data);
        },
        (error) => {
          console.error('Socket error:', error);
        },
      );

      this.socketClient.connect();
      console.log('Connecting to dYdX socket...');
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }

  getClient(): CompositeClient {
    return this.client;
  }

  getSocketClient(): SocketClient {
    return this.socketClient;
  }
}
