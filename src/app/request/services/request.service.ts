import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { Request, RequestDetail, RequestPayload, RequestResponse } from '@/request/models/request';
import { Store } from '@/shared/models/store';
import { ToastService } from '@/shared/services/toast.service';
import { ResponseWithMeta } from '@/auth/models/auth';

type RequestPaginatedResponse = ResponseWithMeta<Request>;

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() { }

  public async getAllRequest(storeId: Store['id']): Promise<Request[] | null> {
    const response = await this.authService.authenticatedRequest<RequestResponse>(`inventory-requests/by-store/${storeId}`);
    
    if (!response || !response.data) return null;

    return response.data.items;
  }

  public async getRequestByPagination(
    storeId: Store['id'], 
    page: number = 1, 
    size: number = 15
  ): Promise<RequestPaginatedResponse | null> {

    const response = await this.authService.authPaginatedRequest<RequestResponse>(
      `inventory-requests/by-store/${storeId}`,
      page,
      size
    );

    if (!response || !response.data) return null;

    return { data: response.data.items, meta: response.data.metadata };
  }

  public async getRequest(requestId: Request['id']): Promise<RequestDetail | null> {
    const response = await this.authService.authenticatedRequest<RequestDetail>(`inventory-requests/${requestId}`);
    
    if (!response || !response.data) return null;

    return response.data;
  }

  public async createRequest(request: RequestPayload): Promise<RequestDetail | null> {

    const response = await this.authService.authenticatedRequest<RequestDetail>(
      'inventory-requests',
      'POST',
      request
    );

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      text: 'Solicitud creada con exito'
    });

    return response.data;
  }

  public async editRequest(requestId: Request['id'], request: RequestPayload): Promise<Request | null> {
    const response = await this.authService.authenticatedRequest<Request>(`inventory-requests/${requestId}`, 'PUT', JSON.stringify(request));

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      text: 'Solicitud actualizada con exito'
    });

    return response.data;
  }

  public async rejectRequest(
    requestId: Request['id'],
    observation?: string
  ): Promise<Request | null> {

    const body = JSON.stringify({ observation });

    const response = await this.authService.authenticatedRequest<Request>(
      `inventory-requests/${requestId}/reject`,
      'PATCH',
      body
    );

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      text: 'Estado de solicitud rechazada con exito'
    });

    return response.data;
  }

  public async cancelRequest(
    requestId: Request['id'],
    observation?: string
  ): Promise<Request | null> {

    const body = JSON.stringify({ observation });

    const response = await this.authService.authenticatedRequest<Request>(
      `inventory-requests/${requestId}/cancel`,
      'PATCH',
      body
    );

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      text: 'Estado de solicitud cancelada con exito'
    });

    return response.data;
  }

  public async approveRequest(requestId: Request['id'] ,payload: RequestPayload):Promise<Request | null> {
    const body = JSON.stringify(payload);

    const response = await this.authService.authenticatedRequest<Request>(
      `inventory-requests/${requestId}/approve`,
      'PUT',
      body
    );

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      text: 'Solicitud aprobada con exito'
    });

    return response.data;
  }
}
