import { inject, Injectable } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { map, Observable, timer, switchMap, shareReplay } from 'rxjs';

export interface AuthState {
  ready: boolean;
  expiresInSec: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** 1️⃣  ask the backend for the login-URL */
  getLoginUrl(): Observable<string> {
    return this.http.get<{ url: string }>('/auth/url').pipe(map(r => r.url));
  }

  /** 2️⃣  send the `code` that the user pasted */
  exchange(code: string): Observable<void> {
    return this.http.post<void>(`/auth/exchange?code=${code}`, null);
  }

  /** 3️⃣  poll the backend every 3 s until it says `ready:true` */
  pollStatus(): Observable<AuthState> {
    return timer(0, 3000).pipe(
      switchMap(() => this.http.get<AuthState>('/auth/status')),
      shareReplay(1)                       // every subscriber sees the same value
    );
  }
}
