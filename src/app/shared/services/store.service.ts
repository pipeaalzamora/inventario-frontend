import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable, signal } from '@angular/core';
import { Store, StoresResponse, StoreWarehouse } from '@shared/models/store';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private authService = inject(AuthService);
  private router = inject(Router);

  public selectedStore = signal<Store | null>(null);
  public cantSelectStore = signal<boolean>(false);

  public stores = signal<Store[]>([]);

  constructor() {
    this.router.events.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this.cantSelectStore.set(false);
      })
    ).subscribe();
  }

  public async getStoresByCompanyId(companyId: Store['id']): Promise<void> {

    const response = await this.authService.authenticatedRequest<StoresResponse>(`stores/by-company/${companyId}`);

    if (!response.success || !response.data || !response.data.stores) return;

    this.selectedStore.set(response.data.stores[0]);

    this.stores.set(response.data.stores);
  }

  public resetSelectedStore(): void {
    this.selectedStore.set(null);
  }

  
  public async getWarehousesByStoreId(storeId: Store['id']): Promise<StoreWarehouse[] | null> {
    const response = await this.authService.authenticatedRequest<StoreWarehouse[]>(`warehouses/by-store/${storeId}`);
    //comentario para el commit
    if (!response.success || !response.data) return null;

    return response.data;
  }
}
