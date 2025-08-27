export type OptionSide = 'CE' | 'PE' | 'both';
export interface TradeRow {
  ts: string;
  instrumentKey: string;
  optionType: 'CE'|'PE';
  strike: number;
  ltp: number;
  changePct: number;
  qty: number;
  oi: number|null;
  txId: string;
}
