import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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
  private apiBase = environment.apiBase;

  search(q: string, limit = 20): Observable<InstrumentHit[]> {
    const params = new HttpParams({ fromObject: { q, limit } });
    return this.http
      .get<InstrumentHit[] | { hits: InstrumentHit[] }>(`${this.apiBase}/api/instruments/search`, { params })
      .pipe(map(res => (Array.isArray(res) ? res : res?.hits ?? [])));
  }
}
