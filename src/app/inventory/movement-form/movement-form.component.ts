import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DatepickerComponent } from '@/shared/components/datepicker/datepicker.component';
import { DropFileComponent } from '@/shared/components/drop-file/drop-file.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { DefaultSelectOption, SelectComponent } from '@/shared/components/select/select.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { BytesFormatPipe } from '@/shared/pipes/bytes-format.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { StoreService as SharedStoreService } from '@/shared/services/store.service';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal, untracked, viewChild } from '@angular/core';
import { NoImageComponent } from 'public/default/no-image.component';
import { InventoryService } from '@/inventory/services/inventory.service';
import { CompanyService } from '@/shared/services/company.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { NumericInputComponent } from '@/shared/components/numeric-input/numeric-input.component';
import { StoreService } from '@/my-company/store/services/store.service';
import { InventoryByWarehouse, InventoryProduct, InventoryProductToMovement } from '../models/inventory';
import { TabsComponent } from '@/shared/components/tabs/tabs.component';
import { NavigateService } from '@/shared/services/navigate.service';
import { ImageService, ImageConversionError } from '@/shared/services/image.service';
import { ToastService } from '@/shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '@/shared/components/input/input.component';

const controllerComponents = [
  FilterComponent,
  SearchBarComponent,
  PaginationComponent,
  SorterHeaderComponent,
  TableCaptionComponent
];

@Component({
  selector: 'dot-movement-form',
  imports: [
    controllerComponents,
    SectionWrapperComponent,
    GoBackComponent,
    NoImageComponent,
    NgTemplateOutlet,
    SelectComponent,
    DatepickerComponent,
    ModalComponent,
    DropFileComponent,
    InputDirective,
    DatePipe,
    BytesFormatPipe,
    InputDirective,
    MatExpansionModule,
    ClpCurrencyPipe,
    NumericInputComponent,
    TabsComponent,
    FormsModule,
    InputComponent,
    NumericInputComponent,
  ],
  templateUrl: './movement-form.component.html',
  styleUrl: './movement-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecreaseFormComponent implements OnDestroy {
  private sharedStoreService = inject(SharedStoreService);
  private storeService = inject(StoreService);
  private companyService = inject(CompanyService);
  private layoutService = inject(LayoutService);
  private inventoryService = inject(InventoryService);
  private navigateService = inject(NavigateService);
  private imageService = inject(ImageService);
  private toastService = inject(ToastService);

  private selectedStore = computed(() => this.sharedStoreService.selectedStore());

  private savedSelectedProducts = new Map<string, {}>();

  protected products = signal<InventoryProduct[]>([]);
  protected warehouses = signal<StoreWarehouse[]>([]);
  private observationValue = signal<string>('');
  protected selectedFile = signal<File | null>(null);
  protected selectedProducts = signal<InventoryProductToMovement[]>([]);
  protected selectedWarehouse = signal<StoreWarehouse | null>(null);
  protected selectedWastedKind = signal<string | null>(null);
  protected selectedInKind = signal<string | null>(null);
  protected selectedDate = signal<Date | null>(null);

  protected actualMode = signal<number>(0); // 0: IN, 1: OUT

  protected selectedCompany = this.companyService.selectedCompany;

  protected isMobile = computed(() => this.layoutService.isMobile());
  protected isLaptop = computed(() => this.layoutService.isLaptop());
  protected isDesktop = computed(() => this.layoutService.isDesktop());

  private handlePageSize = computed<number>(() => {
    if (this.isMobile()) return 5;
    else if (this.isLaptop()) return 6;
    else if (this.isDesktop()) return 10;
    else return 12;
  });

  private selectedProductsIds = computed<Set<string>>(() => new Set(this.selectedProducts().map(p => p.id)));
  protected totalDecreaseCost = computed<number>(() => {
    return this.selectedProducts().reduce((total, product) => {
      return total + (product.totals.avgCost * product.quantity);
    }, 0);
  });

  protected selectedFileBlob: string | null = null;

  // Incidence state
  protected selectedProductForIncidence = signal<InventoryProductToMovement | null>(null);
  private incidenceModal = viewChild<ModalComponent>('incidenceModal');
  protected incidenceObservation = signal<string>('');
  
  protected inventoryOutTypes: {label: string; value: string}[] = [
    { label: 'Merma', value: 'WASTE' },
  ];

  protected inventoryInTypes: {label: string; value: string}[] = [
    { label: 'Ingreso (manual)', value: 'in-manual' },
    { label: 'Compra (manual)', value: 'purchase-manual' },
  ];

  protected productDecreaseStates: {label: string; value: string}[] = [
    { label: 'Desecho', value: 'WASTE' },
    { label: 'Vencido', value: 'EXPIRED' }, 
    { label: 'Reacondicionado', value: 'refurbished' },
    { label: 'Otro', value: 'OTHER' },
  ];

  protected controller = new PaginationController<InventoryProduct>(this.products(), <PaginationControllerCFG>{
    defaultSearchColumns: ['productName', 'barcode'],
    pageSize: this.handlePageSize()
  });

  protected columns: ColumnDefinition[] = [
    { columnName: 'id', nameToShow: 'ID', type: 'string' },
    { columnName: 'productName', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'totals.currentStock', nameToShow: 'Stock', type: 'string' },
    { columnName: 'unitInventory.name', nameToShow: 'U. de inventario', type: 'string' },
  ]

  protected warehouseSearchBy: keyof StoreWarehouse = 'warehouseName';
  protected currentDate: Date = new Date();
  protected maxDate: Date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now

  protected CAN_EDIT_DATE = true; // TODO: Permisos

  constructor() {

    effect(() => {
      const store = this.selectedStore();

      if (!store) return;

      untracked(() => this.getWarehouses(store.id));
    });

    effect(() => {
      const selectedWarehouse = this.selectedWarehouse();

      if (!selectedWarehouse) return;

      untracked(() => this.getProducts(selectedWarehouse.id));
    })

    effect(() => this.controller.SetRawData(this.products()));

    effect(() => {
      const pageSize = this.handlePageSize();

      untracked(() => this.controller.SetPageSize(pageSize));
    });
  }

  private async getProducts(warehouseId: StoreWarehouse['id']): Promise<void> {
    const response = await this.inventoryService.getInventory(
      this.companyService.selectedCompany()?.id ?? '',
      this.selectedStore()?.id ?? '',
      [warehouseId]
    )

    if (!response) return;

    this.products.set(response[0]?.products ?? []);
  }

  protected async createDecrease(): Promise<void> {
    // Convertir imágenes a base64 para productos con incidencias
    const products = await Promise.all(
      Array.from(this.selectedProducts()).map(async (product) => {
        const productPayload: any = {
          storeProductId: product.id,
          quantity: product.quantity,
          reason: product.reason || '',
        };

        // Si hay incidencia con foto, convertir a base64
        if (product.incidencePhoto) {
          try {
            console.log(`=== DEBUG: Información del archivo original - ${product.productName} ===`);
            console.log('Nombre del archivo:', product.incidencePhoto.name);
            console.log('Tamaño del archivo (bytes):', product.incidencePhoto.size);
            console.log('Tamaño del archivo (MB):', (product.incidencePhoto.size / (1024 * 1024)).toFixed(2));
            console.log('Tipo MIME del archivo:', product.incidencePhoto.type);

            const base64Complete = await this.imageService.ConvertFileToBase64String(product.incidencePhoto, 2);
            
            console.log(`=== DEBUG: Base64 completo (con prefijo data:) - ${product.productName} ===`);
            console.log('Longitud del base64 completo:', base64Complete.length);
            console.log('Primeros 100 caracteres:', base64Complete.substring(0, 100));
            
            const mimeType = this.imageService.GetMimeTypeFromBase64(base64Complete);
            
            console.log(`=== DEBUG: MimeType extraído - ${product.productName} ===`);
            console.log('MimeType:', mimeType);
            
            const base64WithoutPrefix = this.imageService.GetBase64WithoutPrefix(base64Complete);

            console.log(`=== DEBUG: Base64 sin prefijo - ${product.productName} ===`);
            console.log('Longitud del base64 sin prefijo:', base64WithoutPrefix.length);
            console.log('Primeros 100 caracteres:', base64WithoutPrefix.substring(0, 100));
            console.log('Tamaño aproximado (MB):', ((base64WithoutPrefix.length * 3) / 4 / (1024 * 1024)).toFixed(2));
            console.log('Base64 sin prefijo (primeros 500 caracteres):', base64WithoutPrefix.substring(0, 500));

            productPayload.incidencias = {
              observaciones: product.incidenceObservation || '',
              imagen: base64WithoutPrefix,
              mimeType: mimeType || 'image/jpeg'
            };

            console.log(`=== DEBUG: Payload del producto - ${product.productName} ===`);
            console.log('Incidencia - Observaciones:', productPayload.incidencias.observaciones);
            console.log('Incidencia - Imagen (primeros 200 caracteres):', productPayload.incidencias.imagen.substring(0, 200));
            console.log('Incidencia - Imagen (últimos 100 caracteres):', productPayload.incidencias.imagen.substring(productPayload.incidencias.imagen.length - 100));
            console.log('Incidencia - Imagen (longitud total):', productPayload.incidencias.imagen.length);
            console.log('Incidencia - MimeType:', productPayload.incidencias.mimeType);
          } catch (error) {
            console.error(`=== DEBUG: Error en la conversión - ${product.productName} ===`);
            console.error('Error:', error);
            if (error instanceof ImageConversionError) {
              this.toastService.error(`Error en producto ${product.productName}: ${error.message}`);
            } else {
              this.toastService.error(`Error al procesar imagen del producto ${product.productName}`);
            }
            console.error('Error al convertir imagen:', error);
            // Continuar sin incidencia si hay error
          }
        }

        return productPayload;
      })
    );

    const body = {
      movedFrom: this.selectedWarehouse()?.id,
      movedTo: null,
      movedAt: this.selectedDate() ? this.selectedDate() : new Date(),
      outputKind: this.selectedWastedKind(),
      observation: this.observationValue(),
      products: products
    }

    console.log('=== DEBUG: Payload completo ===');
    console.log('Payload:', JSON.stringify(body, null, 2));
    console.log('Payload (objeto):', body);

    const response = await this.inventoryService.createInventoryOut(body);

    if (!response) return;

    this.navigateService.push('inventory');
  }

  private async getWarehouses(storeId: Store['id']): Promise<void> {
    const response = await this.storeService.getWarehouses(storeId);

    if (!response) return;

    this.warehouses.set(response);
    this.selectedWarehouse.set(response[0]);
  }

  protected selectProduct(product: any): void {

    if (this.isSelected(product.id)) {
      return this.removeProduct(product.id);
    }

    this.selectedProducts.update(current => [...current, { ...product, quantity: 1 }]);
  }

  protected removeProduct(productId: string): void {
    this.selectedProducts.update(current => {
      return current.filter(p => p.id !== productId);
    });
  }

  protected isSelected(productId: string): boolean {
    return this.selectedProductsIds().has(productId);
  } 

  protected decrement(product: any): void {
    if (!this.isSelected(product.id)) return;

    const newQuantity = product.quantity - 1;

    if (newQuantity < 1) return this.removeProduct(product.id);

    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.id === product.id) {
          return { ...p, quantity: newQuantity };
        } 

        return p;
      });
    });
  }

  protected increment(product: any): void {
    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.id === product.id) {
          return { ...p, quantity: p.quantity + 1 };
        }

        return p;
      });
    });
  }

  protected setDecreaseState(state: any  , selectedProduct: any): void {
    if (!state || !this.isSelected(selectedProduct.id)) return;

    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.id === selectedProduct.id) {
          return { ...p, decreaseState: state.value };
        }
        return p;
      });
    })
  }

  protected setProductObservation(event: Event, selectedProduct: any): void {
    if (!this.isSelected(selectedProduct.id)) return;

    const value = (event.target as HTMLInputElement).value;

    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.id === selectedProduct.id) {
          return { ...p, reason: value };
        }
        return p;
      });
    });
  }

  protected onChangeProductQuantity(selectedProduct: any, newQuantity: number): void {
    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.id === selectedProduct.id) {
          return { ...p, quantity: newQuantity };
        }

        return p;
      });
    });
  }

  protected onQuantityInputChange(selectedProduct: InventoryProductToMovement, value: number): void {
    //const value = (event.target as HTMLInputElement).valueAsNumber;
    const quantity = isNaN(value) ? 0 : Math.max(0, Math.min(value, selectedProduct.totals.currentStock));
    this.onChangeProductQuantity(selectedProduct, quantity);
  }

  protected decreaseQuantity(selectedProduct: InventoryProductToMovement): void {
    const newQuantity = Math.max(0, selectedProduct.quantity - 1);
    this.onChangeProductQuantity(selectedProduct, newQuantity);
  }

  protected increaseQuantity(selectedProduct: InventoryProductToMovement): void {
    const newQuantity = Math.min(selectedProduct.totals.currentStock, selectedProduct.quantity + 1);
    this.onChangeProductQuantity(selectedProduct, newQuantity);
  }

  protected handleBlur(event: Event, selectedProduct: any): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;

    if (value < 1 || isNaN(value)) return this.removeProduct(selectedProduct.id);
  }

  protected setProductReason(event: Event, selectedProduct: any): void {
    const value = (event.target as HTMLInputElement).value;
  }

  protected onFileUpload(file: FileList): void {
    if (!file.item(0)) return;

    if (!document.startViewTransition) {
      this.selectedFile.set(file.item(0));
    } else {
      document.startViewTransition(() => this.selectedFile.set(file.item(0)));
    }

    this.selectedFileBlob = URL.createObjectURL(file.item(0)!);
  }

  protected removeSelectedFile(): void {
    if (!this.selectedFile()) return;

    if (!document.startViewTransition) {
      this.selectedFile.set(null);
    } else {
      document.startViewTransition(() => this.selectedFile.set(null));
    }

    if (this.selectedFileBlob) {
      URL.revokeObjectURL(this.selectedFileBlob);
      this.selectedFileBlob = null;
    }
  }

  protected setObservationValue(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.observationValue.set(value);
  }

  protected setWastedKind(kind: DefaultSelectOption | null): void {
    this.selectedWastedKind.set(kind ? kind.value : null);
  }

  // Incidence methods
  protected openIncidenceModal(product: InventoryProductToMovement): void {
    // Obtener el producto actualizado del signal para asegurar que tenga los campos de incidencia
    const currentProduct = this.selectedProducts().find(p => p.id === product.id);
    this.selectedProductForIncidence.set(currentProduct || product);
    
    // Cargar la observación al signal
    const productToLoad = currentProduct || product;
    this.incidenceObservation.set(productToLoad.incidenceObservation || '');
    
    this.incidenceModal()?.openModal();
  }

  protected closeIncidenceModal(): void {
    this.selectedProductForIncidence.set(null);
    this.incidenceObservation.set('');
    this.incidenceModal()?.closeModal();
  }

  protected onProductIncidencePhotoSelected(product: InventoryProductToMovement, files: FileList): void {
    if (!files || files.length === 0) {
      this.clearProductIncidencePhoto(product);
      return;
    }

    const file = files[0];
    
    // Revoke previous preview URL if exists
    if (product.incidencePhotoPreview) {
      URL.revokeObjectURL(product.incidencePhotoPreview);
    }

    // Create new preview URL
    const previewUrl = URL.createObjectURL(file);
    
    this.selectedProducts.update(products => {
      const updatedProducts = products.map(p => 
        p.id === product.id 
          ? { ...p, incidencePhoto: file, incidencePhotoPreview: previewUrl }
          : p
      );
      
      // Actualizar también el producto en el modal si es el mismo
      const updatedProduct = updatedProducts.find(p => p.id === product.id);
      if (updatedProduct && this.selectedProductForIncidence()?.id === product.id) {
        this.selectedProductForIncidence.set(updatedProduct);
      }
      
      return updatedProducts;
    });
  }

  protected clearProductIncidencePhoto(product: InventoryProductToMovement): void {
    if (product.incidencePhotoPreview) {
      URL.revokeObjectURL(product.incidencePhotoPreview);
    }
    
    this.selectedProducts.update(products => {
      const updatedProducts = products.map(p => 
        p.id === product.id 
          ? { ...p, incidencePhoto: null, incidencePhotoPreview: null }
          : p
      );
      
      // Actualizar también el producto en el modal si es el mismo
      const updatedProduct = updatedProducts.find(p => p.id === product.id);
      if (updatedProduct && this.selectedProductForIncidence()?.id === product.id) {
        this.selectedProductForIncidence.set(updatedProduct);
      }
      
      return updatedProducts;
    });
  }

  protected setProductIncidenceObservation(event: Event, product: InventoryProductToMovement): void {
    const value = (event.target as HTMLInputElement).value;
    
    this.selectedProducts.update(products => {
      const updatedProducts = products.map(p => 
        p.id === product.id 
          ? { ...p, incidenceObservation: value }
          : p
      );
      
      // Actualizar también el producto en el modal si es el mismo
      const updatedProduct = updatedProducts.find(p => p.id === product.id);
      if (updatedProduct && this.selectedProductForIncidence()?.id === product.id) {
        this.selectedProductForIncidence.set(updatedProduct);
      }
      
      return updatedProducts;
    });
  }

  protected async saveProductIncidence(): Promise<void> {
    const product = this.selectedProductForIncidence();
    if (!product) return;

    // Obtener el producto actualizado del signal
    const currentProduct = this.selectedProducts().find(p => p.id === product.id);
    if (!currentProduct) return;

    if (!currentProduct.incidencePhoto) {
      this.toastService.error('Debe adjuntar una foto de evidencia');
      return;
    }

    try {
      // Validar y convertir imagen a base64 (se guardará en el producto)
      const base64Complete = await this.imageService.ConvertFileToBase64String(currentProduct.incidencePhoto, 2);
      
      // Actualizar el producto con la observación del signal
      const observation = this.incidenceObservation();
      this.selectedProducts.update(products => {
        return products.map(p => 
          p.id === product.id 
            ? { ...p, incidenceObservation: observation }
            : p
        );
      });
      
      // La conversión fue exitosa, la foto ya está almacenada en el producto
      // El base64 se generará al enviar el formulario
      this.toastService.success('Incidencia guardada correctamente');
      this.closeIncidenceModal();
    } catch (error) {
      if (error instanceof ImageConversionError) {
        this.toastService.error(error.message);
      } else {
        this.toastService.error('Error al procesar la imagen. Por favor, intente nuevamente.');
        console.error('Error al guardar incidencia:', error);
      }
    }
  }

  protected setIncidenceObservation(observation: string | number): void {
    this.incidenceObservation.set(observation as string);
  }

  // Método para verificar si tiene incidencia (foto u observación)
  protected hasIncidence(product: InventoryProductToMovement): boolean {
    const hasPhoto = !!(product.incidencePhoto || product.incidencePhotoPreview);
    const hasObservation = !!(product.incidenceObservation && product.incidenceObservation.trim() !== '');
    return hasPhoto || hasObservation;
  }

  // Método para obtener el texto del badge de incidencia según el estado
  protected getIncidenceBadgeText(product: InventoryProductToMovement): string {
    const hasPhoto = !!(product.incidencePhoto || product.incidencePhotoPreview);
    const hasObservation = !!(product.incidenceObservation && product.incidenceObservation.trim() !== '');

    if (hasPhoto && hasObservation) {
      return 'Foto y Observación adjuntada';
    } else if (hasPhoto) {
      return 'Foto adjuntada';
    } else if (hasObservation) {
      return 'Solo observación';
    }

    return 'Foto adjuntada'; // Por defecto, aunque no debería llegar aquí si hasIncidence es true
  }

  // Método para obtener la clase CSS del badge de incidencia según el estado
  protected getIncidenceBadgeClass(product: InventoryProductToMovement): string {
    const text = this.getIncidenceBadgeText(product);
    if (text === 'Solo observación') {
      return 'incidence-status-text observation-only';
    } else if (text === 'Foto y Observación adjuntada') {
      return 'incidence-status-text full-incidence';
    }
    return 'incidence-status-text photo-only';
  }

  // Método para verificar si tiene foto de incidencia
  protected hasIncidencePhotoForIcon(product: InventoryProductToMovement): boolean {
    return !!(product.incidencePhoto || product.incidencePhotoPreview);
  }

  ngOnDestroy(): void {
    if (this.selectedFileBlob) {
      URL.revokeObjectURL(this.selectedFileBlob);
    }
    
    // Limpiar previews de imágenes de incidencias de productos
    this.selectedProducts().forEach(product => {
      if (product.incidencePhotoPreview) {
        URL.revokeObjectURL(product.incidencePhotoPreview);
      }
    });
  }

  //////////////////
  /// OUTPUT TAB ///
  //////////////////

  protected handleTabChange(indexes: number[]): void {
    const [prevTabIndex, newTabIndex] = indexes;

    this.savedSelectedProducts.set(`tab-${prevTabIndex}`, this.selectedProducts());

    this.selectedProducts.set(this.savedSelectedProducts.get(`tab-${newTabIndex}`) as InventoryProductToMovement[] || []);

    this.actualMode.set(newTabIndex);
  }

  protected setInKind(kind: DefaultSelectOption | null): void {
    this.selectedInKind.set(kind ? kind.value : null);
  }

  protected async createIn(): Promise<void> {
    const body = {
      movedFrom: null,
      movedTo: this.selectedWarehouse()?.id,
      movedAt: this.selectedDate() ? this.selectedDate() : new Date(),
      inputKind: this.selectedInKind(),
      observation: this.observationValue(),
      products: Array.from(this.selectedProducts()).map(product => ({
        storeProductId: product.id,
        quantity: product.quantity,
        reason: product.reason || ''
      }))
    }

    const response = await this.inventoryService.createInventoryIn(body);

    if (!response) return;

    this.navigateService.push('inventory');
  }

  protected handleSubmit(): void {
    if (this.actualMode() === 0) {
      this.createIn();
      return;
    }

    this.createDecrease();
  }
}
