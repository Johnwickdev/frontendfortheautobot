import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { LineCardComponent } from './components/line-card/line-card.component';
import { ProgressCardComponent } from './components/progress-card/progress-card.component';
import { TableCardComponent } from './components/table-card/table-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, KpiCardComponent, LineCardComponent, ProgressCardComponent, TableCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  sidebarCollapsed = false;

  kpis = [
    { title: 'Total income', value: '$348,261', delta: '+1.25%', positive: true, gradient: true },
    { title: 'Total users', value: '15,708.98', delta: '-5.38%', positive: false, gradient: false },
    { title: 'Total revenue', value: '7,415.644', delta: '', positive: true, gradient: false },
    { title: 'Total conversion', value: '10.87%', delta: '+25.45%', positive: true, gradient: false }
  ];

  progress = [
    { flag: '🇺🇸', label: 'United States', value: 85 },
    { flag: '🇯🇵', label: 'Japan', value: 70 },
    { flag: '🇮🇩', label: 'Indonesia', value: 45 },
    { flag: '🇰🇷', label: 'South Korea', value: 38 }
  ];

  transactions = [
    { product: 'Macbook Pro M3', category: 'Laptop', amount: '$2,400', date: 'Oct 21, 2024', status: 'Processing', assignee: 'sam@apex.com' },
    { product: 'iPhone 15 Pro', category: 'Phone', amount: '$1,299', date: 'Oct 21, 2024', status: 'Success', assignee: 'jane@apex.com' },
    { product: 'AirPods Max', category: 'Headphones', amount: '$549', date: 'Oct 20, 2024', status: 'Declined', assignee: 'tom@apex.com' },
    { product: 'Surface Book', category: 'Laptop', amount: '$2,100', date: 'Oct 18, 2024', status: 'Processing', assignee: 'anna@apex.com' },
    { product: 'PlayStation 5', category: 'Console', amount: '$499', date: 'Oct 16, 2024', status: 'Success', assignee: 'joe@apex.com' },
    { product: 'Dell Monitor', category: 'Monitor', amount: '$299', date: 'Oct 15, 2024', status: 'Processing', assignee: 'lisa@apex.com' }
  ];

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
