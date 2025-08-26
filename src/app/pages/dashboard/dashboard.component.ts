import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SideRailComponent } from './components/side-rail/side-rail.component';
import { AssetHeaderComponent } from './components/asset-header/asset-header.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { CandlePanelComponent } from './components/candle-panel/candle-panel.component';
import { TradeHistoryComponent } from './components/trade-history/trade-history.component';
import { DonutScoreComponent } from './components/donut-score/donut-score.component';
import { TrustBarComponent } from './components/trust-bar/trust-bar.component';
import { AuthService } from '../../services/auth.service';
import { formatCountdown } from '../../utils/time';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TopbarComponent,
    SideRailComponent,
    AssetHeaderComponent,
    MetricCardComponent,
    CandlePanelComponent,
    TradeHistoryComponent,
    DonutScoreComponent,
    TrustBarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  metrics = [
    { title: 'Total Liquidity', value: '₹ 2,803,805.50' },
    { title: 'Daily Volume', value: '₹ 2,372,139.74' },
    { title: "Open Interest ('000)", value: '120.6' },
    { title: "Lots Traded ('000)", value: '271.35' }
  ];

  trades = [
    { time: '09:21:30', price: '24,830.10', change: '+0.15%', up: true, amount: '5', fee: '0.25', hash: '0x98…4f1d' },
    { time: '09:20:11', price: '24,829.50', change: '-0.20%', up: false, amount: '2', fee: '0.10', hash: '0x77…ab32' },
    { time: '09:18:05', price: '24,831.20', change: '+0.05%', up: true, amount: '1', fee: '0.05', hash: '0xd1…c9e0' },
    { time: '09:15:42', price: '24,825.90', change: '-0.12%', up: false, amount: '3', fee: '0.15', hash: '0x44…90ac' },
    { time: '09:13:10', price: '24,827.00', change: '+0.08%', up: true, amount: '4', fee: '0.20', hash: '0xb2…4a93' },
    { time: '09:10:55', price: '24,823.70', change: '-0.30%', up: false, amount: '2', fee: '0.10', hash: '0xfe…1d2c' }
  ];

  connected = false;
  expiresAt: string | null = null;
  remaining = 0;
  polling: any;
  private countdown: any;
  mainInstrument: string | null = null;
  liveLtp: number | null = null;
  marketClosed = false;
  private sse: EventSource | null = null;
  private retry = 1000;
  private apiBase = environment.apiBase;

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.checkStatus();
    this.polling = setInterval(() => this.checkStatus(), 15000);
    this.countdown = setInterval(() => {
      if (this.connected && this.remaining > 0) {
        this.remaining--;
        if (this.remaining <= 0) {
          this.connected = false;
        }
      }
    }, 1000);
    this.http
      .get<{ mainInstrument: string; options: string[] }>(`${this.apiBase}/md/selection`)
      .subscribe({
        next: sel => {
          this.mainInstrument = sel.mainInstrument;
          if (this.mainInstrument) {
            const key = this.mainInstrument;
            this.http
              .get<{ ltp: number }>(`${this.apiBase}/md/last-ltp?instrumentKey=${encodeURIComponent(key)}`)
              .subscribe({
                next: res => (this.liveLtp = res.ltp),
                error: () => {},
                complete: () => this.openSse(key),
              });
          }
        },
      });
  }

  ngOnDestroy() {
    clearInterval(this.polling);
    clearInterval(this.countdown);
    this.sse?.close();
  }

  private checkStatus() {
    this.auth.getStatus().subscribe({
      next: s => {
        this.connected = s.connected;
        this.expiresAt = s.expiresAt;
        this.remaining = s.remainingSeconds;
      }
    });
  }

  login() {
    this.auth.getLoginUrl().subscribe({ next: url => (window.location.href = url) });
  }

  refresh() {
    this.login();
  }

  formatRemaining() {
    return formatCountdown(this.remaining);
  }

  private openSse(key: string) {
    this.sse?.close();
    const url = `${this.apiBase}/md/stream?instrumentKey=${encodeURIComponent(key)}`;
    const connect = () => {
      this.sse = new EventSource(url);
      this.marketClosed = false;
      this.sse.addEventListener('tick', ev => {
        try {
          const data = JSON.parse((ev as MessageEvent).data);
          if (typeof data.ltp === 'number') {
            this.liveLtp = data.ltp;
          }
        } catch {}
      });
      this.sse.addEventListener('status', ev => {
        try {
          const data = JSON.parse((ev as MessageEvent).data);
          if (typeof data.marketClosed === 'boolean') {
            this.marketClosed = data.marketClosed;
          }
        } catch {}
      });
      this.sse.addEventListener('hb', () => {});
      this.sse.onerror = () => {
        this.sse?.close();
        setTimeout(connect, this.retry);
        if (this.retry < 10000) this.retry *= 2;
      };
    };
    this.retry = 1000;
    connect();
  }

  formatInr(n?: number) {
    return n == null
      ? '—'
      : n.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
        });
  }
}
