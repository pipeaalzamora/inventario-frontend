import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastService } from '@/shared/services/toast.service';
import { AuthService } from '@/auth/services/auth.service';
import { environment } from '@env/environment';
import { ErrorService } from '@/shared/services/error.service';
import { SupplierDetail } from '@/my-company/supplier/models/supplier';

type CreateProduct = Omit<Product, 'id'>;

// Definir la interfaz si no está ya en un archivo compartido
export interface ProductTemplate {
  id: string;
  imageUrl: string;
  stock: number;
  unit: string;
  productName: string;
  sku: string;
  estimatedCost: number;
  description: string;
  categories: string[];
  codes: string[];
  isSaleEnabled: boolean;
}

export type CategoryForm = {
  name: string;
  description: string;
  available: boolean;
}


export interface Category {
  id: number;
  name: string;
  description?: string;
  available?: boolean;
}

export interface CodeType{
  id: number;
  name: string;
  description: string;
}

export interface Code {
  id: number;
  name: string;
  value: string;
}

export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  isNewImage: boolean;
  categories: Category[];
  codes: Code[];
  suppliers: SupplierDetail[];
  sku: string;
  estimatedCost?: number;
}

export type StoreProductFront = Omit<Product, 'suppliers'> & {
  availableSuppliers: SupplierDetail[];
  selectedSuppliers: SupplierDetail[];
}

export interface ProductHandle {
  id: string;
  name: string;
  image: File | null;
  description: string;
  categories: number[];
  codes: Code[];
}





export interface ProductManagement {
  id: string;
  sku: string;
  nombreProducto: string;
  description: string;
  costoEstimado: number;
  costoPromedio: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private errorService = inject(ErrorService);

  private readonly apiUrl = environment.api;


  constructor() { }
 


  
  public async getAllCategories(): Promise<Category[]> {
    const response = await this.authService.authenticatedRequest<any>('products/categories');
    return response?.data ?? [];
  }

  public async createCategory(categoryData: CategoryForm): Promise<Category | null> {
    const response = await this.authService.authenticatedRequest<Category>(
      'products/categories',
      'POST',
      categoryData
    );
    
    if (!response.success || !response.data) {
      this.toastService.error('Error al crear la categoría');
      return null;
    }
    
    this.toastService.success('Categoría creada exitosamente');
    return response.data;
  }
 
  public async getCodeTypes(): Promise<CodeType[]> {
    const response = await this.authService.authenticatedRequest<any>('products/codes');
    return response?.data ?? [];
  }

  public async getAllProductsTemplate(): Promise<Product[]> {
    const response = await this.authService.authenticatedRequest<any>('products');
    const items = response?.data?.items ?? [];
    return items.map((p: any) => {
      const codes = (p.codes ?? []).map((c: any) => ({
        ...c,
        name: c?.name ?? c?.kind?.name ?? '',
      }));
      // Buscar el campo SKU en diferentes variantes
      const sku = p.sku || p.SKU || p.productSku || p.codigo || p.code || '';
      return {
        ...p,
        codes,
        sku
      } as Product;
    });
} 

  public async getProduct(productId: string): Promise<Product | null> {
    const response = await this.authService.authenticatedRequest<Product>(`products/p/${productId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async createProduct(form: FormGroup): Promise<Product | null> {
    const body = form.getRawValue();
    const formdata = new FormData();
    formdata.append('name', body.name);
    formdata.append('description', body.description);
    formdata.append('sku', body.sku || '');
    if (body.image) {
      formdata.append('image', body.image);
    }

    if (body.categoryIds && Array.isArray(body.categoryIds)) {
      body.categoryIds.forEach((id: number) => {
        formdata.append('categoryIds', String(id));
      });
    }
    formdata.append('codes', JSON.stringify(body.codes || []));

    const headers = this.authService.getHeaderToken();
    
    const response = await fetch(`${this.apiUrl}/products`, {
      method: 'POST',
      headers: headers,
      body: formdata
    });
    const data = await response.json();
    if (!response.ok) {
      this.errorService.validateParamErrorsGroup(data, form);
      return null;
    }
    this.toastService.success('Producto creado exitosamente');
    return data;
  }

  public async updateProduct(productId: string, form: FormGroup, isNewImage: boolean): Promise<Product | null> {
    const body = form.getRawValue();
    const formdata = new FormData();

    formdata.append('name', body.name);
    formdata.append('description', body.description);
    formdata.append('sku', body.sku || '');
    formdata.append('isNewImage', String(isNewImage));
    if (body.image) {
      formdata.append('image', body.image);
    }
    if (body.categoryIds && Array.isArray(body.categoryIds)) {
      body.categoryIds.forEach((id: number) => {
        formdata.append('categoryIds', String(id));
      });
    }
    formdata.append('codes', JSON.stringify(body.codes || []));
    const response = await fetch(`${this.apiUrl}/products/${productId}`, {
      method: 'POST',
      headers: this.authService.getHeaderToken(),
      body: formdata
    });
    const data = await response.json();
    if (!response.ok) {
      this.errorService.validateParamErrorsGroup(data, form);
      return null;
    }
    this.toastService.success('Producto actualizado exitosamente');
    return data;
  }

  // public async deleteProduct(productId: string): Promise<boolean> {
  //   const response = await this.authService.authenticatedRequest<any>(`products/${productId}`, 'DELETE');

  //   if(!response || !response.success) {
  //     this.toastService.error('Error al eliminar el producto');
  //     return false;
  //   }

  //   this.toastService.success('Producto eliminado exitosamente');
  //   return true;
  // }



  //metodo para listar gestión de productos
  public async getProductsByCompany(companyId: string): Promise<any[]> {
    const endpoint = `products-company/by-company/${companyId}`;
    const response = await this.authService.authenticatedRequest<any>(endpoint);
    return response?.data.items ?? [];
  }


  //metodo para obtener el id de la compañia a la que pertenece un producto
  // public getProductCompanyId(productId: string): Promise<any | null> {

  // }

  public async createProductManagement(productData: any): Promise<any | null> {
    // Nota: 'products/management' es una suposición. Usa la URL correcta de tu API.
    const endpoint = 'products/management'; 
    
    // El 'body' es el objeto que ya construiste en el componente.
    // El servicio solo necesita enviarlo.
    return this.authService.authenticatedRequest<any>(endpoint, 'POST', productData);
  }
}