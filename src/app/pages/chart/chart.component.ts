import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { MarketService, Candle, Tick, Timeframe, WsConnectionState } from '../../services/market.service';
import { WatchlistService } from '../../services/watchlist.service';

interface CandleShape {
  x: number;
  width: number;
  bodyTop: number;
  bodyHeight: number;
  wickTop: number;
  wickBottom: number;
  color: string;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit, OnDestroy {
  instrumentKey = signal<string>('');
  timeframe = signal<Timeframe>('1m');
  historyLoading = signal(false);
  historyError = signal<string | null>(null);
  candles = signal<Candle[]>([]);
  candleShapes = signal<CandleShape[]>([]);
  chartWidth = signal(720);
  chartHeight = signal(280);
  latestTick = signal<Tick | null>(null);
  bidAskLevels = signal<{ bidP: number; bidQ: number; askP: number; askQ: number }[]>([]);
  wsState = signal<WsConnectionState>('disconnected');

  readonly timeframeOptions: Timeframe[] = ['1s', '1m', '5m'];

  private wsSub?: Subscription;
  private routeSub?: Subscription;
  private stateSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private market: MarketService,
    private watchlist: WatchlistService
  ) {}

  ngOnInit(): void {
    this.stateSub = this.market.connectionState$.subscribe(state => this.wsState.set(state));
    this.routeSub = this.route.paramMap.subscribe(params => {
      const key = params.get('instrumentKey');
      if (!key) {
        return;
      }
      this.instrumentKey.set(key);
      this.loadHistory();
      this.connectSocket();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.market.disconnect();
    this.routeSub?.unsubscribe();
    this.stateSub?.unsubscribe();
  }

  readonly instrumentDisplay = computed(() => {
    const key = this.instrumentKey();
    const match = this.watchlist.getAll().find(entry => entry.instrumentKey === key);
    return match?.display ?? key;
  });

  changeTimeframe(tf: Timeframe) {
    if (this.timeframe() === tf) return;
    this.timeframe.set(tf);
    this.loadHistory();
  }

  private loadHistory() {
    const key = this.instrumentKey();
    if (!key) return;
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.market.history(key, this.timeframe(), 300).subscribe({
      next: candles => {
        this.candles.set(candles);
        this.historyLoading.set(false);
        this.recomputeShapes();
      },
      error: () => {
        this.historyLoading.set(false);
        this.historyError.set('Failed to load history.');
        this.candles.set([]);
        this.candleShapes.set([]);
      }
    });
  }

  private connectSocket() {
    const key = this.instrumentKey();
    if (!key) return;
    this.wsSub?.unsubscribe();
    const subject = this.market.connectWs([key]);
    this.wsSub = subject
      .pipe(
        retry({
          delay: (_, retryCount) => {
            const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 20000);
            return timer(delayMs);
          },
        })
      )
      .subscribe({
        next: tick => this.processTick(tick),
        error: () => this.wsState.set('disconnected')
      });
  }

  private processTick(tick: Tick) {
    if (!tick || tick.instrumentKey !== this.instrumentKey()) return;
    this.latestTick.set(tick);
    this.bidAskLevels.set((tick.bidAsk ?? []).slice(0, 5));
    if (tick.ltp == null) return;
    const timeframeMs = this.timeframeToMs(this.timeframe());
    const bucket = Math.floor(tick.ts / timeframeMs) * timeframeMs;
    const candles = [...this.candles()];
    let candle = candles[candles.length - 1];
    if (!candle || candle.ts !== bucket) {
      candle = { ts: bucket, open: tick.ltp, high: tick.ltp, low: tick.ltp, close: tick.ltp, volume: tick.ltq ?? 0 };
      candles.push(candle);
      if (candles.length > 400) {
        candles.splice(0, candles.length - 400);
      }
    } else {
      candle.close = tick.ltp;
      candle.high = Math.max(candle.high, tick.ltp);
      candle.low = Math.min(candle.low, tick.ltp);
      if (tick.ltq != null) {
        candle.volume = (candle.volume ?? 0) + tick.ltq;
      }
    }
    this.candles.set(candles);
    this.recomputeShapes();
  }

  private recomputeShapes() {
    const candles = this.candles();
    if (!candles.length) {
      this.candleShapes.set([]);
      return;
    }
    const highs = candles.map(c => c.high ?? c.close ?? c.open);
    const lows = candles.map(c => c.low ?? c.close ?? c.open);
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const height = 260;
    const widthPer = 12;
    const gap = 6;
    const viewWidth = candles.length * (widthPer + gap) + gap;
    this.chartWidth.set(Math.max(viewWidth, 320));
    this.chartHeight.set(height + 20);
    const span = max - min || 1;
    const scale = (value: number) => {
      return height - ((value - min) / span) * height + 10;
    };
    const shapes: CandleShape[] = candles.map((candle, index) => {
      const center = gap + index * (widthPer + gap) + widthPer / 2;
      const openY = scale(candle.open);
      const closeY = scale(candle.close);
      const highY = scale(candle.high);
      const lowY = scale(candle.low);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      return {
        x: center - widthPer / 2,
        width: widthPer,
        bodyTop,
        bodyHeight,
        wickTop: highY,
        wickBottom: lowY,
        color: candle.close >= candle.open ? '#21c55d' : '#ef4444'
      };
    });
    this.candleShapes.set(shapes);
  }

  private timeframeToMs(tf: Timeframe) {
    switch (tf) {
      case '1s':
        return 1000;
      case '5m':
        return 5 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }
}
