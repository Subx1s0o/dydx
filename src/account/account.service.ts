import { SubaccountInfo } from '@dydxprotocol/v4-client-js';
import { Injectable } from '@nestjs/common';
import { DydxService } from 'src/dydx/dydx.service';
import { CompositeClient } from '@dydxprotocol/v4-client-js';
import { Account } from './dto/account';
import { formatFromDydxInstrument } from 'utils/utils';

@Injectable()
export class AccountService {
  private subaccount: SubaccountInfo;
  private client: CompositeClient;

  constructor(private readonly dydxService: DydxService) {}

  onApplicationBootstrap() {
    this.client = this.dydxService.getRestClient();
    this.subaccount = this.dydxService.getSubaccount();
  }

  async getAccount() {
    const { subaccount } =
      await this.client.indexerClient.account.getSubaccount(
        this.subaccount.address,
        this.subaccount.subaccountNumber,
      );
    const account = new Account();

    account.account_id = subaccount.subaccountNumber;
    account.balance = subaccount.equity;
    account.free_collateral = subaccount.freeCollateral;
    account.address = subaccount.address;

    return account;
  }

  async getPositions() {
    const { positions } =
      await this.client.indexerClient.account.getSubaccountPerpetualPositions(
        this.subaccount.address,
        this.subaccount.subaccountNumber,
      );

    const myPos = [];

    for (const position of positions) {
      const { market, ...pos } = position;
      const instrument = formatFromDydxInstrument(market);

      myPos.push({
        instrument,
        ...pos,
      });
    }

    return myPos;
  }
}
