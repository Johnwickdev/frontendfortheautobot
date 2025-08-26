import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, of } from 'rxjs';
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
  private delays = [1000, 2000, 5000, 10000];
  private delayIndex = 0;

  /** fetch selection of main instrument and options */
  getSelection(): Observable<{ mainInstrument: string; options: string[] } | null> {
    return this.http
      .get<{ mainInstrument: string; options: string[] }>(`${this.baseUrl}/md/selection`)
      .pipe(catchError(() => of(null)));
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
