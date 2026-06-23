import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { ToastService } from '@/shared/services/toast.service';

export type CompanyBranding = {
  companyId: string;
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  emailFromName: string;
  supportEmail: string | null;
  customDomain: string | null;
  subdomain: string | null;
  welcomeText: string | null;
  updatedAt: string | Date;
};

export type CompanyBrandingPayload = Omit<CompanyBranding, 'companyId' | 'updatedAt'>;

export type CompanyBrandingAsset = {
  id: string;
  companyId: string;
  assetType: 'logo' | 'favicon' | 'image';
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string | Date;
};

export type CompanyEmailTemplate = {
  id: string;
  companyId: string;
  templateKey: 'welcome' | 'recovery' | 'supplier_view';
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  updatedAt: string | Date;
};

export type CompanyImportJob = {
  id: string;
  companyId: string;
  importType: 'products' | 'suppliers' | 'inventory';
  fileName: string;
  fileUrl: string;
  mimeType: string;
  status: string;
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, string>[];
  mapping?: Record<string, string>;
  processedRows: number;
  failedRows: number;
  errors?: string[];
  executedAt?: string | Date | null;
  createdAt: string | Date;
};

@Injectable({ providedIn: 'root' })
export class CompanyBrandingService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  public async getBranding(companyId: string): Promise<CompanyBranding | null> {
    const response = await this.authService.authenticatedRequest<CompanyBranding>(`companies/${companyId}/branding`);
    if (!response.success || !response.data) return null;
    return response.data;
  }

  public async saveBranding(companyId: string, payload: CompanyBrandingPayload): Promise<CompanyBranding | null> {
    const response = await this.authService.authenticatedRequest<CompanyBranding>(
      `companies/${companyId}/branding`,
      'PUT',
      payload
    );
    if (!response.success || !response.data) return null;

    this.toastService.success('Configuración de marca guardada correctamente.');
    return response.data;
  }

  public async getAssets(companyId: string): Promise<CompanyBrandingAsset[]> {
    const response = await this.authService.authenticatedRequest<{ assets: CompanyBrandingAsset[] }>(`companies/${companyId}/branding/assets`);
    if (!response.success || !response.data) return [];
    return response.data.assets ?? [];
  }

  public async uploadAsset(companyId: string, assetType: CompanyBrandingAsset['assetType'], file: File): Promise<CompanyBrandingAsset | null> {
    const formData = new FormData();
    formData.append('assetType', assetType);
    formData.append('file', file);

    const response = await this.authService.authenticatedRequest<CompanyBrandingAsset>(
      `companies/${companyId}/branding/assets`,
      'POST',
      formData
    );
    if (!response.success || !response.data) return null;

    this.toastService.success('Archivo de marca cargado correctamente.');
    return response.data;
  }

  public async deleteAsset(companyId: string, assetId: string): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(
      `companies/${companyId}/branding/assets/${assetId}`,
      'DELETE'
    );
    if (!response.success) return false;

    this.toastService.success('Archivo eliminado correctamente.');
    return true;
  }

  public async getTemplates(companyId: string): Promise<CompanyEmailTemplate[]> {
    const response = await this.authService.authenticatedRequest<{ templates: CompanyEmailTemplate[] }>(`companies/${companyId}/branding/templates`);
    if (!response.success || !response.data) return [];
    return response.data.templates ?? [];
  }

  public async saveTemplate(companyId: string, template: CompanyEmailTemplate): Promise<CompanyEmailTemplate | null> {
    const response = await this.authService.authenticatedRequest<CompanyEmailTemplate>(
      `companies/${companyId}/branding/templates/${template.templateKey}`,
      'PUT',
      {
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText,
      }
    );
    if (!response.success || !response.data) return null;

    this.toastService.success('Plantilla guardada correctamente.');
    return response.data;
  }

  public async getImports(companyId: string): Promise<CompanyImportJob[]> {
    const response = await this.authService.authenticatedRequest<{ imports: CompanyImportJob[] }>(`companies/${companyId}/branding/imports`);
    if (!response.success || !response.data) return [];
    return response.data.imports ?? [];
  }

  public async uploadImport(companyId: string, importType: CompanyImportJob['importType'], file: File): Promise<CompanyImportJob | null> {
    const formData = new FormData();
    formData.append('importType', importType);
    formData.append('file', file);

    const response = await this.authService.authenticatedRequest<CompanyImportJob>(
      `companies/${companyId}/branding/imports`,
      'POST',
      formData
    );
    if (!response.success || !response.data) return null;

    this.toastService.success('Archivo importado para revisión.');
    return response.data;
  }

  public async executeImport(companyId: string, importId: string, mapping: Record<string, string>): Promise<CompanyImportJob | null> {
    const response = await this.authService.authenticatedRequest<CompanyImportJob>(
      `companies/${companyId}/branding/imports/${importId}/execute`,
      'POST',
      { mapping }
    );
    if (!response.success || !response.data) return null;

    this.toastService.success('Importación ejecutada correctamente.');
    return response.data;
  }
}
