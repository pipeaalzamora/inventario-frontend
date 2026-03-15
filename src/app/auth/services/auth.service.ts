import { ApiEmpty, ApiErrorResult, ApiResult, ApiSuccess, AuthResult, AuthState, ConfigState, CookieData, LoginResponse, Method, Power, PowerResponse, RecoveryData, RecoveryResponse, UserAccount, AuthRequestOptions } from '@/auth/models/auth';
import { ErrorService } from '@/shared/services/error.service';
import { Loading } from '@/shared/services/loading.service';
import { ToastService } from '@/shared/services/toast.service';
import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { FieldTree } from '@angular/forms/signals';
import { NavigationStart, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { filter, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private cookieService = inject(CookieService);
  private loadingService = inject(Loading);
  private errorService = inject(ErrorService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  private readonly api: string = environment.api;
  private beforeRedirectSegment: string | null = null;

  private authState = signal<AuthState>({
    isAuthenticated: false,
    token: null,
    powers: [],
    userAccount: null
  });

  private powersVar: string[] = [];

  private configState = signal<ConfigState>({
    menuOpen: true,
    recoveryData: null
  });

  public isAuthenticated = computed(() => this.authState().isAuthenticated);
  public userAccount = computed(() => this.authState().userAccount);
  public powers = computed(() => this.authState().powers);
  public token = computed(() => this.authState().token);
  public config = computed(() => this.configState());

  constructor() {
    this.initializeFromCookies();
    
    effect(() => {
      const auth = this.authState();

      if (auth.isAuthenticated && auth.token) {
        const cookieData: CookieData = {
          token: auth.token,
          user: auth.userAccount ?? null
        };
        this.cookieService.set('userData', JSON.stringify(cookieData), undefined, '/');
      }
    });

    effect(() => {
      const config = this.configState();
      this.cookieService.set('config', JSON.stringify(config), undefined, '/');
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationStart),
      tap(() => {
        if (this.token()) {
          const res = this.fetchPowers(this.token()!);

          if (res) {
            this.powersVar = this.processPowers(res);
          }
        }
      }),
      takeUntilDestroyed()
    ).subscribe();
  }

  private initializeFromCookies(): void {
    const defaultConfig: ConfigState = {
      menuOpen: true,
      recoveryData: null
    };

    try {
      const cookieConfig = this.cookieService.get('config');
      if (cookieConfig) {
        const parsedConfig = JSON.parse(cookieConfig);
        this.configState.set({ ...defaultConfig, ...parsedConfig });
      } else {
        this.configState.set(defaultConfig);
      }
    } catch (err) {
      this.configState.set(defaultConfig);
    }

    try {
      const userCookie = this.cookieService.get('userData');
      if (userCookie) {
        const parsedCookie: CookieData = JSON.parse(userCookie);
        
        this.loadBasicAuthDataFromCookie(parsedCookie);
      }
    } catch (err) {
      this.clearAuthState();
    }
  }

  private loadBasicAuthDataFromCookie(cookieData: CookieData): void {
    this.authState.set({
      isAuthenticated: true,
      token: cookieData.token,
      powers: [],
      userAccount: cookieData.user
    });

  }

  private createFetchOptions(
    method: Method = 'GET', 
    body?: any,  
    includeAuth: boolean = true,
    additionalHeaders?: Record<string, string>
  ): RequestInit {
    const baseHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    if (includeAuth) {
      const authHeaders = this.getHeaderToken();
      Object.assign(baseHeaders, authHeaders);
    }

    const options: RequestInit = {
      method,
      headers: baseHeaders
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return options;
  }

  private async makeRequest<T, K = void>(
    url: string, 
    method: Method = 'GET', 
    body?: any,
    includeAuth: boolean = true,
    form?: FormGroup | FieldTree<K>,
    additionalHeaders?: Record<string, string>,
    options?: AuthRequestOptions
  ): Promise<ApiResult<T>> {
    if (options?.skipLoading !== true) {
      this.loadingService.On();
    }

    try {

      const options = this.createFetchOptions(method, body, includeAuth, additionalHeaders);
      
      const response = await fetch(url, options);

      if (response.status === 401 && this.isAuthenticated()) {
        this.clearAuthState();

        this.toastService.info('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'Sesión expirada');
        return { type: 'error' } as ApiErrorResult;
      }

      if (response.status === 403) {
        this.errorService.launch403ErrorToast();
        return { type: 'error' } as ApiErrorResult;
      }

      if (response.status === 204) {
        return { 
            type: 'empty',
            success: true,
            data: null 
        } as ApiEmpty;
      } else if (response.status === 500) {
        this.errorService.launch500ErrorToast();
        return { type: 'error' } as ApiErrorResult;
      }

      const data = await response.json();

      if (!response.ok) {

        if (typeof form !== 'undefined') {
          this.errorService.validateParamErrorsGroup<K>(data, form);
        } else {
          this.errorService.validateParamErrorsGroup(data);
        }

        return { type: 'error' } as ApiErrorResult;
      }

      return { success: true, data, type: 'success' } as ApiSuccess<T>;

    } catch (error) {
      console.log(error);

      return { type: 'error' } as ApiErrorResult;

    } finally {
      if (options?.skipLoading !== true) {
        this.loadingService.Off();
      }
    }

  }

  private fetchPowers ( token: string ): Power[] | undefined {
    let Permisos: Power[] | undefined

    const xhr = new XMLHttpRequest();
    // xhr.withCredentials = true;

    xhr.open( "GET", this.api + '/auth/powers', false );
    xhr.setRequestHeader( 'Accept', 'application/json' )
    xhr.setRequestHeader( 'Content-Type', 'application/json' )
    xhr.setRequestHeader( "Authorization", "Bearer " + token );

    xhr.send();

    if ( xhr.status === 200 ) {
      const json = JSON.parse( xhr.responseText ) as PowerResponse;
      Permisos = json.powers;
    } else if ( xhr.status === 401 ) {
      this.clearAuthState();
    }

    return Permisos
  }

  private processPowers(powers: Power[]): string[] {
    return powers.map(power => power.powerName.toLowerCase());
  }

  private clearAuthState(): void {
    this.powersVar = [];

    this.authState.set({
      isAuthenticated: false,
      token: null,
      powers: [],
      userAccount: null
    });

    this.cookieService.delete('userData', '/');

    this.router.navigate(['login']);
  }

  public hasPower(power: string): boolean {
    return this.powersVar.includes(power.toLowerCase());
  }

  public canMatch(...powers: string[]): boolean {
    if (!this.isAuthenticated()) return false;
    if (powers.length === 0) return false;

    return powers.some(power => this.hasPower(power));
  }

  public getPowers(): string[] {
    return this.powersVar;
  }

  public hasAllPowers(...powers: string[]): boolean {
    if (!this.isAuthenticated()) return false;
    if (powers.length === 0) return false;

    return powers.every(power => this.hasPower(power));
  }

  public setBeforeRedirect(segment: string): void {
    this.beforeRedirectSegment = segment;
  }

  public getBeforeRedirect(): string | null {
    return this.beforeRedirectSegment;
  }

  public setRecoveryData(data: RecoveryData | null): void {
    this.configState.update(config => ({
      ...config,
      recoveryData: data
    }));
  }

  public getRecoveryData(): RecoveryData | null {
    return this.configState().recoveryData;
  }

  public getHeaderToken(): Record<string, string> {
    const token = this.token();
    return token ? { 'Authorization': `Bearer ${token}` } : { 'Authorization': '' };
  }

  public async login(loginForm: FormGroup): Promise<boolean> {

    try {
      const response = await this.makeRequest<LoginResponse>(
        `${this.api}/auth/login`,
        'POST',
        loginForm.getRawValue(),
        false,
        loginForm
      );

      if (response.type !== 'success' || !response.success || !response.data) return false;

      const powers = response.data.user.powers ? this.processPowers(response.data.user.powers) : [];

      const userAccount: Omit<UserAccount, 'userPassword' | 'powers'> | null = response.data.user ? {
        id: response.data.user.id,
        userEmail: response.data.user.userEmail,
        userName: response.data.user.userName,
        available: response.data.user.available,
        description: response.data.user.description,
        createdAt: response.data.user.createdAt,
        updatedAt: response.data.user.updatedAt,
        deletedAt: response.data.user.deletedAt,
        isNewAccount: response.data.user.isNewAccount
      } : null;

      this.authState.set({
        isAuthenticated: true,
        token: response.data.token,
        powers: powers,
        userAccount: userAccount
      });

      return true;

    } catch (error: unknown) {
      return false;

    }
  }

  public async logout(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.errorService.launch500ErrorToast();
      this.router.navigate(['/login']);
      return;
    }
    
    try {
      const response = await this.makeRequest(`${this.api}/auth/logout`, 'POST');


      if (response.type !== 'empty') return;


      this.toastService.success('Has salido de tu cuenta correctamente.', 'Sesión cerrada');

      this.clearAuthState();


    } catch (error: any) {
      return;
    }
  }

  public async getRecoveryPassword(recoveryForm: FormGroup): Promise<Date | null> {
    try {
      const response = await this.makeRequest<RecoveryResponse>(
        `${this.api}/auth/recovery`,
        'POST',
        recoveryForm.getRawValue(),
        false,
        recoveryForm
      );

      if (response.type !== 'success' || !response.success || !response.data) {
        return null;
      }

      return new Date(response.data.ttl);

    } catch (error: unknown) {
      return null;
    }
  }

  public async changePassword(newPassword: string, repeatPassword: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.api}/auth/change-password`,
        'POST',
        {
          newPassword: newPassword,
          oldPassword: repeatPassword
        }
      );

      if (response.type !== 'empty' || !response.success) {
        return false;
      }

      return true;

    } catch (error: any) {
      return false;

    }
  }

  public async changePasswordWithCode(form: FormGroup): Promise<boolean> {
    try {

      const body = form.getRawValue();

      const response = await this.makeRequest(
        `${this.api}/auth/change-password/recovery`,
        'POST',
        body,
        false
      );

      if (response.type !== 'empty' || !response.success) {
        return false;
      }

      return true;

    } catch (error: any) {
      return false;
    }
  }

  public async verifyCode(email: string, code: string): Promise<Date | null> {
    try {
      const response = await this.makeRequest<RecoveryResponse>(
        `${this.api}/auth/verify-code`,
        'POST',
        {
          userEmail: email,
          code: code
        },
        false
      );

      if (response.type !== 'success' || !response.success || !response.data) {
        return null;
      }

      return new Date(response.data.ttl);

    } catch (error: any) {
      return null;
    }
  }

  public async authenticatedRequest<T, K = void>(
    url: string, 
    method: Method = 'GET', 
    body?: any,
    form?: FormGroup | FieldTree<K>,
    additionalHeaders?: Record<string, string>,
    options?: AuthRequestOptions
  ): Promise<AuthResult<T>> {
    if (!this.isAuthenticated()) return { success: false, data: null };

    const realUrl = `${this.api}/${url}`;

    const response = await this.makeRequest<T, K>(realUrl, method, body, true, form, additionalHeaders, options);

    if (response.type === 'success' && response.success && response.data) {
      return { success: true, data: response.data } as AuthResult<T>;

    } else if (response.type === 'empty') {
      return { success: true, data: null } as AuthResult<T>;

    } else {
      return { success: false, data: null } as AuthResult<T>;
    }
  }

  public async authPaginatedRequest<T>(
    url:string,
    page: number = 1,
    size: number = 15,
    options?: AuthRequestOptions
  ): Promise<AuthResult<T>> {
    const paginatedUrl = `${url}?page=${page}&size=${size}`;

    return await this.authenticatedRequest<T>(paginatedUrl, 'GET', undefined, undefined, undefined, options);
  }
  
}