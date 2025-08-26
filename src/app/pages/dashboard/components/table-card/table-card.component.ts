import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Transaction {
  product: string;
  category: string;
  amount: string;
  date: string;
  status: string;
  assignee: string;
}

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-card.component.html',
  styleUrls: ['./table-card.component.css']
})
export class TableCardComponent {
  @Input() data: Transaction[] = [];
}
