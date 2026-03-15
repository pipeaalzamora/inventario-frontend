import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { ExtendedSupplier, Supplier, SupplierProduct, SupplierProductsResponse, SupplierResponse } from '@self-contained-pages/outside-supplier/models/supplier';
import { Store } from '@/shared/models/store';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private authService = inject(AuthService);

  constructor() { }

  public async getSuppliers(): Promise<Supplier[]> {
    const response = await this.authService.authenticatedRequest<SupplierResponse>('suppliers');

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getProductsBySupplierId(supplierId: Supplier['id'], storeId: Store['id']): Promise<SupplierProduct[] | null> {
    const response = await this.authService.authenticatedRequest<SupplierProductsResponse>(
      `suppliers/products/${supplierId}/by-store/${storeId}`
    );

    if (!response.success || !response.data) return null;

    return response.data.items;
  }

  public async getSuppliersByCompanyId(companyId: string): Promise<ExtendedSupplier[]> {
    const response = await this.authService.authenticatedRequest<{suppliers: ExtendedSupplier[]}>(
      `companies/${companyId}/suppliers`
    );

    if (!response.success || !response.data) return [];

    return response.data.suppliers;
  }
}
