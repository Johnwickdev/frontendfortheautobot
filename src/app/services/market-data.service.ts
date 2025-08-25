import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private baseUrl = environment.apiBaseUrl;

  private sse: EventSource | null = null;
  private tickSub = new Subject<Tick>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  connection$ = this.connectionStatus.asObservable();
  ticks$ = this.tickSub.asObservable();
  private reconnectDelay = 1000;

  /** attempt to fetch currently tracked instruments from backend */
  listTracked(): Observable<string[]> {
    return this.http
      .get<{ instrumentKeys: string[] }>(`${this.baseUrl}/md/tracked`)
      .pipe(
        map(r => r.instrumentKeys),
        catchError(() => of(['NIFTY_FUT', 'NIFTY_CE', 'NIFTY_PE']))
      );
  }

  /** load historical candles */
  getCandles(key: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.baseUrl}/md/candles?instrumentKey=${encodeURIComponent(key)}&tf=1m&lookback=120`);
  }

  /** connect to the streaming endpoint for the selected instruments */
  connect(keys: string[]) {
    this.disconnect();
    if (!keys.length) return;
    const params = keys.map(k => `instrumentKey=${encodeURIComponent(k)}`).join('&');
    const url = `${this.baseUrl}/md/stream?${params}`;
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
      this.sse.onerror = () => {
        this.connectionStatus.next(false);
        this.sse?.close();
        setTimeout(open, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      };
    };
    open();
  }

  disconnect() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.connectionStatus.next(false);
    this.reconnectDelay = 1000;
  }
}
