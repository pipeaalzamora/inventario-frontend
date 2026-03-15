import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { InventoryByWarehouse, InventoryProduct, ProductMovements, TransferRequest } from '../models/inventory';
import { ToastService } from '@/shared/services/toast.service';
import { RequestResponse } from '@/shared/models/apiResponse';
import { CompanyService } from '@/shared/services/company.service';
import { StoreService } from '@/shared/services/store.service';


@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private companyService = inject(CompanyService);
  private storeService = inject(StoreService)

  constructor() { }

  public async createInventoryOut(body: any): Promise<any | null> {
    const selectedStoreId=this.storeService.selectedStore()?.id;
    const selectedCompanyId=this.companyService.selectedCompany()?.id;
    body.storeId=selectedStoreId;
    body.companyId=selectedCompanyId;
    const response = await this.authService.authenticatedRequest<any>(`product-movements/new-output`, 'POST', JSON.stringify(body));

    if (!response.success || !response.data) return null;

    this.toastService.success('Salida de inventario creada con éxito.');

    return response.data;
  }

  public async createInventoryIn(body: any): Promise<any | null> {
    const selectedStoreId=this.storeService.selectedStore()?.id;
    const selectedCompanyId=this.companyService.selectedCompany()?.id;
    body.storeId=selectedStoreId;
    body.companyId=selectedCompanyId;
    const response = await this.authService.authenticatedRequest<any>(`product-movements/new-input`, 'POST', JSON.stringify(body));

    if (!response.success || !response.data) return null;

    this.toastService.success('Entrada de inventario creada con éxito.');

    return response.data;
  }
  
  public async getInventory(companyId: string, storeId: string, warehousesIds: string[]): Promise<InventoryByWarehouse[]> {
    const response = await this.authService.authenticatedRequest<InventoryByWarehouse[]>(
      `inventory/${companyId}/${storeId}`,
      'POST',
      JSON.stringify({ warehousesId: warehousesIds })
    );

    if (!response.success || !response.data) return [];

  return response.data;
 }

 public async getInventoryProduct(companyId: string, storeId: string, warehouseId: string, productId: string): Promise<InventoryProduct | null> {
  const response = await this.authService.authenticatedRequest<InventoryProduct>(
    `inventory/${companyId}/${storeId}/${warehouseId}/${productId}`,
  );

  if (!response.success || !response.data) return null;

  return response.data;
 }

 public async getProductMovements(storeId: string, storeProductId: string): Promise<ProductMovements[]> {
  const response = await this.authService.authPaginatedRequest<RequestResponse<ProductMovements>>(`product-movements/store/${storeId}/product/${storeProductId}`);

  if (!response.success || !response.data) return [];

  return response.data.items;
 }

 public async createTransfer(companyId: string, storeId: string, transfer: TransferRequest): Promise<boolean> {
  // TODO: Implementar endpoint real
  console.log('Transfer request:', { companyId, storeId, transfer });
  this.toastService.info('Funcionalidad de transferencia de inventario en desarrollo.');
  return true;
 }
}
