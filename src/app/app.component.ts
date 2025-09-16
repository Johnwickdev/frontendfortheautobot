import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  styleUrls: ['./app.component.css'],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" routerLink="/watchlist">Autobot</a>
        <nav class="nav-links">
          <a routerLink="/search" routerLinkActive="active">Search</a>
          <a routerLink="/watchlist" routerLinkActive="active">Watchlist</a>
          <a routerLink="/chart/NSE_EQ%7CAXISBANK" routerLinkActive="active">Sample Chart</a>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/login" routerLinkActive="active">Login</a>
        </nav>
      </header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AppComponent {}
