import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthStatus {
  connected: boolean;
  expiresAt: string | null;
  remainingSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private backendUrl = environment.backendUrl;

  /** Ask the backend for the login URL */
  getLoginUrl(): Observable<string> {
    return this.http
      .get<{ url: string }>(`${this.backendUrl}/auth/url`)
      .pipe(map(r => r.url));
  }

  /** Fetch the current auth status */
  getStatus(): Observable<AuthStatus> {
    return this.http.get<AuthStatus>(`${this.backendUrl}/auth/status`);
  }
}
