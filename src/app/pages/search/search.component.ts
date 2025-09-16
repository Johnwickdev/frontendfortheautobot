import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InstrumentsService, InstrumentHit } from '../../services/instruments.service';
import { WatchlistService } from '../../services/watchlist.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  query = signal('');
  loading = signal(false);
  hits = signal<InstrumentHit[]>([]);
  touched = signal(false);
  limit = signal(20);
  feedback = signal<string | null>(null);

  constructor(private instruments: InstrumentsService, private watchlist: WatchlistService) {}

  ngOnInit(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const stored = sessionStorage.getItem('instrument.search.last');
    if (stored) {
      this.query.set(stored);
      this.performSearch();
    }
  }

  readonly canSearch = computed(() => this.query().trim().length >= 2 && !this.loading());

  performSearch() {
    const term = this.query().trim();
    this.touched.set(true);
    this.feedback.set(null);
    if (term.length < 2) {
      this.hits.set([]);
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('instrument.search.last', term);
    }
    this.loading.set(true);
    this.instruments.search(term, this.limit()).subscribe({
      next: hits => {
        this.hits.set(hits);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.feedback.set('Unable to fetch instruments. Please try again.');
      }
    });
  }

  addToWatchlist(hit: InstrumentHit) {
    this.watchlist.add({
      instrumentKey: hit.instrumentKey,
      display: hit.display,
      symbol: hit.symbol,
      segment: hit.segment,
      expiry: hit.expiry,
      strike: hit.strike,
      optionType: hit.optionType
    });
    this.feedback.set(`${hit.display} added to watchlist`);
  }

  alreadyAdded(hit: InstrumentHit) {
    return this.watchlist.exists(hit.instrumentKey);
  }
}
