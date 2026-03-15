import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { BulkPriceFromBack, Contact, CreationContact, QuickProductPriceChange, SupplierCreation, SupplierDetail, SupplierProductFromBack, SupplierResume, SupplierUpdate } from '@/my-company/supplier/models/supplier';
import { ToastService } from '@/shared/services/toast.service';
import { RequestResponse } from '@/shared/models/apiResponse';
import { SupplierProductFormPriceInt } from '@/shared/models/products';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() { }

  public async getSupplierById(supplierId: string): Promise<SupplierDetail | null> {
    const response = await this.authService.authenticatedRequest<SupplierDetail>(`suppliers/${supplierId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getAll(): Promise<SupplierResume[]> {
    const response = await this.authService.authenticatedRequest<RequestResponse<SupplierResume>>('suppliers');

    if (!response.success || !response.data) return [];

    return response.data.items;
  }

  public async createSupplier<T>(supplierForm: FieldTree<T>, contacts: CreationContact[]): Promise<SupplierDetail | null> {
    const body = supplierForm().value() as SupplierCreation;

    for (const contact of contacts) {
      delete contact.id;
    }

    body.contacts = contacts;
    
    const response = await this.authService.authenticatedRequest<SupplierDetail, T>(
      'suppliers',
      'POST',
      JSON.stringify(body),
      supplierForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Proveedor creado correctamente.')

    return response.data;
  }

  public async updateSupplier<T>(supplierId: string, supplierForm: FieldTree<T>, contacts: Contact[]): Promise<SupplierDetail | null> {
    const body = supplierForm().value() as SupplierUpdate;

    body.contacts = contacts;

    const response = await this.authService.authenticatedRequest<SupplierDetail, T>(
      `suppliers/${supplierId}`, 
      'POST', 
      JSON.stringify(body),
      supplierForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Proveedor actualizado correctamente.')

    return response.data;
  }

  public async addContactToExistentSupplier<T>(supplier: SupplierDetail, contactForm: FieldTree<T>, newContact: Contact): Promise<SupplierDetail | null> {

    const body: any = {
      ...supplier,
      contacts: [...supplier.contacts, newContact],
      fiscalName: supplier.fiscalData.fiscalName,
      email: supplier.fiscalData.email,
      fiscalAddress: supplier.fiscalData.fiscalAddress,
      fiscalCity: supplier.fiscalData.fiscalCity,
      fiscalState: supplier.fiscalData.fiscalState,
      idFiscal: supplier.fiscalData.idFiscal,
    }

    delete body.fiscalData;

    const response = await this.authService.authenticatedRequest<SupplierDetail, T>(
      `suppliers/${supplier.id}`, 
      'POST', 
      JSON.stringify(body),
      contactForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Contacto agregado correctamente.');

    return response.data;
  }

  public async editContactOfExistentSupplier<T>(supplier: SupplierDetail, contactForm: FieldTree<T>, updatedContact: Contact): Promise<SupplierDetail | null> {

    const body: any = {
      ...supplier,
      contacts: supplier.contacts.map(contact => contact.id === updatedContact.id ? updatedContact : contact),
      fiscalName: supplier.fiscalData.fiscalName,
      email: supplier.fiscalData.email,
      fiscalAddress: supplier.fiscalData.fiscalAddress,
      fiscalCity: supplier.fiscalData.fiscalCity,
      fiscalState: supplier.fiscalData.fiscalState,
      idFiscal: supplier.fiscalData.idFiscal,
    }
    delete body.fiscalData;

    const response = await this.authService.authenticatedRequest<SupplierDetail, T>(
      `suppliers/${supplier.id}`, 
      'POST', 
      JSON.stringify(body),
      contactForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Contacto actualizado correctamente.');

    return response.data;
  }

  public async createSupplierProduct<T>(supplierId: string, productForm: FieldTree<T>, newProduct: SupplierProductFormPriceInt): Promise<SupplierDetail | null> {
    const response = await this.authService.authenticatedRequest<SupplierDetail, T>(
      `suppliers/products/${supplierId}/add`, 
      'POST', 
      JSON.stringify(newProduct),
      productForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Producto creado correctamente.')

    return response.data;
  }

  public async editSupplierProduct<T>(supplierId: string, productForm: FieldTree<T>, newProduct: SupplierProductFormPriceInt & { id?: string }): Promise<SupplierProductFromBack | null> {

    newProduct.productId = newProduct.id!;

    const response = await this.authService.authenticatedRequest<SupplierProductFromBack, T>(
      `suppliers/products/${supplierId}/update`, 
      'POST', 
      JSON.stringify(newProduct),
      productForm,
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Producto actualizado correctamente.')

    return response.data;
  }

  public async deleteSupplierProduct(supplierId: string, productId: string): Promise<SupplierProductFromBack | null> {
    const response = await this.authService.authenticatedRequest<SupplierProductFromBack>(
      `suppliers/products/${supplierId}/${productId}`,
      'DELETE',
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Producto eliminado correctamente.');

    return response.data;
  }

  public async bulkPriceUpdate(supplierId: string, products: QuickProductPriceChange[]): Promise<BulkPriceFromBack[] | null> {

    const body: BulkPriceFromBack[] = products.map(product => { 
      return {
        productId: product.productId,
        price: product.newPrice
      }
    });

    const response = await this.authService.authenticatedRequest<BulkPriceFromBack[]>(
      `suppliers/products/${supplierId}/prices`, 
      'POST', 
      JSON.stringify(body),
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Precios actualizados correctamente.')

    return response.data;
  }

  public async getUnitsMeasures(): Promise<any[] | null> {
    const response = await this.authService.authenticatedRequest<any[]>('measurements');

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getAllByCompanyID(companyId: string): Promise<any[]> {
    const response = await this.authService.authenticatedRequest<{ suppliers: any[] }>(
      `companies/${companyId}/suppliers`
    );

    if (!response.success || !response.data) return [];

    return response.data.suppliers || [];
  }

  public async assignSuppliersToCompany(
    companyId: string, 
    supplierIds: string[]
  ): Promise<any[] | null> {
    const body = {
      supplierIds
    };

    const response = await this.authService.authenticatedRequest<{ suppliers: any[] }>(
      `companies/${companyId}/suppliers`,
      'POST',
      JSON.stringify(body)
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Proveedores asignados a la empresa correctamente.');

    return response.data.suppliers || [];
  }

  public async unassignSupplierFromCompany(companyId: string, supplierId: string): Promise<any[] | null> {
    const response = await this.authService.authenticatedRequest<{ suppliers: any[] }>(
      `companies/${companyId}/suppliers/${supplierId}`,
      'DELETE'
    );

    if (!response.success || !response.data) return null;

    this.toastService.success('Proveedor desasignado de la empresa correctamente.');

    return response.data.suppliers || [];
  }
}
