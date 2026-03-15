import { AuthService } from '@/auth/services/auth.service';
import { Company } from '@/shared/models/company';
import { inject, Injectable } from '@angular/core';
import { Count, CountDetail } from '@/inventory/models/count';
import { ToastService } from '@/shared/services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class CountService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() { }

  public async getCountDetailById(countId: string): Promise<CountDetail | null> {
    const response = await this.authService.authenticatedRequest<CountDetail>(`inventory-counts/${countId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getCounts(): Promise<Count[]> { 
    const response = await this.authService.authenticatedRequest<Count[]>('inventory-counts');

    if (!response.success || !response.data) return [];

    return response.data;
    //return {data: response.data.items, meta: response.data.metadata };
  }

  public async createCount(companyId: Company['id'], body: any): Promise<boolean> {
    const response = await this.authService.authenticatedRequest<CountDetail>(`inventory-counts/company/${companyId}`, 'POST', JSON.stringify(body));

    if (!response.success) return false;

    this.toastService.success('Conteo creado exitosamente');

    return true;
  }

  public async updateCount(countId: Count['id'], body: any): Promise<boolean> {
    const response = await this.authService.authenticatedRequest<CountDetail>(`inventory-counts/${countId}`, 'PUT', JSON.stringify(body));

    if (!response.success) return false;

    this.toastService.success('Conteo actualizado exitosamente');

    return true;
  }

  public async changeUser(countId: string, oldId: string | null, newId: string | null): Promise<Count | null> {
    const response = await this.authService.authenticatedRequest<Count>(
      `inventory-counts/new-assigned/${countId}`,
      'POST',
      JSON.stringify({ oldId, newId })
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Usuario asignado correctamente');

    return response.data;
  }

  public async changeDate(countId: string, newDate: Date): Promise<Count | null> {
    const response = await this.authService.authenticatedRequest<Count>(
      `inventory-counts/new-date/${countId}`,
      'POST',
      JSON.stringify({ newDate })
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Fecha de conteo actualizada correctamente');

    return response.data;
  }

  public async startCount(countId: string): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(
      `inventory-counts/start/${countId}`,
      'POST'
    );

    if (!response.success) return false;

    this.toastService.success('Conteo iniciado correctamente');

    return true;
  }

  public async saveDraft(countId: string, body: any): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(
      `inventory-counts/draft/${countId}`,
      'POST',
      JSON.stringify(body)
    );

    if (!response.success) return false;

    this.toastService.success('Borrador guardado correctamente');

    return true;
  }

  public async completeCount(countId: string, body: any): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(
      `inventory-counts/commit/${countId}`,
      'POST',
      JSON.stringify(body)
    );

    if (!response.success) return false;

    this.toastService.success('Conteo completado correctamente');

    return true;
  }

  public async cancelCount(countId: string): Promise<boolean> {
    const response = await this.authService.authenticatedRequest<boolean>(`inventory-counts/cancel/${countId}`,'POST');

    if (!response.success || !response.data) return false;

    this.toastService.success('Conteo cancelado correctamente');

    return true;
  }

  public async rejectCount(countId: string): Promise<Count | null> {
    const response = await this.authService.authenticatedRequest<Count>(`inventory-counts/reject/${countId}`,'POST');

    if (!response.success || !response.data) return null;

    this.toastService.success('Conteo rechazado correctamente');

    return response.data;
  }

  public async saveIncidence(countId: string, body: any[]): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(
      `inventory-counts/${countId}/incidence`,
      'POST',
      JSON.stringify(body)
    );

    if (!response.success) return false;

    this.toastService.success('Incidencia guardada correctamente');

    return true;
  }

}
