import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CompanyService } from '@/shared/services/company.service';
import {
  CompanyBranding,
  CompanyBrandingAsset,
  CompanyBrandingPayload,
  CompanyBrandingService,
  CompanyEmailTemplate,
  CompanyImportJob,
} from './company-branding.service';

type ImportMappingField = {
  key: string;
  label: string;
  required: boolean;
};

@Component({
  selector: 'dot-company-branding',
  imports: [],
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingComponent {
  private companyService = inject(CompanyService);
  private brandingService = inject(CompanyBrandingService);

  protected selectedCompany = this.companyService.selectedCompany;
  protected branding = signal<CompanyBranding | null>(null);
  protected assets = signal<CompanyBrandingAsset[]>([]);
  protected templates = signal<CompanyEmailTemplate[]>([]);
  protected importJobs = signal<CompanyImportJob[]>([]);
  protected importType = signal<CompanyImportJob['importType']>('products');
  protected importMapping = signal<Record<string, string>>({});
  protected saving = signal(false);
  protected uploadingAsset = signal(false);
  protected importing = signal(false);
  protected executingImport = signal(false);

  protected canSave = computed(() => {
    const branding = this.branding();
    return !!branding?.appName.trim()
      && /^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)
      && /^#[0-9a-fA-F]{6}$/.test(branding.accentColor)
      && !!branding.emailFromName.trim();
  });

  protected activeImport = computed(() => this.importJobs()[0] ?? null);
  protected mappingFields = computed(() => this.fieldsForImport(this.activeImport()?.importType ?? this.importType()));
  protected canExecuteImport = computed(() => {
    const job = this.activeImport();
    if (!job || job.status === 'executed' || job.status === 'executed_with_errors') return false;
    const mapping = this.importMapping();
    return this.mappingFields()
      .filter(field => field.required)
      .every(field => !!mapping[field.key]);
  });

  constructor() {
    effect(() => {
      const company = this.selectedCompany();
      if (!company) return;
      void this.loadCompanyCustomization(company.id);
    });
  }

  protected update<K extends keyof CompanyBrandingPayload>(key: K, value: CompanyBrandingPayload[K]): void {
    this.branding.update(current => current ? { ...current, [key]: value } : current);
  }

  protected async save(): Promise<void> {
    const company = this.selectedCompany();
    const branding = this.branding();
    if (!company || !branding || !this.canSave()) return;

    this.saving.set(true);
    try {
      const updated = await this.brandingService.saveBranding(company.id, {
        appName: branding.appName,
        logoUrl: branding.logoUrl || null,
        faviconUrl: branding.faviconUrl || null,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        emailFromName: branding.emailFromName,
        supportEmail: branding.supportEmail || null,
        customDomain: branding.customDomain || null,
        subdomain: branding.subdomain || null,
        welcomeText: branding.welcomeText || null,
      });
      if (updated) this.branding.set(updated);
    } finally {
      this.saving.set(false);
    }
  }

  protected async uploadAsset(assetType: CompanyBrandingAsset['assetType'], event: Event): Promise<void> {
    const company = this.selectedCompany();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!company || !file) return;

    this.uploadingAsset.set(true);
    try {
      const asset = await this.brandingService.uploadAsset(company.id, assetType, file);
      if (!asset) return;

      this.assets.update(assets => [asset, ...assets]);
      if (asset.assetType === 'logo') {
        this.update('logoUrl', asset.fileUrl);
      }
      if (asset.assetType === 'favicon') {
        this.update('faviconUrl', asset.fileUrl);
      }
    } finally {
      input.value = '';
      this.uploadingAsset.set(false);
    }
  }

  protected async deleteAsset(asset: CompanyBrandingAsset): Promise<void> {
    const company = this.selectedCompany();
    if (!company) return;

    const deleted = await this.brandingService.deleteAsset(company.id, asset.id);
    if (!deleted) return;

    this.assets.update(assets => assets.filter(item => item.id !== asset.id));
    const current = this.branding();
    if (current?.logoUrl === asset.fileUrl) this.update('logoUrl', null);
    if (current?.faviconUrl === asset.fileUrl) this.update('faviconUrl', null);
  }

  protected updateTemplate<K extends keyof Pick<CompanyEmailTemplate, 'subject' | 'bodyHtml' | 'bodyText'>>(templateKey: CompanyEmailTemplate['templateKey'], key: K, value: CompanyEmailTemplate[K]): void {
    this.templates.update(templates => templates.map(template => template.templateKey === templateKey ? { ...template, [key]: value } : template));
  }

  protected async saveTemplate(template: CompanyEmailTemplate): Promise<void> {
    const company = this.selectedCompany();
    if (!company) return;

    const updated = await this.brandingService.saveTemplate(company.id, template);
    if (!updated) return;

    this.templates.update(templates => templates.map(item => item.templateKey === updated.templateKey ? updated : item));
  }

  protected async uploadImport(event: Event): Promise<void> {
    const company = this.selectedCompany();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!company || !file) return;

    this.importing.set(true);
    try {
      const job = await this.brandingService.uploadImport(company.id, this.importType(), file);
      if (job) {
        this.importJobs.update(jobs => [job, ...jobs]);
        this.importMapping.set(this.inferMapping(job));
      }
    } finally {
      input.value = '';
      this.importing.set(false);
    }
  }

  protected updateImportMapping(field: string, header: string): void {
    this.importMapping.update(mapping => ({ ...mapping, [field]: header }));
  }

  protected async executeImport(job: CompanyImportJob): Promise<void> {
    const company = this.selectedCompany();
    if (!company || !this.canExecuteImport()) return;

    this.executingImport.set(true);
    try {
      const updated = await this.brandingService.executeImport(company.id, job.id, this.importMapping());
      if (!updated) return;
      this.importJobs.update(jobs => jobs.map(item => item.id === updated.id ? updated : item));
      this.importMapping.set(updated.mapping && Object.keys(updated.mapping).length ? updated.mapping : this.inferMapping(updated));
    } finally {
      this.executingImport.set(false);
    }
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected templateLabel(key: CompanyEmailTemplate['templateKey']): string {
    const labels = {
      welcome: 'Bienvenida',
      recovery: 'Recuperación',
      supplier_view: 'Proveedor OC',
    };
    return labels[key];
  }

  private async loadCompanyCustomization(companyId: string): Promise<void> {
    const [branding, assets, templates, importJobs] = await Promise.all([
      this.brandingService.getBranding(companyId),
      this.brandingService.getAssets(companyId),
      this.brandingService.getTemplates(companyId),
      this.brandingService.getImports(companyId),
    ]);
    this.branding.set(branding);
    this.assets.set(assets);
    this.templates.set(templates);
    this.importJobs.set(importJobs);
    this.importMapping.set(importJobs[0]?.mapping && Object.keys(importJobs[0].mapping).length ? importJobs[0].mapping : importJobs[0] ? this.inferMapping(importJobs[0]) : {});
  }

  private fieldsForImport(importType: CompanyImportJob['importType']): ImportMappingField[] {
    if (importType === 'suppliers') {
      return [
        { key: 'supplierName', label: 'Nombre proveedor', required: true },
        { key: 'idFiscal', label: 'RUT/ID fiscal', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'fiscalName', label: 'Razón social', required: false },
        { key: 'countryId', label: 'País ID', required: false },
        { key: 'fiscalAddress', label: 'Dirección fiscal', required: false },
        { key: 'fiscalState', label: 'Región fiscal', required: false },
        { key: 'fiscalCity', label: 'Ciudad fiscal', required: false },
        { key: 'description', label: 'Descripción', required: false },
        { key: 'contactName', label: 'Contacto', required: false },
        { key: 'contactPhone', label: 'Teléfono', required: false },
      ];
    }

    if (importType === 'inventory') {
      return [
        { key: 'storeProductId', label: 'ID producto tienda', required: true },
        { key: 'warehouseId', label: 'ID bodega', required: true },
        { key: 'quantity', label: 'Cantidad', required: true },
        { key: 'costAvg', label: 'Costo promedio', required: false },
      ];
    }

    return [
      { key: 'name', label: 'Nombre producto', required: true },
      { key: 'sku', label: 'SKU', required: true },
      { key: 'description', label: 'Descripción', required: false },
      { key: 'costEstimated', label: 'Costo estimado', required: false },
      { key: 'image', label: 'URL imagen', required: false },
    ];
  }

  private inferMapping(job: CompanyImportJob): Record<string, string> {
    const headers = job.headers ?? [];
    const aliases: Record<string, string[]> = {
      name: ['name', 'nombre', 'producto', 'product_name'],
      sku: ['sku', 'codigo', 'código', 'code'],
      description: ['description', 'descripcion', 'descripción'],
      costEstimated: ['costestimated', 'cost_estimated', 'costo', 'costo_estimado'],
      image: ['image', 'imagen', 'url_imagen'],
      supplierName: ['suppliername', 'supplier_name', 'proveedor', 'nombre_proveedor'],
      idFiscal: ['idfiscal', 'id_fiscal', 'rut', 'ruc', 'tax_id'],
      email: ['email', 'correo', 'mail'],
      fiscalName: ['fiscalname', 'fiscal_name', 'razon_social', 'razón_social'],
      countryId: ['countryid', 'country_id', 'pais_id', 'país_id'],
      fiscalAddress: ['fiscaladdress', 'fiscal_address', 'direccion', 'dirección'],
      fiscalState: ['fiscalstate', 'fiscal_state', 'region', 'región'],
      fiscalCity: ['fiscalcity', 'fiscal_city', 'ciudad'],
      contactName: ['contactname', 'contact_name', 'contacto'],
      contactPhone: ['contactphone', 'contact_phone', 'telefono', 'teléfono'],
      storeProductId: ['storeproductid', 'store_product_id', 'producto_tienda_id'],
      warehouseId: ['warehouseid', 'warehouse_id', 'bodega_id'],
      quantity: ['quantity', 'cantidad', 'stock'],
      costAvg: ['costavg', 'cost_avg', 'costo_promedio'],
    };

    return this.fieldsForImport(job.importType).reduce<Record<string, string>>((acc, field) => {
      const match = headers.find(header => aliases[field.key]?.includes(this.normalizeHeader(header)));
      if (match) acc[field.key] = match;
      return acc;
    }, {});
  }

  private normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
  }
}
