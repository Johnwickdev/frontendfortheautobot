import { Component, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { Candle, MarketDataService, Tick } from '../../services/market-data.service';

@Component({
  selector: 'app-candlestick-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candlestick-chart.component.html',
  styleUrls: ['./candlestick-chart.component.css']
})
export class CandlestickChartComponent implements OnInit, OnDestroy {
  @Input() instrumentKey!: string;
  candles: Candle[] = [];
  nowPrice?: number;
  lastUpdate?: Date;
  private sub?: Subscription;
  private ctx?: CanvasRenderingContext2D;
  private dirty = false;

  constructor(private md: MarketDataService, private el: ElementRef) {}

  ngOnInit() {
    this.md.getCandles(this.instrumentKey).subscribe(cs => {
      this.candles = cs;
      this.dirty = true;
    });
    this.sub = this.md.ticks$
      .pipe(filter(t => t.instrumentKey === this.instrumentKey))
      .subscribe(t => this.handleTick(t));
    requestAnimationFrame(() => this.renderLoop());
  }

  handleTick(t: Tick) {
    this.nowPrice = t.ltp;
    this.lastUpdate = new Date(t.ts);
    const bucket = new Date(this.lastUpdate);
    bucket.setSeconds(0,0);
    const key = bucket.toISOString();
    let last = this.candles[this.candles.length - 1];
    if (!last || last.time !== key) {
      last = { time: key, open: t.ltp, high: t.ltp, low: t.ltp, close: t.ltp, volume: t.volume };
      this.candles.push(last);
      if (this.candles.length > 240) this.candles.shift();
    } else {
      last.high = Math.max(last.high, t.ltp);
      last.low = Math.min(last.low, t.ltp);
      last.close = t.ltp;
      last.volume += t.volume;
    }
    this.dirty = true;
  }

  renderLoop() {
    if (this.dirty) {
      this.draw();
      this.dirty = false;
    }
    setTimeout(() => requestAnimationFrame(() => this.renderLoop()), 100);
  }

  draw() {
    const canvas: HTMLCanvasElement = this.el.nativeElement.querySelector('canvas');
    if (!canvas) return;
    if (!this.ctx) this.ctx = canvas.getContext('2d')!;
    const ctx = this.ctx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!this.candles.length) return;
    const max = Math.max(...this.candles.map(c => c.high));
    const min = Math.min(...this.candles.map(c => c.low));
    const range = max - min || 1;
    const bars = this.candles.slice(-240);
    const barWidth = w / bars.length;
    bars.forEach((c, i) => {
      const openY = h - ((c.open - min) / range) * h;
      const closeY = h - ((c.close - min) / range) * h;
      const highY = h - ((c.high - min) / range) * h;
      const lowY = h - ((c.low - min) / range) * h;
      const x = i * barWidth + barWidth / 2;
      ctx.strokeStyle = c.close >= c.open ? '#0a0' : '#a00';
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      const top = Math.min(openY, closeY);
      const bottom = Math.max(openY, closeY);
      ctx.fillRect(x - barWidth / 4, top, barWidth / 2, Math.max(bottom - top, 1));
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
