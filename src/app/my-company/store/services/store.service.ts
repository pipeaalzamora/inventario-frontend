import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable, signal } from '@angular/core';
import { Store, StoresResponse, StoreWarehouse, WarehouseRecipe } from '@/shared/models/store';
import { CompanyService } from '@/shared/services/company.service';
import { SupplierDetail, SupplierResume } from '@/my-company/supplier/models/supplier';
import { FieldTree } from '@angular/forms/signals';
import { CompanyProduct } from '@/shared/models/products';
import { Product, StoreProductFront } from '@/system/services/product.service';
import { ToastService } from '@/shared/services/toast.service';

export type SupplierWithSelection = SupplierResume & {
  isSelected: boolean;
};

export type SupplierResumeResponse = {
  items: SupplierResume[];
};

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cs = inject(CompanyService);

  public stores = signal<Store[]>([]);
  constructor() { }

  public async getSuppliers(): Promise<SupplierWithSelection[]> {
    const selectedCompany = this.cs.selectedCompany();
    if (!selectedCompany) return [];

    const response = await this.authService.authenticatedRequest<SupplierResumeResponse>(
      `suppliers`,
      'GET'
    );

    if (!response.success || !response.data) return [];

    return response.data.items.map(supplier => ({
      ...supplier,
      isSelected: false,
    }));
  }
  
  public async getStores(companyId: string): Promise<Store[] | null> {
    const response = await this.authService.authenticatedRequest<StoresResponse>(
      `stores/by-company/${companyId}`,
      'GET'
    );

    if (!response.success || !response.data) return null;

    this.stores.set(response.data.stores);
    return response.data.stores;
  }

  
  public async getStoreById(id: string): Promise<Store | null> {
    const response = await this.authService.authenticatedRequest<Store>(
      `stores/${id}`,
      'GET'
    );

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async createStore<T>(storeForm: FieldTree<T>): Promise<Store | null> {
    const selectedCompany = this.cs.selectedCompany();

    if (!selectedCompany) return null;

    const prebody = storeForm().value() as any;
    
    const body = {
      companyId: selectedCompany.id,
      name: prebody.storeName,
      description: prebody.description || '',
      address: prebody.storeAddress || '',
      costCenter: prebody.idCostCenter || '',
    };

    const response = await this.authService.authenticatedRequest<Store, T>(
      'stores/create',
      'POST',
      body,
      storeForm,
    );

    if (!response.success) {
      return null;
    }

    if (!response.data) return null;

    await this.getStores(selectedCompany.id);
    
    return response.data;
  }

  public async updateStore<T>(id: string, storeForm: FieldTree<T>): Promise<Store | null> {
    const prebody = storeForm().value() as any;
      
    const body = {
      name: prebody.storeName,
      description: prebody.description || '',
      address: prebody.storeAddress,
      costCenter: prebody.idCostCenter,
    };
  
    const response = await this.authService.authenticatedRequest<Store, T>(
      `stores/${id}`,
      'POST',
      body,
      storeForm,
    );

    if (!response.success) {
      return null;
    }

    if (!response.data) return null;

    this.stores.update(stores => 
      stores.map(s => s.id === id ? response.data! : s)
    );
    
    return response.data;
  }

  public async updateStoreSuppliers(id: string, supplierIds: string[]): Promise<Store | null> {
    const body = {
      supplierIds: supplierIds
    };

    const response = await this.authService.authenticatedRequest<Store>(
      `stores/${id}/suppliers`,
      'POST',
      body
    );

    if (!response.success) {
      return null;
    }

    if (!response.data) return null;

    this.stores.update(stores => 
      stores.map(s => s.id === id ? response.data! : s)
    );
    
    return response.data;
  }

  public async createWarehouse<T>(storeId: string, warehouseForm: FieldTree<T>): Promise<StoreWarehouse | null> {
    const selectedCompany = this.cs.selectedCompany();
    if (!selectedCompany) return null;

    const formValue = warehouseForm().value() as any;
    
    const body: WarehouseRecipe = {
      companyId: selectedCompany.id,
      storeId: storeId,
      warehouseName: formValue.warehouseName,
      description: formValue.description || '',
      warehouseAddress: formValue.warehouseAddress,
    };

    const response = await this.authService.authenticatedRequest<StoreWarehouse, T>(
      `warehouses/by-store/${storeId}`,
      'POST',
      body,
      warehouseForm,
    );

    if (!response.success) return null;
    if (!response.data) return null;

    return response.data;
  }

  public async updateWarehouse<T>(storeId: string, warehouseId: string, warehouseForm: FieldTree<T>): Promise<StoreWarehouse | null> {
    const selectedCompany = this.cs.selectedCompany();
    if (!selectedCompany) return null;

    const formValue = warehouseForm().value() as any;
    
    const body: WarehouseRecipe = {
      companyId: selectedCompany.id,
      storeId: storeId,
      warehouseName: formValue.warehouseName,
      description: formValue.description || '',
      warehouseAddress: formValue.warehouseAddress,
    };

    const response = await this.authService.authenticatedRequest<StoreWarehouse, T>(
      `warehouses/by-store/${storeId}/${warehouseId}`,
      'PATCH',
      body,
      warehouseForm,
    );

    if (!response.success) return null;
    if (!response.data) return null;

    return response.data;
  }

  public async getWarehouses(storeId: string) : Promise<StoreWarehouse[]>{
    const response = await this.authService.authenticatedRequest<StoreWarehouse[]>(
      `warehouses/by-store/${storeId}`,
      'GET'
    );

    if (!response.success || !response.data) return [];

    return response.data;
  }

  public async getProductsForRequest(storeId: string, ) : Promise<CompanyProduct[]>{
    const response = await this.authService.authenticatedRequest<CompanyProduct[]>(
      `store-products/${storeId}/suppliers`,
      'GET'
    );

    if (!response.success || !response.data) return [];

    return response.data;
  }

  public async getProducts(storeId: string, ) : Promise<CompanyProduct[]>{
    const response = await this.authService.authenticatedRequest<CompanyProduct[]>(
      `store-products/${storeId}`,
      'GET'
    );

    if (!response.success || !response.data) return [];

    return response.data;
  }

  public async getStoreProductById(storeId: string, storeProductId: string) : Promise<CompanyProduct | null>{
    const response = await this.authService.authenticatedRequest<CompanyProduct>(
      `store-products/${storeId}/${storeProductId}`,
      'GET'
    );

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getProductAllData(companyId: string, productId: string) : Promise<Product | null>{
    const response = await this.authService.authenticatedRequest<Product>(
      `products/ps/${companyId}/${productId}`,
      'GET'
    );

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async createStoreProduct<T>(
    companyId: string,
    storeId: string,
    product: StoreProductFront, 
    productForm: FieldTree<T>,
    selectedUnitId: number,
    selectedUnitsMatrixIds: { unitId: number; factor: number }[],
    quantities: { minimalStock: number; maximalStock: number; maxQuantity: number }
  ): Promise<CompanyProduct | null> {
    const formValue = productForm().value();

    const suppliers = [];

    for (const [key, value] of Object.entries(product.selectedSuppliers)) {
      if (!value) continue;

      suppliers.push({
        supplierId: value.id,
        priority: Number(key) + 1,
      });
    }
    
    const body = {
      ...formValue,
      quantities,
      productId: product.id,
      companyId: companyId,
      storeId: storeId,
      unitInventoryId: selectedUnitId,
      unitMatrix: selectedUnitsMatrixIds,
      suppliers,
    };

    const response = await this.authService.authenticatedRequest<CompanyProduct, T>(
      `store-products/${storeId}`,
      'POST',
      body,
      productForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Producto creado exitosamente');

    return response.data;
  }

  public async updateStoreProduct<T>(
    companyId: string,
    storeId: string,
    product: StoreProductFront, 
    productForm: FieldTree<T>,
    selectedUnitId: number,
    selectedUnitsMatrixIds: { unitId: number; factor: number }[],
    quantities: { minimalStock: number; maximalStock: number; maxQuantity: number }
  ): Promise<CompanyProduct | null> {
    const formValue = productForm().value();

    const suppliers = [];

    for (const [key, value] of Object.entries(product.selectedSuppliers)) {
      if (!value) continue;
      suppliers.push({
        supplierId: value.id,
        priority: Number(key) + 1,
      });
    }
    const body = {
      ...formValue,
      quantities,
      productId: product.id,
      companyId: companyId,
      storeId: storeId,
      unitInventoryId: selectedUnitId,
      unitMatrix: selectedUnitsMatrixIds,
      suppliers,
    };

    const response = await this.authService.authenticatedRequest<CompanyProduct, T>(
      `store-products/${storeId}/${product.id}`,
      'POST',
      body,
      productForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Producto actualizado exitosamente');

    return response.data;
  }
}