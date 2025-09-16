import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface WatchlistEntry {
  instrumentKey: string;
  display: string;
  symbol?: string;
  segment?: string;
  expiry?: string | number | null;
  strike?: number | null;
  optionType?: string | null;
}

const STORAGE_KEY = 'autobot.watchlist.v1';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  private readonly itemsSubject = new BehaviorSubject<WatchlistEntry[]>(this.load());

  readonly items$ = this.itemsSubject.asObservable();

  getAll() {
    return this.itemsSubject.value;
  }

  exists(instrumentKey: string) {
    return this.itemsSubject.value.some(item => item.instrumentKey === instrumentKey);
  }

  add(entry: WatchlistEntry) {
    if (this.exists(entry.instrumentKey)) {
      return;
    }
    const next = [...this.itemsSubject.value, entry];
    this.persist(next);
  }

  remove(instrumentKey: string) {
    const next = this.itemsSubject.value.filter(item => item.instrumentKey !== instrumentKey);
    this.persist(next);
  }

  clear() {
    this.persist([]);
  }

  private persist(items: WatchlistEntry[]) {
    this.itemsSubject.next(items);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('Failed to persist watchlist', err);
      }
    }
  }

  private load(): WatchlistEntry[] {
    if (!this.isBrowser) {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item?.instrumentKey === 'string');
      }
    } catch (err) {
      console.warn('Failed to read watchlist', err);
    }
    return [];
  }
}
