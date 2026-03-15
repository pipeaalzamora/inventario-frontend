import { AuthService } from '@/auth/services/auth.service';
import { effect, inject, Injectable, signal } from '@angular/core';
import { CompaniesResponse, Company } from '@shared/models/company';
import { StoreService } from './store.service';
import { Storage } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private authService = inject(AuthService);
  private storeService = inject(StoreService);
  private storageService = inject(Storage);

  public companies = signal<Company[]>([]);

  public selectedCompany = signal<Company | null>(null);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.selectedCompany.set(this.storageService.getCookie('selectedCompany'));
    }

    effect(() => {
      if (!this.authService.isAuthenticated()) return;

      const selectedCompany = this.selectedCompany();

      if (!selectedCompany) return;

      this.storageService.setCookie('selectedCompany', selectedCompany);

      this.storeService.resetSelectedStore();
      this.storeService.getStoresByCompanyId(selectedCompany.id);
    })

    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.getAllCompanies();
      }
    })
  }

  public async getAllCompanies(): Promise<void> {
    const response = await this.authService.authenticatedRequest<CompaniesResponse>('companies');

    if (!response.success || !response.data) return;

    if (!this.selectedCompany()) {
      this.selectedCompany.set(response.data.companies[0]);
    }

    this.companies.set(response.data.companies);
  }
}
