import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ProgressItem {
  flag: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-progress-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-card.component.html',
  styleUrls: ['./progress-card.component.css']
})
export class ProgressCardComponent {
  @Input() data: ProgressItem[] = [];
}
