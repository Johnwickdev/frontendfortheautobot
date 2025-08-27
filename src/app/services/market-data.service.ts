import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { TradeRow } from '../models/trade-history.model';

export interface Candle {
  time: string; // ISO timestamp of minute start
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Tick {
  instrumentKey: string;
  ltp: number;
  ts: string; // ISO timestamp
  volume: number;
}

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private apiBase = environment.apiBase;

  private sse: EventSource | null = null;
  private tickSub = new Subject<Tick>();
  private tradeSub = new Subject<TradeRow>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  connection$ = this.connectionStatus.asObservable();
  ticks$ = this.tickSub.asObservable();
  trades$ = this.tradeSub.asObservable();
  private delays = [1000, 2000, 5000, 10000];
  private delayIndex = 0;

  /** fetch current LTP for the given instrument */
  getLtp(key: string) {
    return this.http
      .get<{
        instrumentKey: string;
        ltp: number;
        ts: string;
        source: 'live' | 'influx';
      }>(`${this.apiBase}/md/ltp?instrumentKey=${encodeURIComponent(key)}`, {
        observe: 'response',
      })
      .pipe(map(res => (res.status === 204 ? null : res.body || null)));
  }

  /** public observable to listen for tick updates */
  listenTicks() {
    return this.ticks$;
  }

  /** public observable to listen for trade updates */
  listenTrades() {
    return this.trades$;
  }

  /** fetch selection of main instrument and options */
  getSelection(): Observable<{ mainInstrument: string; options: string[] } | null> {
    return this.http
      .get<{ mainInstrument: string; options: string[] }>(`${this.apiBase}/md/selection`)
      .pipe(catchError(() => of(null)));
  }

  /** load historical candles */
  getCandles(key: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.apiBase}/md/candles?instrumentKey=${encodeURIComponent(key)}&tf=1m&lookback=120`);
  }

  getTradeHistory(params: { limit?: number; side?: 'CE' | 'PE' | 'both' } = {}) {
    const p = new HttpParams()
      .set('limit', String(params.limit ?? 50))
      .set('side', params.side ?? 'both');
    return this.http.get<TradeRow[]>(`${this.apiBase}/md/trade-history`, {
      params: p,
      observe: 'response',
    });
  }

  /** connect to the streaming endpoint for the selected instruments */
  connect(keys: string[]) {
    this.disconnect();
    if (!keys.length) return;
    const params = keys.map(k => `instrumentKey=${encodeURIComponent(k)}`).join('&');
    const url = `${this.apiBase}/md/stream?${params}`;
    const open = () => {
      this.sse = new EventSource(url);
      this.connectionStatus.next(true);
      this.sse.onmessage = ev => {
        this.zone.run(() => {
          try {
            const t = JSON.parse(ev.data) as Tick;
            this.tickSub.next(t);
          } catch (e) {}
        });
      };
      this.sse.addEventListener('trade', ev => {
        this.zone.run(() => {
          try {
            const t = JSON.parse((ev as MessageEvent).data) as TradeRow;
            this.tradeSub.next(t);
          } catch (e) {}
        });
      });
      this.sse.onerror = () => {
        this.connectionStatus.next(false);
        this.sse?.close();
        const delay = this.delays[this.delayIndex];
        setTimeout(open, delay);
        if (this.delayIndex < this.delays.length - 1) this.delayIndex++;
      };
    };
    this.delayIndex = 0;
    open();
  }

  disconnect() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.connectionStatus.next(false);
    this.delayIndex = 0;
  }
}
