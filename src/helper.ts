import { config } from './config';

export interface InstrumentMapping {
  original: string;
  dydx: string;
}

export function findMatchingInstruments(markets: any): InstrumentMapping[] {
  const availableInstruments = Object.keys(markets);

  return config.instruments
    .map((instrument) => {
      const baseAsset = instrument.split('/')[0];
      const dydxFormat = `${baseAsset}-USD`;

      if (availableInstruments.includes(dydxFormat)) {
        return {
          original: instrument,
          dydx: dydxFormat,
        };
      }
      return null;
    })
    .filter((mapping): mapping is InstrumentMapping => mapping !== null);
}
