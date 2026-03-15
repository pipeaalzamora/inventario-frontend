import { inject, Injectable } from '@angular/core';
import { CookieOptions, CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class Storage {

  private localStorage: any;
  private cookieService = inject(CookieService)
  private readonly cookieDefaults: CookieOptions = { path: '/', expires: 30 };

  constructor(
  ) {
    this.localStorage = window.localStorage;
  }

  getItem(key: string): boolean {
    return localStorage.getItem(key) === 'true'
  }

  setItem(key: string, value: boolean) {
    localStorage.setItem(key, value.toString())
  }

  public getCookie<T = any>(key: string): T | null {
    if (!this.cookieService.check(key)) return null;

    const raw = this.cookieService.get(key);

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.deleteCookieAcrossPaths(key);
      return null;
    }
  }

  public setCookie(key: string, value: any, expiresInDays: number = Number(this.cookieDefaults.expires)) {
    this.deleteCookieAcrossPaths(key);

    this.cookieService.set(
      key,
      JSON.stringify(value),
      {
        ...this.cookieDefaults,
        expires: expiresInDays
      }
    );
  }

  private deleteCookieAcrossPaths(key: string) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const paths = ['/', ...segments.map((_, index) => `/${segments.slice(0, index + 1).join('/')}`)];

    paths.forEach(path => this.cookieService.delete(key, path));
  }

  switchTheme() {
    document.body.classList.toggle('dark-mode');

    this.setItem('dark-mode', !this.getItem('dark-mode'));
  }

  getTheme() {
    return this.getItem('dark-mode');
  }

  // removeItem(key: string): void {
  //   this.localStorage.removeItem(this.#getKey(key));
  // }

  clear(): void {
    this.localStorage.clear();
  }

  Count(): number {
    return this.localStorage.length;
  }

  // hasKey(key: string): boolean {
  //   return this.localStorage.getItem(this.#getKey(key)) !== null;
  // }

  getKeys(): string[] {
    return Object.keys(this.localStorage);
  }

  getValues(): any[] {
    return Object.values(this.localStorage);
  }

  getAll(): { [key: string]: any } {
    return { ...this.localStorage };
  }
}
