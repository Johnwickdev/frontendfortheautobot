import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { WatchlistService, WatchlistEntry } from '../../services/watchlist.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent {
  readonly items$: Observable<WatchlistEntry[]>;

  constructor(private watchlist: WatchlistService, private router: Router) {
    this.items$ = this.watchlist.items$;
  }

  openChart(item: WatchlistEntry) {
    this.router.navigate(['/chart', item.instrumentKey]);
  }

  remove(item: WatchlistEntry, event: MouseEvent) {
    event.stopPropagation();
    this.watchlist.remove(item.instrumentKey);
  }
}
