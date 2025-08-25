import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthState } from '../../services/auth.service';
import { MarketDataService } from '../../services/market-data.service';
import { CandlestickChartComponent } from './candlestick-chart.component';
import { Subscription } from 'rxjs';
import { formatCountdown } from '../../utils/time';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CandlestickChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  authState?: AuthState;
  instruments: string[] = [];
  selected: string[] = [];
  nowLtp: Record<string, number> = {};
  darkMode = true;
  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    public md: MarketDataService
  ) {}

  ngOnInit(): void {
    const storedDark = localStorage.getItem('darkMode');
    this.darkMode = storedDark !== '0';
    document.body.classList.toggle('light', !this.darkMode);

    this.sub.add(
      this.auth.pollStatus().subscribe(s => {
        this.authState = s;
      })
    );

    this.sub.add(
      this.md.listTracked().subscribe(list => {
        this.instruments = list;
        const saved = localStorage.getItem('instruments');
        this.selected = saved ? JSON.parse(saved) : list;
        this.md.connect(this.selected);
      })
    );

    this.sub.add(
      this.md.ticks$.subscribe(t => {
        this.nowLtp[t.instrumentKey] = t.ltp;
      })
    );
  }

  onSelectionChange() {
    localStorage.setItem('instruments', JSON.stringify(this.selected));
    this.md.connect(this.selected);
  }

  loginWithUpstox(): void {
    this.auth.getLoginUrl().subscribe({
      next: url => (window.location.href = url),
    });
  }

  tokenCountdown(): string {
    return formatCountdown(this.authState?.expiresInSec || 0);
  }

  tokenColor(): string {
    if (!this.authState?.ready) return 'var(--danger)';
    const sec = this.authState.expiresInSec;
    if (sec > 1800) return 'var(--positive)';
    if (sec > 300) return 'var(--warning)';
    return 'var(--danger)';
  }

  toggleDark() {
    this.darkMode = !this.darkMode;
    document.body.classList.toggle('light', !this.darkMode);
    localStorage.setItem('darkMode', this.darkMode ? '1' : '0');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.md.disconnect();
  }
}
