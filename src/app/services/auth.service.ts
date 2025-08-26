import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, timer, switchMap, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthState {
  ready: boolean;
  expiresInSec: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiBase = environment.apiBase;

  /** 1️⃣  ask the backend for the login-URL */
  getLoginUrl(): Observable<string> {
    return this.http.get<{ url: string }>(`${this.apiBase}/auth/url`).pipe(map(r => r.url));
  }

  /** 3️⃣  poll the backend every 15 s until it says `ready:true` */
  pollStatus(): Observable<AuthState> {
    return timer(0, 15000).pipe(
      switchMap(() => this.http.get<AuthState>(`${this.apiBase}/auth/status`)),
      shareReplay(1)
    );
  }
}
