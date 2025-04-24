import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { DydxService } from './dydx.service';
import { CompositeClient } from '@dydxprotocol/v4-client-js';

@WebSocketGateway(80, {
  namespace: 'app',
})
export class AppGateway {
  private client: CompositeClient;

  constructor(private readonly dydxService: DydxService) {
    this.client = this.dydxService.getClient();
  }

  @SubscribeMessage('message')
  getHello(@MessageBody() data: any) {
    console.log('Received data:', data);
    return 'Hello';
  }

  @SubscribeMessage('getMarkets')
  async getMarkets() {
    try {
      const marketsResponse =
        await this.client.indexerClient.markets.getPerpetualMarkets();
      console.log('Markets retrieved successfully');
      return { event: 'markets', data: marketsResponse.markets };
    } catch (error) {
      console.error('Failed to get markets:', error);
      return { event: 'error', data: 'Failed to get markets' };
    }
  }

  @SubscribeMessage('subscribeToMarket')
  subscribeToMarket(@MessageBody() data: { marketId: string }) {
    try {
      const socketClient = this.dydxService.getSocketClient();
      socketClient.subscribe('v4_markets', { id: data.marketId });
      return { event: 'subscribed', market: data.marketId };
    } catch (error) {
      console.error('Failed to subscribe to market:', error);
      return { event: 'error', data: 'Failed to subscribe to market' };
    }
  }
}
