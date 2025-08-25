import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthState } from '../../services/auth.service';
import { MarketDataService } from '../../services/market-data.service';
import { CandlestickChartComponent } from './candlestick-chart.component';
import { Subscription } from 'rxjs';

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
  private sub = new Subscription();

  constructor(
    private router: Router,
    private auth: AuthService,
    public md: MarketDataService
  ) {}

  ngOnInit(): void {
    this.sub.add(this.auth.pollStatus().subscribe(s => (this.authState = s)));
    this.sub.add(
      this.md.listTracked().subscribe(list => {
        this.instruments = list;
        const saved = localStorage.getItem('instruments');
        this.selected = saved ? JSON.parse(saved) : list;
        this.md.connect(this.selected);
      })
    );
  }

  onSelectionChange() {
    localStorage.setItem('instruments', JSON.stringify(this.selected));
    this.md.connect(this.selected);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.md.disconnect();
  }
}
