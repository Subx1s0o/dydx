import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Network,
  CompositeClient,
  SocketClient,
} from '@dydxprotocol/v4-client-js';

@Injectable()
export class DydxService implements OnModuleInit {
  private client: CompositeClient;
  private socketClient: SocketClient;
  private network: Network;

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
          console.log('Socket opened');
        },
        () => {
          console.log('Socket closed');
        },
        (message) => {
          console.log('Received socket message:', message.data);
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
