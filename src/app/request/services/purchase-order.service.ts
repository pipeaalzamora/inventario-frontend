import { AuthService } from '@/auth/services/auth.service';
import { Store } from '@/shared/models/store';
import { inject, Injectable } from '@angular/core';
import { NewPurchaseForm, PurchaseOrder, PurchaseOrderDetail, PurchaseResponseRequest, PurchasesOrderByRequest, PurchasesResponse } from '@/request/models/purchase-order';
import { ToastService } from '@/shared/services/toast.service';
import { ResponseWithMeta } from '@/auth/models/auth';

type PurchasePaginatedResponse = ResponseWithMeta<PurchaseOrder>;

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() { }

  public async getPurchaseByStoreId(storeId: Store['id']): Promise<PurchaseOrder[]> { 
    const response = await this.authService.authenticatedRequest<PurchasesResponse>(`purchases/by-store/${storeId}`);

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getPurchasesByStorePaginated(
    storeId: Store['id'], 
    page: number = 1, 
    size: number = 15
  ): Promise<PurchasePaginatedResponse | null> {
    const response = await this.authService.authPaginatedRequest<PurchasesResponse>(
      `purchases/by-store/${storeId}`,
      page,
      size
    );

    if (!response || !response.data) return null;

    return { data: response.data.items, meta: response.data.metadata };
  }

  public async getPurchaseById(purchaseId: string): Promise<PurchaseOrderDetail | null> { 
    const response = await this.authService.authenticatedRequest<PurchaseOrderDetail>(`purchases/${purchaseId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getPurchaseByRequestId(requestId: string): Promise<PurchasesOrderByRequest[]> { 
    const response = await this.authService.authenticatedRequest<PurchaseResponseRequest>(`purchases/by-request/${requestId}`);

    if (!response.success || !response.data) return [];

    return response.data.purchases;
  }

  public async aprovePurchase(purchaseId: string):Promise<PurchaseOrderDetail | null> {
    const response = await this.authService.authenticatedRequest<PurchaseOrderDetail>(`purchases/approve/${purchaseId}`, 'POST');

    if (!response.success || !response.data) return null;

    this.toastService.success('Orden de compra aprobada correctamente.')

    return response.data;
  }

  public async retryPurchase(purchaseId: string):Promise<boolean> {
    const response = await this.authService.authenticatedRequest(`purchases/retry/${purchaseId}`, 'POST');

    if (!response.success) return false;

    this.toastService.success('Orden de compra generada correctamente')

    return true;
  }

  public async cancelPurchase(purchaseId: string, observation = ''):Promise<PurchaseOrderDetail | null> {
    const response = await this.authService.authenticatedRequest<PurchaseOrderDetail>(`purchases/cancel/${purchaseId}`, 'POST', {observation});

    if (!response.success) return null;

    this.toastService.success('Orden de compra cancelada correctamente.')

    return response.data;
  }

  public async createPurchaseOrder(body: NewPurchaseForm): Promise<PurchaseOrderDetail | null> {
    const response = await this.authService.authenticatedRequest<PurchaseOrderDetail>('purchases', 'POST', body);

    if (!response.success) return null;

    this.toastService.success('Orden de compra creada correctamente.')

    return response.data;
  }
}
