import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TradeRow {
  time: string;
  price: string;
  change: string;
  up: boolean;
  amount: string;
  fee: string;
  hash: string;
}

@Component({
  selector: 'app-trade-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-history.component.html',
  styleUrls: ['./trade-history.component.css']
})
export class TradeHistoryComponent {
  @Input() rows: TradeRow[] = [];
}
