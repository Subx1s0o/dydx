import { config } from '../src/config';
import { OrderFlags } from '@dydxprotocol/v4-client-js';

export interface InstrumentMapping {
  original: string;
  dydx: string;
}

export function formatToDydxInstrument(instrument: string): string {
  const baseAsset = instrument.split('/')[0];
  return `${baseAsset}-USD`;
}

export function formatFromDydxInstrument(dydxInstrument: string): string {
  const baseAsset = dydxInstrument.split('-')[0];
  return `${baseAsset}/USDT`;
}

export function findMatchingInstruments(markets: any): InstrumentMapping[] {
  const availableInstruments = Object.keys(markets);

  return config.instruments
    .map((instrument) => {
      const dydxFormat = formatToDydxInstrument(instrument);

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

export const toUnixTimestamp = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const date = new Date(value);
  const result = Math.floor(date.getTime() / 1000);

  return result;
};

export function parseOrderFlags(orderFlags: string | number) {
  const flagsNum = typeof orderFlags === 'string' ? +orderFlags : orderFlags;

  let parsedFlags: string | undefined;

  if (flagsNum === OrderFlags.SHORT_TERM) {
    parsedFlags = 'SHORT_TERM';
  } else if (flagsNum === OrderFlags.CONDITIONAL) {
    parsedFlags = 'CONDITIONAL';
  } else if (flagsNum === OrderFlags.LONG_TERM) {
    parsedFlags = 'LONG_TERM';
  } else {
    parsedFlags = undefined;
  }
  return parsedFlags;
}
