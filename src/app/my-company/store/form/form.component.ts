import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { LayoutService } from '@/shared/services/layout.service';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { ToastService } from '@/shared/services/toast.service';
import { StoreService} from '@/my-company/store/services/store.service';
import { StoreService as StoreSharedService } from '@/shared/services/store.service';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { NgOptimizedImage, NgTemplateOutlet, SlicePipe} from '@angular/common';
import { AuthService } from '@/auth/services/auth.service';
import { Field, form, minLength, required, validate, readonly } from '@angular/forms/signals';
import { ErrorService } from '@/shared/services/error.service';
import { InputComponent } from '@/shared/components/input/input.component';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { ProductsService } from '@/shared/services/products.service';
import { CompanyProduct, ProductTemplate } from '@/shared/models/products';
import { SupplierDetail} from '@/my-company/supplier/models/supplier';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { SelectComponent } from "@/shared/components/select/select.component";
import { NoImageComponent } from 'public/default/no-image.component';
import { UnitMatrix, UnitMeasure } from '@/shared/models/units';
import { StoreProductFront } from '@/system/services/product.service';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { UnitMeasurementService } from '@/shared/services/unit-measurement.service';
import { MatTooltip } from "@angular/material/tooltip";

const CONTROLLER_COMPONENTS = [
  SearchBarComponent,
  PaginationComponent,
  TableCaptionComponent,
  SorterHeaderComponent,
  FilterComponent
];

@Component({
  selector: 'dot-store-form',
  imports: [
    InputComponent,
    GoBackComponent,
    SectionWrapperComponent,
    ModalComponent,
    SearchBarComponent,
    PaginationComponent,
    NgTemplateOutlet,
    CONTROLLER_COMPONENTS,
    CdkDrag,
    CdkDropList,
    ClpCurrencyPipe,
    SelectComponent,
    NgOptimizedImage,
    NoImageComponent,
    Field,
    LoadingDirective,
    SlicePipe,
    MatTooltip
],
  templateUrl: './form.component.html',
  styleUrl: './form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreFormComponent {
  private layoutService = inject(LayoutService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private storeService = inject(StoreService);
  private storeSharedService = inject(StoreSharedService);
  private authService = inject(AuthService);
  private productsService = inject(ProductsService);
  private errorService = inject(ErrorService);
  private unitService = inject(UnitMeasurementService);
  
  protected STORE_CAN_UPDATE = this.authService.hasPower('store:update');

  protected isMobile = this.layoutService.isMobile;
  protected isLaptop = this.layoutService.isLaptop;
  protected isDesktop = this.layoutService.isDesktop;
 
  protected actualStore = signal<Store | null>(null);
  protected isEditMode = signal<boolean>(false);

  protected actualProductSelected = signal<StoreProductFront | null>(null);

  protected storeProducts = signal<CompanyProduct[]>([]);

  private templateProducts = signal<ProductTemplate[]>([]);

  private selectedTemplateProductIds = computed<Set<string>>(() => {
    return new Set(this.storeProducts().map(p => p.productTemplate.id));
  });

  protected availableTemplateProducts = computed<ProductTemplate[]>(() => {
    const selectedIds = this.selectedTemplateProductIds();
    return this.templateProducts().filter(template => !selectedIds.has(template.id));
  });

  protected isEditProductMode = signal<boolean>(false);

  private editStoreModal = viewChild<ModalComponent>('editStoreModal');
  private productAddModal = viewChild<ModalComponent>('productAddModal');
  private warehousesModal = viewChild<ModalComponent>('warehousesModal');
  private warehouseFormModal = viewChild<ModalComponent>('warehouseFormModal');

  private baseUnitSelect = viewChild<SelectComponent<UnitMeasure>>('baseUnitSelect');

  // Warehouse management
  protected warehouses = signal<StoreWarehouse[]>([]);
  protected editingWarehouse = signal<StoreWarehouse | null>(null);
  protected isWarehouseEditMode = signal<boolean>(false);
  private supplierSelectionModal = viewChild<ModalComponent>('supplierSelectionModal');


  /*
  private handlePaginationSizeSelectedProducts = computed<number>(() => {
    if (this.isDesktop()) {
      return 15;
    } else if (this.isLaptop()) {
      return 20;
    } else {
      return 5;
    }
  });

  private handlePaginationSizeListProducts = computed<number>(() => {
    if (this.isDesktop()) {
      return 30;
    } else if (this.isLaptop()) {
      return 20;
    } else {
      return 5;
    }
  });
  */
  
  
  protected units = signal<UnitMeasure[]>([]);
  protected selectedMainUnit = signal<UnitMeasure | null>(null);

  protected posiblesMatrixUnits = signal<UnitMatrix[]>([]);
  protected selectedMatrixUnits = signal<UnitMatrix[]>([]);

  protected baseUnits = computed<UnitMeasure[]>(() => {
    return this.units().filter(u => u.isBasic);
  });
 
  protected assignedSuppliers = computed<any[]>(() => {
    const actualProduct = this.actualProductSelected();

    if (!actualProduct) return [];

    return actualProduct.selectedSuppliers;
  });

  protected availableSuppliers = computed<SupplierDetail[]>(() => {
    const actualProduct = this.actualProductSelected();


    if (!actualProduct) return [];

    return actualProduct.availableSuppliers;
  })
  
  protected templateProductsController = new PaginationController<ProductTemplate>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['name'],
    sortAscending: true,
    sortColumn: 'name',
    //pageSize: this.handlePaginationSizeListProducts()
    pageSize: 30
  });

  protected templateProductsColumns: ColumnDefinition[] = [
    { columnName: 'name', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'description', nameToShow: 'Descripción', type: 'string' }
  ];

  protected storeProductsColumns: ColumnDefinition[] = [
    { columnName: 'productName', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'sku', nameToShow: 'SKU', type: 'string' },
    { columnName: 'description', nameToShow: 'Descripción', type: 'string' },
    { columnName: 'costs.costEstimated', nameToShow: 'Costo estimado', type: 'number', centerCol: true },
  ];

  protected storeProductsController = new PaginationController<CompanyProduct>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['productName', 'sku', 'description', 'productTemplate.id', 'unitInventory.name'],
    //pageSize: this.handlePaginationSizeSelectedProducts()
    pageSize: 30
  });

  private readonly limitsFormModel = signal({
    minimalStock: 0,
    maximalStock: 0,
    maxQuantity: 0,
  });

  protected limitsForm = form(this.limitsFormModel);

  private readonly productFormModel = signal({
    sku: '',
    productName: '',
    estimatedCost: 0,
    description: '',
    isSellable: true,
  });

  protected productForm = form(
    this.productFormModel,
    productForm => {
      readonly(productForm.productName);
      required(productForm.productName, { message: 'El nombre del producto es requerido' });
      minLength(productForm.productName, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
      required(productForm.estimatedCost, { message: 'El costo estimado es requerido' });

      // validate(productForm.estimatedCost, ({ value }) => {
      //   const currentValue = value();

      //   if (currentValue <= 0) {
      //     return {
      //       kind: 'greaterThanZero',
      //       message: 'El precio debe ser mayor a 0'
      //     };
      //   }

      //   return null;
      // });

      this.errorService.bindServerErrors(productForm, this.productFormModel);
    }
  );

  private readonly storeFormModel = signal({
    externalCode: '',
    storeName: '',
    description: '',
    storeAddress: '',
    idCostCenter: '',
  });

  protected storeForm = form(
    this.storeFormModel,
    storeForm => {
      required(storeForm.storeName, { message: 'El nombre de la tienda es requerido' });
      minLength(storeForm.storeName, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
      required(storeForm.storeAddress, { message: 'La dirección es requerida' });
      required(storeForm.idCostCenter, { message: 'El centro de costo es requerido' });

      this.errorService.bindServerErrors(storeForm, this.storeFormModel);
    }
  );

  private readonly warehouseFormModel = signal({
    warehouseName: '',
    description: '',
    warehouseAddress: '',
  });

  protected warehouseForm = form(
    this.warehouseFormModel,
    warehouseForm => {
      required(warehouseForm.warehouseName, { message: 'El nombre de la bodega es requerido' });
      minLength(warehouseForm.warehouseName, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
      required(warehouseForm.warehouseAddress, { message: 'La dirección es requerida' });

      this.errorService.bindServerErrors(warehouseForm, this.warehouseFormModel);
    }
  );

  constructor() {
    const storeId = this.router.url.split('/').pop();

    this.storeSharedService.cantSelectStore.set(true);

    if (storeId && storeId !== 'new') {
      this.enterEditMode(storeId);
    }
    
    effect(() => {
      this.storeProductsController.SetRawData(this.storeProducts());
    });

    effect(() => {
      this.templateProductsController.SetRawData(this.availableTemplateProducts());
    });

    effect(() => {
      this.productFormModel();
      this.limitsFormModel();
      this.warehouseFormModel();
      this.storeFormModel();
      this.errorService.clearSignalErrors();

      //TODO: esto es un fix temporal para limpiar los error param del backend. crear método automatico que escuche el form de la request para limpiarlos al cambiar
    });

    effect(() => {
      const selectedUnit = this.selectedMainUnit();

      if (!selectedUnit) {
        this.posiblesMatrixUnits.set([]);
        return;
      };

      untracked(() => this.getUnitsMatrixForMainUnit(selectedUnit.id));
    });
  }

  private async enterEditMode(storeId: string): Promise<void> {
    this.isEditMode.set(true);
    this.loadStoreData(storeId);
    this.getStoreProducts(storeId);
    this.getTemplateProducts();
    this.getUnits();
  }

  private async getStoreProducts(storeId: string): Promise<void> {
    const products = await this.storeService.getProducts(storeId);

    if (!products) return;
    
    this.storeProducts.set(products);
  }

  private async getUnits(): Promise<void> {
    const units = await this.unitService.getUnitMeasurement();

    if (!units) return;

    this.units.set(units);
  }

  private async getTemplateProducts(): Promise<void> {
    const response = await this.productsService.getProductsTemplate();

    this.templateProducts.set(response);
  }

  protected openEditStoreModal(): void {
    const store = this.actualStore();

    if (!store) return;

    this.storeForm().setControlValue({
      externalCode: store.externalCode || '',
      storeName: store.storeName || '',
      description: store.description || '',
      storeAddress: store.storeAddress || '',
      idCostCenter: store.idCostCenter || '',
    });

    this.editStoreModal()?.openModal();
  }

  protected resetProductStepperModal(): void {
    this.actualProductSelected.set(null);
    this.productForm().reset({
      sku: '',
      productName: '',
      estimatedCost: 0,
      description: '',
      isSellable: true,
    });
    this.resetUnitMatrixSelection();
    this.baseUnitSelect()?.reset();
    this.isEditProductMode.set(false);
  }

  private async loadStoreData(id: string): Promise<void> {
    const store = await this.storeService.getStoreById(id);

    if (!store) {
      this.toastService.error('Tienda no encontrada', 'Error');
      this.router.navigate(['/store']);
      return;
    }

    this.actualStore.set(store);
  }
  
  protected openSupplierSelectionModal(): void {
    if (!this.isMobile()) return;
    this.supplierSelectionModal()?.openModal();
  }

  protected resetStoreForm(): void {
    this.storeForm().reset({
      externalCode: '',
      storeName: '',
      description: '',
      storeAddress: '',
      idCostCenter: '',
    })
  }

  protected async onSubmit(): Promise<void> {
    this.storeForm().markAsTouched();
    if (this.storeForm().invalid()) return;

    if (this.isEditMode()) {
      const store = this.actualStore();
      if (!store) return;
      
      const result = await this.storeService.updateStore(store.id, this.storeForm);
      
      if (result) {
        this.toastService.success('Tienda actualizada exitosamente', 'Éxito');
        this.editStoreModal()?.closeModal();
        await this.loadStoreData(store.id);
      }
    } else {
      const result = await this.storeService.createStore(this.storeForm);
      if (result) {
        this.toastService.success('Tienda creada exitosamente', 'Éxito');
        this.router.navigate(['/my-company/store', result.id]);
      }
    }

  }

  protected async selectTemplateProduct(product: ProductTemplate): Promise<void> {
    this.actualProductSelected.set(null);

    const productAllData = await this.storeService.getProductAllData(
      this.actualStore()?.companyId || '',
      product.id
    );

    if (!productAllData) {
      this.toastService.error('No se pudo cargar la información completa del producto', 'Error');
      return;
    }

    const { suppliers, ...noSupp } = productAllData;

    const productFromTemplate: StoreProductFront = {
      ...noSupp,
      availableSuppliers: productAllData.suppliers,
      selectedSuppliers: [],
    }

    this.actualProductSelected.set(productFromTemplate);

    // Intentar extraer SKU desde los códigos del template


    this.productFormModel.update(form => {
      return {
        ...form,
        sku: productAllData.sku || '',
        productName: product.name,
        description: product.description || '',
      };
    });

    this.productAddModal()?.openModal();
  }

  // Warehouse management methods
  protected openWarehousesModal(): void {
    const store = this.actualStore();
    if (!store) return;
    
    this.warehouses.set([...store.warehouses]);
    this.warehousesModal()?.openModal();
  }

  protected openWarehouseFormModal(warehouse?: StoreWarehouse): void {
    if (warehouse) {
      this.isWarehouseEditMode.set(true);
      this.editingWarehouse.set(warehouse);
      this.warehouseForm().setControlValue({
        warehouseName: warehouse.warehouseName,
        description: warehouse.description || '',
        warehouseAddress: warehouse.warehouseAddress,
      });
    } else {
      this.isWarehouseEditMode.set(false);
      this.editingWarehouse.set(null);
      this.warehouseForm().reset({
        warehouseName: '',
        description: '',
        warehouseAddress: '',
      });
    }
    this.warehouseFormModal()?.openModal();
  }

  protected async saveWarehouse(): Promise<void> {
    this.warehouseForm().markAsTouched();
    if (this.warehouseForm().invalid()) return;

    const store = this.actualStore();
    if (!store) return;

    this.warehouseFormModal()?.disableButton('ok');
    
    if (this.isWarehouseEditMode()) {
      const editing = this.editingWarehouse();
      if (!editing) {
        this.warehouseFormModal()?.enableButton('ok');
        return;
      }

      const updatedWarehouse = await this.storeService.updateWarehouse(store.id, editing.id, this.warehouseForm);

      if (!updatedWarehouse) {
        this.warehouseFormModal()?.enableButton('ok');
        return;
      }

      this.actualStore.update(s => ({
        ...s!,
        warehouses: s!.warehouses.map(wh => wh.id === editing.id ? updatedWarehouse : wh)
      }));

      this.toastService.success('Bodega actualizada exitosamente', 'Éxito');
      this.resetWarehouseForm();
      this.warehouseFormModal()?.closeModal();
    } else {
      const createdWarehouse = await this.storeService.createWarehouse(store.id, this.warehouseForm);

      if (!createdWarehouse) {
        this.warehouseFormModal()?.enableButton('ok');
        return;
      }

      this.actualStore.update(s => ({
        ...s!,
        warehouses: [...s!.warehouses, createdWarehouse]
      }));

      this.toastService.success('Bodega creada exitosamente', 'Éxito');
      this.resetWarehouseForm();
      this.warehouseFormModal()?.closeModal();
    }
  }

  protected applyWarehouses(): void {
    // TODO: Aquí se conectará con el backend para guardar las bodegas
    this.toastService.success('Bodegas actualizadas (pendiente backend)', 'Éxito');
    this.warehousesModal()?.closeModal();
  }

  protected resetWarehouseForm(): void {
    this.warehouseForm().reset({
      warehouseName: '',
      description: '',
      warehouseAddress: '',
    });
    this.isWarehouseEditMode.set(false);
    this.editingWarehouse.set(null);
  }

  protected dropAssignedSupplier(event: CdkDragDrop<SupplierDetail[]>): void {
    const actualProduct = this.actualProductSelected();
    if (!actualProduct) return;

    const draggedSupplier = event.item.data as SupplierDetail;

    if (event.previousContainer === event.container) {
      // Reordenar dentro de la misma lista (izquierda)
      const newSelected = [...actualProduct.selectedSuppliers];
      moveItemInArray(newSelected, event.previousIndex, event.currentIndex);
      
      this.actualProductSelected.update(product => {
        if (!product) return product;
        return {
          ...product,
          selectedSuppliers: newSelected
        };
      });
    } else {
      // Mover de derecha a izquierda (de availableList a assignedList)
      if (draggedSupplier && !actualProduct.selectedSuppliers.find(s => s.id === draggedSupplier.id)) {
        const newSelected = [...actualProduct.selectedSuppliers];
        newSelected.splice(event.currentIndex, 0, draggedSupplier);
        
        const newAvailable = actualProduct.availableSuppliers.filter(s => s.id !== draggedSupplier.id);
        
        this.actualProductSelected.update(product => {
          if (!product) return product;
          return {
            ...product,
            selectedSuppliers: newSelected,
            availableSuppliers: newAvailable
          };
        });
      }
    }
  }

  protected isSupplierAssigned(supplierId: string): boolean {
    return this.assignedSuppliers().some(s => s.id === supplierId);
  }

  private resetUnitMatrixSelection(): void {
    this.posiblesMatrixUnits.set([]);
    this.selectedMatrixUnits.set([]);
    this.selectedMainUnit.set(null);
  }

  protected toggleSupplierSelection(supplier: SupplierDetail): void {
    const actualProduct = this.actualProductSelected();

    if (!actualProduct) return;

    if (this.isSupplierAssigned(supplier.id)) return;
    
    const newSelected = [...actualProduct.selectedSuppliers, supplier];
    const newAvailable = actualProduct.availableSuppliers.filter(s => s.id !== supplier.id);
    this.actualProductSelected.update(product => {
      if (!product) return product;
      return {
        ...product,
        selectedSuppliers: newSelected,
        availableSuppliers: newAvailable
      };
    });
  }

  protected dropAvailableSupplier(event: CdkDragDrop<SupplierDetail[]>): void {
    const actualProduct = this.actualProductSelected();
    if (!actualProduct) return;

    const draggedSupplier = event.item.data as SupplierDetail;

    // Si viene de la izquierda (assignedList), remover de asignados y agregar a disponibles
    if (event.previousContainer !== event.container) {
      const newSelected = actualProduct.selectedSuppliers.filter(s => s.id !== draggedSupplier.id);
      const newAvailable = [...actualProduct.availableSuppliers, draggedSupplier];
      
      this.actualProductSelected.update(product => {
        if (!product) return product;
        return {
          ...product,
          selectedSuppliers: newSelected,
          availableSuppliers: newAvailable
        };
      });
    }
  }

  // protected getPriceDifference(price: number, priceAvg: number): number {
  //   return Math.floor((price - priceAvg) / priceAvg * 100);
  // }

  protected onMainUnitSelect(unitMeasure: UnitMeasure | null): void {
    if (!this.actualProductSelected()) return;

    this.resetUnitMatrixSelection();

    this.selectedMainUnit.set(unitMeasure);
  }

  protected isMatrixUnitSelected(unitId: number): boolean {
    return this.selectedMatrixUnits().some(u => u.id === unitId);
  }

  protected toggleMatrixUnitSelection(unit: UnitMatrix): void {
    const selectedUnits = this.selectedMatrixUnits();
    const isSelected = this.isMatrixUnitSelected(unit.id);

    if (isSelected) {
      const newSelected = selectedUnits.filter(u => u.id !== unit.id);
      this.selectedMatrixUnits.set(newSelected);

      return;
    }

    this.selectedMatrixUnits.set([...selectedUnits, unit]);
  }

  protected async getUnitsMatrixForMainUnit(mainUnitId: number): Promise<void> {
    const matrixUnits = await this.unitService.getUnitsByMainUnit(mainUnitId);

    this.posiblesMatrixUnits.set(matrixUnits);
  }

  protected async handleProductFormSubmit(comingFromCancel?: boolean): Promise<void> {
    if (this.isEditProductMode()) {
      await this.editStoreProduct();
    } else {
      if (comingFromCancel) return;
      await this.createProduct();
    }
  }

  protected async createProduct(): Promise<void> {

  // Debug: show how many suppliers will be sent

   const response = await this.storeService.createStoreProduct(
      this.actualStore()?.companyId || '',
      this.actualStore()?.id || '',
      this.actualProductSelected()!,
      this.productForm,
      this.selectedMainUnit() ? this.selectedMainUnit()!.id : 0,
      this.selectedMatrixUnits().map(u => ({ unitId: u.id, factor: u.factor })),
      this.limitsForm().value()
    );

    if (!response) {
      this.toastService.error('No se pudo crear el producto', 'Error');
      return;
    }

    // Refrescar lista y cerrar modal
    await this.getStoreProducts(this.actualStore()?.id || '');
    this.productAddModal()?.closeModal();

    this.toastService.success('Producto creado exitosamente', 'Éxito');
   }

  protected async getStoreProduct(productId: string, templateId: string): Promise<void> {
    const storeId = this.actualStore()?.id;

    if (!storeId) return;

    const storeProduct = await this.storeService.getStoreProductById(storeId, productId);
    const templateProduct = await this.storeService.getProductAllData(
      this.actualStore()?.companyId || '',
      templateId
    );

    if (!storeProduct || !templateProduct) {
      this.toastService.error('No se pudo cargar el producto', 'Error');
      return;
    }

    this.productForm().setControlValue({
      sku: storeProduct.sku || '',
      productName: storeProduct.productName,
      estimatedCost: storeProduct.costs.costEstimated || 0,
      description: storeProduct.description || '',
      isSellable: storeProduct.itemSale,
    });

    this.limitsForm().setControlValue({
      minimalStock: storeProduct.quantities.minimalStock || 0,
      maximalStock: storeProduct.quantities.maximalStock || 0,
      maxQuantity: storeProduct.quantities.maxQuantity || 0,
    });

    const selectedSuppliers = storeProduct.suppliers?.sort((a, b) => a.priority! - b.priority!) || [];

    this.actualProductSelected.set({
      id: storeProduct.id,
      name: storeProduct.productName,
      description: storeProduct.description,
      image: storeProduct.image,
      isNewImage: false,
      categories: templateProduct.categories,
      codes: templateProduct.codes,
      availableSuppliers: templateProduct.suppliers.filter(s => !storeProduct.suppliers?.some(ss => ss.id === s.id)),
      selectedSuppliers: selectedSuppliers || [],
      sku: templateProduct.sku || '',
      estimatedCost: templateProduct.estimatedCost || 0
    });

    this.baseUnitSelect()?.selectValue(storeProduct.unitInventory);
    this.selectedMainUnit.set(storeProduct.unitInventory);
    this.selectedMatrixUnits.set(storeProduct.unitMatrix);

    this.isEditProductMode.set(true);

    this.productAddModal()?.openModal();
  }

  protected async editStoreProduct(): Promise<void> {
    const response = await this.storeService.updateStoreProduct(
      this.actualStore()?.companyId || '',
      this.actualStore()?.id || '',
      this.actualProductSelected()!,
      this.productForm,
      this.selectedMainUnit() ? this.selectedMainUnit()!.id : 0,
      this.selectedMatrixUnits().map(u => ({ unitId: u.id, factor: u.factor })),
      this.limitsForm().value()
    );

    if (!response) {
      this.toastService.error('No se pudo actualizar el producto', 'Error');
      return;
    }

    await this.getStoreProducts(this.actualStore()?.id || ''); //TODO: optimizar esto para no recargar todo cuando se fixee el backend

    this.productAddModal()?.closeModal();
  }
}
