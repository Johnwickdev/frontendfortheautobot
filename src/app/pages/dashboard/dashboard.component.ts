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
import { MarketDataService } from '../../services/market-data.service';
import { Subscription, interval } from 'rxjs';
import { TradeRow } from '../../models/trade-history.model';

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

  filterSide: 'both' | 'CE' | 'PE' = 'both';
  tradeRows: TradeRow[] = [];
  tradePolling?: Subscription;
  loadingTrades = false;
  toast: string | null = null;

  connected = false;
  expiresAt: string | null = null;
  remaining = 0;
  polling: any;
  private countdown: any;
  private ltpInterval: any;
  nowLtp: number | null = null;
  ltpTs?: string;
  ltpSource?: 'live' | 'influx';
  marketOpen?: boolean;
  mainInstrument: string | null = null;

  private tickSub?: Subscription;
  private tradeSub?: Subscription;

  constructor(private auth: AuthService, private marketData: MarketDataService) {}

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
    const stored = localStorage.getItem('mainInstrumentKey');
    if (stored) {
      this.initializeInstrument(stored);
    } else {
      this.marketData.getSelection().subscribe({
        next: sel => {
          if (sel?.mainInstrument) {
            localStorage.setItem('mainInstrumentKey', sel.mainInstrument);
            this.initializeInstrument(sel.mainInstrument);
          } else {
            this.initializeInstrument('NSE_FO|64103');
          }
        },
        error: () => this.initializeInstrument('NSE_FO|64103'),
      });
    }
    this.loadSectorTrades();
    this.tradePolling = interval(10000).subscribe(() => this.loadSectorTrades());
    this.tradeSub = this.marketData.listenTrades().subscribe(t => {
      if (this.filterSide !== 'both' && t.optionType !== this.filterSide) return;
      if (this.tradeRows.find(r => r.txId === t.txId)) return;
      this.tradeRows.unshift(t);
      this.tradeRows = this.normalize(this.tradeRows);
    });
  }

  ngOnDestroy() {
    clearInterval(this.polling);
    clearInterval(this.countdown);
    clearInterval(this.ltpInterval);
    this.tickSub?.unsubscribe();
    this.tradeSub?.unsubscribe();
    this.tradePolling?.unsubscribe();
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

  private initializeInstrument(key: string) {
    this.mainInstrument = key;
    this.startLtpPolling();
    this.tickSub = this.marketData.listenTicks().subscribe(tick => {
      if (tick.instrumentKey === this.mainInstrument && tick.ltp != null) {
        this.nowLtp = tick.ltp;
        this.ltpSource = 'live';
        this.ltpTs = new Date().toISOString();
      }
    });
  }

  private startLtpPolling() {
    const load = () => {
      if (!this.mainInstrument) return;
      this.marketData.getLtp(this.mainInstrument).subscribe({
        next: r => {
          if (!r || r.ltp == null) {
            this.nowLtp = null;
            this.ltpSource = undefined;
            this.ltpTs = undefined;
            return;
          }
          this.nowLtp = r.ltp;
          this.ltpSource = r.source;
          this.ltpTs = r.ts;
        },
        error: () => {
          this.nowLtp = null;
          this.ltpSource = undefined;
          this.ltpTs = undefined;
        },
      });
    };
    load();
    this.ltpInterval = setInterval(load, 5000);
  }

  setFilterSide(side: 'both' | 'CE' | 'PE') {
    if (this.filterSide === side) return;
    this.filterSide = side;
    this.tradePolling?.unsubscribe();
    this.loadSectorTrades();
    this.tradePolling = interval(10000).subscribe(() => this.loadSectorTrades());
  }

  private loadSectorTrades() {
    if (!this.connected) {
      this.tradeRows = [];
      return;
    }
    this.loadingTrades = true;
    this.marketData.getSectorTrades({ limit: 50, side: this.filterSide }).subscribe({
      next: res => {
        this.loadingTrades = false;
        if (res.status === 200) {
          this.tradeRows = this.normalize(res.body || []);
        } else if (res.status === 204) {
          this.tradeRows = [];
        }
      },
      error: () => {
        this.loadingTrades = false;
        this.showToast('Retrying…');
        setTimeout(() => this.loadSectorTrades(), 10000);
      },
    });
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => (this.toast = null), 3000);
  }

  private normalize(rows: TradeRow[]): TradeRow[] {
    return rows
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 100);
  }

}
