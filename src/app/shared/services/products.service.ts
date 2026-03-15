import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable} from '@angular/core';
import { ProductRestricted, ProductRestrictedReponse, ProductTemplate, WarehouseProduct } from '@shared/models/products';
import { Store } from '@shared/models/store';
import { RequestResponse } from '@shared/models/apiResponse';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private authService = inject(AuthService);

  constructor() {}

  public async getAllRestrictedProducts(storeId: Store['id']): Promise<ProductRestricted[]> {
    const response = await this.authService.authenticatedRequest<ProductRestrictedReponse>(
      `products/${storeId}/request-restriction`
    );

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getProductsByWarehouseId(warehouseId: string): Promise<WarehouseProduct[]> {
    const response = await this.authService.authenticatedRequest<RequestResponse<WarehouseProduct>>(
      `inventory/products/${warehouseId}`
    );

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getProductsTemplate(): Promise<ProductTemplate[]> {
    const response = await this.authService.authenticatedRequest<RequestResponse<ProductTemplate>>(`products`);

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getPaginatedProductsTemplate(
    page: number = 1, 
    size: number = 15
  ): Promise<RequestResponse<ProductTemplate[]> | null> {

    const response = await this.authService.authPaginatedRequest<RequestResponse<ProductTemplate[]>>(`products`, page, size);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getCompanyProducts(companyId: string): Promise<any[]> {
    const response = await this.authService.authenticatedRequest<any>(`products-company/by-company/${companyId}`);

    if (!response.success || !response.data) return [];

    return response.data.items;
  }
}
