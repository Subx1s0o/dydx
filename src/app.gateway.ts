import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { DydxService } from './dydx.service';

import { Server } from 'socket.io';
import { EventEmitter2 } from 'eventemitter2';
@WebSocketGateway(80, {
  namespace: '',
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly dydxService: DydxService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: any) {
    if (data.event === 'subscribeToOrderbook') {
      return this.subscribeToOrderbook(data.data);
    } else if (data.event === 'subscribeToMarket') {
      return this.subscribeToMarket(data.data);
    } else if (data.event === 'unsubscribeFromMarket') {
      return this.unsubscribeFromMarket(data.data);
    } else if (data.event === 'unsubscribeFromOrderbook') {
      return this.unsubscribeFromOrderbook(data.data);
    }
  }

  subscribeToMarket(data: { marketId: string }) {
    try {
      const socketClient = this.dydxService.getSocketClient();
      socketClient.subscribe('v4_markets', {
        id: data.marketId,
      });
      this.server.emit('markets', {
        event: 'subscribed',
        channel: 'markets',
        market: data.marketId,
      });
      this.eventEmitter.addListener('message', (data) => {
        this.server.emit('markets', data);
      });
    } catch (error) {
      console.error('Failed to subscribe to market:', error);
      return { event: 'error', data: 'Failed to subscribe to market' };
    }
  }

  subscribeToOrderbook(data: { marketId: string }) {
    try {
      const { marketId } = data;
      console.log(`Client subscribing to orderbook for market ${marketId}`);
      const socketClient = this.dydxService.getSocketClient();
      socketClient.subscribe('v4_orderbook', {
        id: data.marketId,
      });

      this.server.emit('orderbooks', {
        event: 'subscribed',
        channel: 'orderbook',
        market: marketId,
      });

      this.eventEmitter.addListener('message', (data) => {
        this.server.emit('orderbooks', data);
      });
    } catch (error) {
      console.error('Failed to subscribe to orderbook:', error);
      return { event: 'error', data: 'Failed to subscribe to orderbook' };
    }
  }

  unsubscribeFromMarket(data: { marketId: string }) {
    const socketClient = this.dydxService.getSocketClient();
    socketClient.unsubscribe('v4_markets', {
      id: data.marketId,
    });
    this.server.emit('markets', {
      event: 'unsubscribed',
      channel: 'markets',
      market: data.marketId,
    });
  }

  unsubscribeFromOrderbook(data: { marketId: string }) {
    const socketClient = this.dydxService.getSocketClient();
    socketClient.unsubscribe('v4_orderbook', {
      id: data.marketId,
    });
    this.server.emit('orderbooks', {
      event: 'unsubscribed',
      channel: 'orderbook',
      market: data.marketId,
    });
  }
}
