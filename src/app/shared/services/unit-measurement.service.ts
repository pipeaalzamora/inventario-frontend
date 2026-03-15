import { AuthService } from '@/auth/services/auth.service';
import { UnitMatrix, UnitMeasure } from '../models/units';
import { inject, Injectable } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

@Injectable({
  providedIn: 'root',
})
export class UnitMeasurementService {
  private authService = inject(AuthService);

  constructor() {}

  public async getUnitMeasurement(): Promise<UnitMeasure[] | null> {
    const response = await this.authService.authenticatedRequest<UnitMeasure[]>('measurements');
    if (!response.success || !response.data) return null;
    return response.data;
  }
  public async getUnitCategories(): Promise<string[]> {
    const response = await this.authService.authenticatedRequest<string[]>('measurements/categories');
    if (!response.success || !response.data) return [];
    return response.data;
  }

  public async createUnitMeasurement<T>(unitForm: FieldTree<T>): Promise<UnitMeasure | null> {
    const formValue = unitForm().value();
    const response = await this.authService.authenticatedRequest<UnitMeasure, T>('measurements/create', 'POST', formValue, unitForm);

    if (!response.success || !response.data) return null;
    return response.data;
  }

  public async getUnitsByMainUnit(unitId: number): Promise<UnitMatrix[]> {
    const response = await this.authService.authenticatedRequest<UnitMatrix[]>(`measurements/${unitId}/related`);

    if (!response.success || !response.data) return [];

    return response.data;
  }

}
