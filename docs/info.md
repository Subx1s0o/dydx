# How dYdX API Trading Works 

## Basic Principles

- The account balance is held entirely in **USDC**.
- Real coins (BTC, ETH, etc.) are not bought or owned.
- Trading is done using **perpetual futures contracts**.
- All profits and losses (PnL) are calculated and settled in **USDC**.

## How It Works

1. **Deposit**  
   Only **USDC** can be deposited into the dYdX account.

2. **Opening a Position**  
   Placing an order to buy or sell an asset like BTC creates a perpetual contract that tracks the price of the asset.  
   The balance changes based on price movement — the underlying asset is not actually owned.

3. **Long or Short**
   - **Long (buy)**: The USDC balance increases if the asset price goes up.
   - **Short (sell)**: The USDC balance increases if the asset price goes down.

4. **Closing a Position**  
   When closing a position, the system calculates profit or loss in USDC and updates the balance accordingly.

## Key Points

- Real BTC, ETH, or other assets are never received or held.
- The account only contains USDC, while positions simulate exposure to various assets.
- Trading is based on **margin** — the USDC balance acts as collateral for open positions.

### Order Modification

dYdX v4 does not support modifying existing orders. Orders are immutable once placed on-chain.

To change an order's price or quantity:
1. Cancel the original order
2. Create a new order with the desired parameters

The protocol only provides two order-related transaction messages:
- `MsgPlaceOrder` - for creating orders
- `MsgCancelOrder` - for canceling orders

### Important Notes:

- **GTT orders** remain available through the API after being canceled.
- **IOC orders** that are canceled (i.e., unfilled or partially unfilled) are **not stored** in the order history via API. They are automatically removed after the cancelation. As a result, canceled IOC orders will not appear in history of orders.
- **FOK orders** are deprecated and no supported.
  
**Reason:**  
IOC orders are treated as "instant execution attempts". If they fail or are partially filled and canceled, they are considered ephemeral and not recorded for long-term storage.

