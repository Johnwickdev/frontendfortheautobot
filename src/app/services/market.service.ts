import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Tick {
  type: 'tick';
  ts: number;
  instrumentKey: string;
  ltp: number;
  ltq?: number;
  ltt?: number;
  cp?: number;
  bidAsk?: { bidP: number; bidQ: number; askP: number; askQ: number }[];
  oi?: number;
  greeks?: { delta: number; theta: number; gamma: number; vega: number; rho: number } | null;
  ohlc?: {
    d1?: { o: number; h: number; l: number; c: number; v: number | string; ts: number };
    i1?: { o: number; h: number; l: number; c: number; v: number | string; ts: number };
  };
}

export type HistoryInterval = '1minute' | '5minute' | '15minute' | 'day';
export type WsConnectionState = 'disconnected' | 'connecting' | 'connected';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private backendUrl = environment.backendUrl;
  private wsBase = this.backendUrl.replace(/^http/i, 'ws');

  private readonly connectionStateSubject = new BehaviorSubject<WsConnectionState>('disconnected');
  private socket?: WebSocketSubject<Tick>;

  readonly connectionState$ = this.connectionStateSubject.asObservable();

  history(
    instrumentKey: string,
    interval: HistoryInterval,
    from?: string,
    to?: string,
    limit = 300
  ): Observable<Candle[]> {
    let params = new HttpParams()
      .set('instrumentKey', instrumentKey)
      .set('interval', interval)
      .set('limit', limit.toString());
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http
      .get<Candle[] | { candles: Candle[] }>(`${this.backendUrl}/api/market/history`, { params })
      .pipe(map(res => this.normalizeCandles(Array.isArray(res) ? res : res?.candles ?? [])));
  }

  connectWs(keys: string[]): WebSocketSubject<Tick> {
    const filtered = keys.filter(Boolean);
    if (!filtered.length) {
      throw new Error('At least one instrument key is required');
    }
    if (this.socket) {
      this.socket.complete();
    }
    this.connectionStateSubject.next('connecting');
    const query = filtered.map(k => encodeURIComponent(k)).join(',');
    const url = `${this.wsBase}/ws/market?keys=${query}`;
    const config: WebSocketSubjectConfig<Tick> = {
      url,
      deserializer: msg => JSON.parse(msg.data),
      serializer: value => JSON.stringify(value),
      openObserver: {
        next: () => this.zone.run(() => this.connectionStateSubject.next('connected')),
      },
      closeObserver: {
        next: () => this.zone.run(() => this.connectionStateSubject.next('disconnected')),
      },
    };
    this.socket = webSocket<Tick>(config);
    return this.socket;
  }

  disconnect() {
    this.socket?.complete();
    this.socket = undefined;
    this.connectionStateSubject.next('disconnected');
  }

  private normalizeCandles(values: any[]): Candle[] {
    return values
      .map(value => {
        const ts = this.parseTimestamp(value);
        const open = Number(value.open ?? value.o ?? value.Open ?? value.price_open);
        const high = Number(value.high ?? value.h ?? value.High ?? value.price_high);
        const low = Number(value.low ?? value.l ?? value.Low ?? value.price_low);
        const close = Number(value.close ?? value.c ?? value.Close ?? value.price_close);
        const volumeRaw = value.volume ?? value.v ?? value.qty;
        const volume = volumeRaw != null ? Number(volumeRaw) : undefined;
        if (!Number.isFinite(ts) || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
          return null;
        }
        return { ts, open, high, low, close, volume: volume != null && Number.isFinite(volume) ? volume : undefined } as Candle;
      })
      .filter((c): c is Candle => !!c)
      .sort((a, b) => a.ts - b.ts);
  }

  private parseTimestamp(value: any): number {
    const ts = value?.ts ?? value?.time ?? value?.timestamp;
    if (typeof ts === 'number') {
      return ts;
    }
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Date.now();
  }
}
