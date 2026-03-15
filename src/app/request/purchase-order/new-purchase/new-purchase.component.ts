import { NewPurchaseForm } from '@/request/models/purchase-order';
import { PurchaseOrderService } from '@/request/services/purchase-order.service';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { StoreService } from '@/shared/services/store.service';
import { ExtendedSupplier, Supplier, SupplierProduct } from '@self-contained-pages/outside-supplier/models/supplier';
import { SupplierService } from '@self-contained-pages/outside-supplier/services/supplier.service';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NoImageComponent } from 'public/default/no-image.component';
import { LoadingDirective } from "@/shared/directives/loading.directive";
import { UnitMeasuresPipe } from '@/shared/pipes/unit-measures.pipe';
import { CompanyService } from '@/shared/services/company.service';

type ProductsForm = SupplierProduct & { quantity: number };

const controllerComponents = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  TableCaptionComponent,
  PaginationComponent,
];

@Component({
  selector: 'dot-new-purchase',
  imports: [
    controllerComponents,
    SectionWrapperComponent,
    SelectComponent,
    InputDirective,
    GoBackComponent,
    NgOptimizedImage,
    NoImageComponent,
    ClpCurrencyPipe,
    ModalComponent,
    NgTemplateOutlet,
    LoadingDirective,
    UnitMeasuresPipe,
],
  templateUrl: './new-purchase.component.html',
  styleUrl: './new-purchase.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewPurchaseComponent {
  private storeService = inject(StoreService);
  private supplierService = inject(SupplierService);
  private purchaseService = inject(PurchaseOrderService);
  private layoutService = inject(LayoutService);
  private navigateService = inject(NavigateService);
  private companyService = inject(CompanyService);

  protected products = signal<SupplierProduct[]>([]);
  protected warehouses = signal<StoreWarehouse[]>([]);
  protected suppliers = signal<ExtendedSupplier[]>([]);
  protected selectedProducts = signal<ProductsForm[]>([]);
  protected selectedWarehouse = signal<StoreWarehouse | null>(null);
  protected selectedSupplier = signal<Supplier | null>(null);
  private observationValue = signal<string>('');

  private selectedCompany = this.companyService.selectedCompany;

  protected isMobile = computed(() => this.layoutService.isMobile());
  protected isLaptop = computed(() => this.layoutService.isLaptop());
  protected isDesktop = computed(() => this.layoutService.isDesktop());
  private handlePageSize = computed<number>(() => {
    if (this.isMobile()) return 5;
    else if (this.isLaptop()) return 6;
    else if (this.isDesktop()) return 10;
    else return 12;
  });

  private selectedStore = computed(() => this.storeService.selectedStore());
  private productsToBack = computed(() => this.selectedProducts().map(product => {
    return {
      itemId: product.productCompanyId,
      quantity: product.quantity,
      unitPrice: product.supplierProductPrice,
    }
  }));

  protected productsTotal = computed<number>(() => {
    return this.selectedProducts().reduce((total, product) => {
      return total + (product.supplierProductPrice * product.quantity);
    }, 0)
  })

  protected warehouseSearchBy: keyof StoreWarehouse = 'warehouseName';
  protected supplierSearchBy: keyof ExtendedSupplier = 'supplierName';

  private switchSupplierModal = viewChild<ModalComponent>('switchSupplierModal');

  protected controller = new PaginationController<SupplierProduct>([], <PaginationControllerCFG>{
    pageSize: this.handlePageSize(),
    defaultSearchColumns: ['productName', 'productCompanySku', 'supplierId'],
  });

  protected columns: ColumnDefinition[] = [
    { columnName: 'productId', nameToShow: 'ID Producto', type: 'string', showOnly: 'filter' },
    { columnName: 'productImage', nameToShow: 'Imagen', type: 'entity', maybeNull: true },
    { columnName: 'productName', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'productDescription', nameToShow: 'Descripción', type: 'string', showOnly: 'filter' },
    { columnName: 'companyId', nameToShow: 'ID Compañia', type: 'string', showOnly: 'filter' },
    { columnName: 'storeId', nameToShow: 'ID Tienda', type: 'string', showOnly: 'filter' },
    { columnName: 'supplierId', nameToShow: 'ID Proveedor', type: 'string', showOnly: 'filter' },
    { columnName: 'productCompanySku', nameToShow: 'SKU', type: 'string', showOnly: 'filter' },
    { columnName: 'supplierProductPrice', nameToShow: 'Precio Unit.', type: 'number', wrapHeader: true },
    { columnName: 'supplierProductMinQuantity', nameToShow: 'Cantidad Mínima', type: 'number', maybeNull: true, wrapHeader: true },
    { columnName: 'unitPurchase', nameToShow: 'U. Medida', type: 'string' },
  ]

  constructor() {
    effect(() => {
      const selectedCompany = this.selectedCompany();

      if (!selectedCompany) return;

      untracked(() => {
        this.getSuppliers(selectedCompany.id);
      });
    })

    effect(() => {
      this.controller.SetPageSize(this.handlePageSize());
    });

    effect(() => {
      const selectedStore = this.selectedStore();
      const selectedSupplier = this.selectedSupplier() ?? this.suppliers()[0];

      if (!selectedStore || !selectedSupplier) return;

      untracked(() => {
        this.getWarehouses(selectedStore.id);
        this.getProducts(selectedSupplier.id, selectedStore.id);
      });
    });

    effect(() => {
      this.controller.SetRawData(this.products());
    });
  }
  
  private async getWarehouses(selectedStoreId: Store['id']): Promise<void> {
    const response = await this.storeService.getWarehousesByStoreId(selectedStoreId);

    if (!response) return;

    this.warehouses.set(response);
  }

  private async getProducts(supplierId: Supplier['id'], selectedStoreId: Store['id']): Promise<void> {
    const response = await this.supplierService.getProductsBySupplierId(supplierId, selectedStoreId);

    if (!response) return;

    this.products.set(response);
  }

  private async getSuppliers(companyId:string): Promise<void> {
    const response = await this.supplierService.getSuppliersByCompanyId(companyId);

    this.suppliers.set(response);
  }

  protected selectProduct(product: SupplierProduct): void {
    const selectedProducts = this.selectedProducts();
    
    if (selectedProducts.find(p => p.productId === product.productId)) {
      this.deleteProduct(product as ProductsForm);
      return;
    }

    const productToAdd = {
      ...product,
      quantity: 1,
    }

    this.selectedProducts.set([...selectedProducts, productToAdd]);
  }

  protected isSelected(product: SupplierProduct): boolean {
    return !!this.selectedProducts().find(p => p.productId === product.productId);
  }

  protected updateObservation(event: Event):void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.observationValue.set(value);
  }

  protected async createPurchase(): Promise<void> {
    const form: NewPurchaseForm = {
      supplierId: this.selectedSupplier()?.id ?? this.suppliers()[0].id,
      storeId: this.selectedStore()?.id ?? '0',
      warehouseId: this.selectedWarehouse()?.id ?? this.warehouses()[0].id,
      description: this.observationValue(),
      items: this.productsToBack(),
    };

    const response = await this.purchaseService.createPurchaseOrder(form);

    if (!response) return;

    this.navigateService.push('purchase-order-form', { orderId: response.id });
  }

  protected clearProducts():void {
    this.selectedProducts.set([]);
  }

  protected deleteProduct(product: ProductsForm):void {
    this.selectedProducts.set(this.selectedProducts().filter(p => p.productId !== product.productId));
  }

  protected selectSupplier(supplier: Supplier):void {
    if (this.selectedProducts().length > 0) {
      this.switchSupplierModal()?.openModal();
      return;
    }

    this.selectedSupplier.set(supplier);
  }

  /// INPUT HANDLERS ///
  protected handleInput(event: Event, product: ProductsForm):void {
    const value = (event.target as HTMLInputElement).valueAsNumber;

    if (
      value < 1 ||
      isNaN(value)
    ) return this.deleteProduct(product);

    this.selectedProducts.update(products => {
      return products.map(p => p.productId === product.productId ? {...p, quantity: value} : p);
    })
  }

  protected handleBlur(event: Event, product: ProductsForm): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;

    if (
      value < 1 ||
      isNaN(value)
    ) return this.deleteProduct(product);
  }

  protected decrement(product: ProductsForm):void {
    if (product.quantity === 1) return this.deleteProduct(product);

    this.selectedProducts.update(products => {
      return products.map(p => p.productId === product.productId ? {...p, quantity: p.quantity - 1} : p);
    });
  }

  protected increment(product: ProductsForm):void {
    this.selectedProducts.update(products => {
      return products.map(p => p.productId === product.productId ? {...p, quantity: p.quantity + 1} : p);
    });
  }
}
