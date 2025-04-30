export class Instrument {
  base_currency: string;
  quote_currency: string;
  instrument_id: string;
  instrument_name: string;
  max_quantity: string;
  min_quantity: string;
  price_decimals: string;
  quantity_decimals: string;
  quantity_increment?: string;
  dydx_instrument?: string;
}
