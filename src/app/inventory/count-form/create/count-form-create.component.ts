import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DatepickerComponent } from '@/shared/components/datepicker/datepicker.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { StoreService as SharedStoreService } from '@/shared/services/store.service';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NoImageComponent } from 'public/default/no-image.component';
import { CountService } from '@/inventory/services/count.service';
import { UserService } from '@/system/services/user.service';
import { UserAccount } from '@/system/models/user';
import { CompanyService } from '@/shared/services/company.service';
import { CountDetail } from '@/inventory/models/count';
import { WarehouseProduct } from '@/shared/models/products';
import { NavigateService } from '@/shared/services/navigate.service';
import { Router } from '@angular/router';
import { InventoryService } from '@/inventory/services/inventory.service';
import { InventoryProduct } from '@/inventory/models/inventory';

const controllerComponents = [
  FilterComponent,
  SearchBarComponent,
  PaginationComponent,
  SorterHeaderComponent,
  TableCaptionComponent
];

@Component({
  selector: 'dot-count-form',
  imports: [
    SectionWrapperComponent,
    GoBackComponent,
    controllerComponents,
    NoImageComponent,
    NgOptimizedImage,
    NgTemplateOutlet,
    SelectComponent,
    DatepickerComponent,
    ModalComponent,
],
  templateUrl: './count-form-create.component.html',
  styleUrl: './count-form-create.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountFormComponent {
  private layoutService = inject(LayoutService);
  private sharedStoreService = inject(SharedStoreService);
  private InventoryService = inject(InventoryService);
  private countService = inject(CountService);
  private userService = inject(UserService);
  private companyService = inject(CompanyService);
  private navigateService = inject(NavigateService);
  private router = inject(Router);

  protected selectedProducts = signal<InventoryProduct[]>([]);
  protected warehouses = signal<StoreWarehouse[]>([]);
  protected users = signal<UserAccount[]>([]);

  protected products = signal<InventoryProduct[]>([]);

  protected actualProduct = signal<any | null>(null);

  protected actualCount = signal<CountDetail | null>(null);

  protected selectedWarehouse = signal<StoreWarehouse | null>(null);
  protected selectedUser = signal<UserAccount | null>(null);
  protected selectedDate = signal<Date | null>(null);

  protected isMobile = computed(() => this.layoutService.isMobile());
  protected isLaptop = computed(() => this.layoutService.isLaptop());
  protected isDesktop = computed(() => this.layoutService.isDesktop());
  private handlePageSize = computed<number>(() => {
    if (this.isMobile()) return 5;
    else if (this.isLaptop()) return 6;
    else if (this.isDesktop()) return 10;
    else return 12;
  });

  protected selectedStore = computed<Store | null>(() => this.sharedStoreService.selectedStore());
  protected selectedCompany = computed(() => this.companyService.selectedCompany());

  protected searchByWarehouse: keyof StoreWarehouse = 'warehouseName';
  protected searchByUser: keyof UserAccount = 'userName';

  protected controller = new PaginationController<InventoryProduct>([], <PaginationControllerCFG>{
    //pageSize: this.handlePageSize()
    defaultSearchColumns:  ['productName', 'sku']
  });

  protected columns: ColumnDefinition[] = [
    { columnName: 'id', nameToShow: 'ID', type: 'string', showOnly:'filter' },
    { columnName: 'imagen', nameToShow: 'Imagen', type: 'entity' },
    { columnName: 'nombre', nameToShow: 'Nombre', type: 'string',  },
    { columnName: 'stock', nameToShow: 'Stock', type: 'string', centerCol: true },
    { columnName: 'measure', nameToShow: 'Medida base', type: 'string', centerCol: true },
  ]

  protected minDate: Date = new Date();

  constructor() {
    const countId = this.router.url.split('/').pop();

    if (countId && countId !== 'new') {
      this.getCountDetail(countId);
    }

    this.getUsers();

    effect(() => {
      const actualCount = this.actualCount();
      const warehouses = this.warehouses();
      const users = this.users();
      const products = this.products();

      if (!actualCount || warehouses.length < 1 || users.length < 1 || products.length < 1) return;

      this.selectedWarehouse.set(warehouses.find(wh => wh.id === actualCount.warehouseId) || null);
      this.selectedUser.set(users.find(user => user.id === actualCount.assignedTo) || null);
      this.selectedDate.set(actualCount.scheduledAt ? new Date(actualCount.scheduledAt) : null);
      
      for (const productItem of actualCount.countItems) {
        const product = untracked(() => this.products()).find(p => p.id === productItem.productId);

        if (!product) continue;

        if (untracked(() => this.isSelected(product.id))) continue;
        untracked(() => this.selectProduct(product));
      }
    });

    effect(() => {
      this.controller.SetRawData(this.products());
    })

    effect(() => {
      const selectedStore = this.selectedStore();

      if (!selectedStore) return;

      untracked(() => this.getWarehouses(selectedStore.id));
    });

    effect(() => {
      const pageSize = this.handlePageSize();

      untracked(() => this.controller.SetPageSize(pageSize));
    });

    effect(() => {
      const selectedWarehouse = this.selectedWarehouse();

      if (!selectedWarehouse) return;

      untracked(() => this.getWarehouseProducts(selectedWarehouse.id));
    });
  }

  protected async getUsers(): Promise<void> {
    const response = await this.userService.getUsers();

    if (!response) return;

    this.users.set(response.filter(user => user.available));
  }

  protected selectProduct(product: InventoryProduct): void {
    if (this.isSelected(product.id)) {
      this.removeProduct(product.id);
      return;
    }
    /*
    const productSelected: ProductSelected = {
      productId: product.id,
      productName: product.productName,
      productSku: product.sku,
      productImage: product.image,
      inStock: product.inStock,
      units: [
        {
          unitId: product.baseUnitId,
          unitAbv: product.baseUnit
        }
      ]
    };
    */
   const productSelected = structuredClone(product);

    this.selectedProducts.update(products => [...products, productSelected]);
  }

  protected isSelected(productId: InventoryProduct['id']): boolean {
    return this.selectedProducts().some(product => product.id === productId);
  }

  protected removeProduct(productId: WarehouseProduct['productId']): void {
    this.selectedProducts.update(products => {
      return products.filter(p => p.id !== productId);
    });
  }

  protected deleteAllSelectedProducts(): void {
    this.selectedProducts.set([]);
  }

  protected onDateChange(date: Date): void {
    this.selectedDate.set(date);
  }

  private async getWarehouses(storeId: Store['id']): Promise<void> {
    const response = await this.sharedStoreService.getWarehousesByStoreId(storeId);

    if (!response) return;

    this.warehouses.set(response);
    this.selectedWarehouse.set(response[0]);
  }

  private async getWarehouseProducts(warehouseId: StoreWarehouse['id']): Promise<void> {
    const response = await this.InventoryService.getInventory(
      this.selectedCompany()?.id || '',
      this.selectedStore()?.id || '',
      [warehouseId]
    );

    if (!response) return;

    this.products.set(response[0]?.products || []);
  }

  protected async createCount(): Promise<void> {
    const body = {
      storeId: this.selectedStore()?.id,
      warehouseId: this.selectedWarehouse()?.id,
      assignedTo: this.selectedUser()?.id,
      dueDate: this.selectedDate(),
      observations: '', //TODO: Add observations field
      productsId: Array.from(this.selectedProducts()).map(product => { 
        return product.id
      })
    };

    const response = await this.countService.createCount(this.selectedCompany()!.id, body);

    if (!response) return;

    this.navigateService.push('inventory');
  }

  protected async updateCount(): Promise<void> {
    const body = {
      storeId: this.selectedStore()?.id,
      warehouseId: this.selectedWarehouse()?.id,
      assignedTo: this.selectedUser()?.id,
      dueDate: this.selectedDate(),
      observations: '', //TODO: Add observations field
      productsId: Array.from(this.selectedProducts()).map(product => {
        return product.id
      })
    };

    const response = await this.countService.updateCount(this.actualCount()!.id, body);

    if (!response) return;

    this.navigateService.push('inventory');
  }

  private async getCountDetail(countId: string): Promise<void> {
    const response = await this.countService.getCountDetailById(countId);

    if (!response) return;

    this.actualCount.set(response);
  }

  protected selectChangeWarehouse(warehouse: StoreWarehouse | null): void {
    this.selectedWarehouse.set(warehouse);
  }
}
