import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InstrumentHit {
  display: string;
  instrumentKey: string;
  segment: string;
  symbol: string;
  expiry?: string | number | null;
  strike?: number | null;
  optionType?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstrumentsService {
  private http = inject(HttpClient);
  private backendUrl = environment.backendUrl;

  search(q: string, limit = 20): Observable<InstrumentHit[]> {
    const trimmed = q.trim();
    if (!trimmed) {
      return of([]);
    }
    const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
    const url = `${this.backendUrl}/api/instruments/search?${params.toString()}`;
    return this.http
      .get<InstrumentHit[] | { hits: InstrumentHit[] }>(url)
      .pipe(map(res => (Array.isArray(res) ? res : res?.hits ?? [])));
  }
}
