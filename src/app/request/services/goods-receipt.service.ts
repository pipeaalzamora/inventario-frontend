import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { Receipt, ReceiptAllResponse, ReceiptDetail, ReceiptPost, ReceiptResponse } from '@/request/models/receipt';
import { ToastService } from '@/shared/services/toast.service';
import { environment } from '@env/environment';
import { Store } from '@/shared/models/store';
import { ResponseWithMeta } from '@/auth/models/auth';

type ReceiptPaginatedResponse = ResponseWithMeta<Receipt>;

@Injectable({
  providedIn: 'root'
})
export class GoodsReceiptService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private readonly baseUrl = environment.api;

  constructor() { }

  public async getGoodsReceiptByStore(storeId: Store['id']): Promise<Receipt[]> {
    const response = await this.authService.authenticatedRequest<ReceiptAllResponse>(`delivery-purchase-notes/by-store/${storeId}`);

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async getGoodsReceiptByStorePaginated(
    storeId: Store['id'], 
    page: number = 1, 
    size: number = 15
  ): Promise<ReceiptPaginatedResponse | null> {
    const response = await this.authService.authPaginatedRequest<ReceiptResponse>(
      `delivery-purchase-notes/by-store/${storeId}`,
      page,
      size
    );

    if (!response || !response.data) return null;

    return { data: response.data.items, meta: response.data.metadata };
  }

  public async getDetailGoodsReceipt(receiptId: string): Promise<ReceiptDetail | null> {
    const response = await this.authService.authenticatedRequest<ReceiptDetail>(`delivery-purchase-notes/${receiptId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async confirmReceipt(purchaseInfo: ReceiptPost): Promise<ReceiptDetail | null> {
    const response = await this.authService.authenticatedRequest<ReceiptDetail>(
      'delivery-purchase-notes', 
      'POST',
      JSON.stringify(purchaseInfo)
    );

    if (!response.success) return null;

    this.toastService.success('Recepción creada con éxito');

    return response.data;
  }

  public async fixDifferences(receiptId: string): Promise<ReceiptDetail | null> {
    const response = await this.authService.authenticatedRequest<ReceiptDetail>(
      `delivery-purchase-notes/${receiptId}/fix`,
      'POST'
    );

    if (!response.success) return null;

    this.toastService.success('Diferencias corregidas con éxito');
    return response.data;
  }

  public async uploadFiles(receiptId: string, formData: FormData, type: 'guide' | 'invoice' | 'other'): Promise<ReceiptDetail | null> {

    const response = await fetch(`${this.baseUrl}/delivery-purchase-notes/${receiptId}/file?type=${type}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...this.authService.getHeaderToken()
      }
    })

    if (!response.ok) {
      this.toastService.error('Ocurrió un error al intentar subir los documentos');
      return null;
    };

    this.toastService.success('Documentos subidos con éxito');

    return response.json();
  }

  public async deleteFile(receiptId: string, fileId: string): Promise<ReceiptDetail | null> {
    const response = await this.authService.authenticatedRequest<ReceiptDetail>(
      `delivery-purchase-notes/${receiptId}/file/${fileId}`,
      'DELETE'
    );

    if (!response.success) {
      this.toastService.error('Ocurrió un error al intentar eliminar el documento');
      return null;
    }

    this.toastService.success('Documento eliminado con éxito');
    return response.data;
  }

  public async completeReceipt(receiptId: string, body: any): Promise<ReceiptDetail | null> {
    const response = await this.authService.authenticatedRequest<ReceiptDetail>(
      `delivery-purchase-notes/${receiptId}/complete`,
      'POST',
      JSON.stringify(body)
    );

    if (!response.success) return null;

    this.toastService.success('Recepción completada con éxito');
    return response.data;
  }
}
