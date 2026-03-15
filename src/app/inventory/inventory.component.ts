import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { MobileCreateComponent, MobileCreateOption } from '@/shared/components/mobile-create/mobile-create.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, Renderer2, signal, untracked } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InventoryService } from './services/inventory.service';
import { MetaData } from '@/shared/models/apiResponse';
import { CountService } from './services/count.service';
import { Count, CountDetail } from './models/count';
import { UserAccount } from '@/system/models/user';
import { UserService } from '@/system/services/user.service';
import { SelectComponent } from '@/shared/components/select/select.component';
import { DatepickerComponent } from '@/shared/components/datepicker/datepicker.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { AuthService } from '@/auth/services/auth.service';
import { HumanDatePipe } from '@/shared/pipes/human-date.pipe';
import { PercentageBarComponent } from '@/shared/components/percentage-bar/percentage-bar.component';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { StoreService } from '@/my-company/store/services/store.service';
import { CompanyService as companySharedService } from '@/shared/services/company.service';
import { StoreService as StoreSharedService } from '@/shared/services/store.service';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { InventoryByWarehouse, InventoryProduct } from './models/inventory';


const controllerComponent = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent,
]

const allowedModes = ['inventory', 'count'] as const;
type Mode = typeof allowedModes[number];

const allowedViewModes = ['product', 'warehouse'] as const;
type ViewMode = typeof allowedViewModes[number];

@Component({
  selector: 'dot-inventory',
  imports: [
    controllerComponent,
    LinkDirective,
    NgTemplateOutlet,
    MobileCreateComponent,
    DatePipe,
    HumanDatePipe,
    SelectComponent,
    DatepickerComponent,
    DropdownComponent,
    PercentageBarComponent,
    ClpCurrencyPipe,
    HumanDatePipe,
    MatTooltipModule,
],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryComponent implements AfterViewInit, OnDestroy {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private layoutService = inject(LayoutService);
  private navigateService = inject(NavigateService);
  private inventoryService = inject(InventoryService);
  private countService = inject(CountService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private storeService = inject(StoreService)
  //private companySharedService = inject(CompanyService)
  private storeSharedService = inject(StoreSharedService)
  private companySharedService = inject(companySharedService) 

  protected currentUser = this.authService.userAccount();

  protected mode = signal<Mode>(this.getInitialMode());
  protected inventoryViewMode = signal<ViewMode>(this.getInitialViewMode());

  protected users = signal<UserAccount[]>([]);

  protected inventory = signal<InventoryByWarehouse[]>([]);
  
  //protected inventoryMetadata = signal<MetaData | undefined>(undefined);

  //protected movements = signal<InventoryItem[]>([]); //TODO: type
  //protected movementsMetadata = signal<MetaData | undefined>(undefined);
  protected counts = signal<Count[]>([]); //TODO: type
  protected countMetadata = signal<MetaData | undefined>(undefined);

  protected now: Date = new Date();

  protected isMobile = computed(() => this.layoutService.isMobile());
  protected selectedStore = this.storeSharedService.selectedStore;
  

  // PERMISOS

  protected CAN_CREATE_COUNT = this.authService.hasPower('inventory_count:create');
  protected CAN_EDIT_COUNT = this.authService.hasPower('inventory_count:update');
  protected CAN_ASSIGN_COUNT = this.authService.hasPower('inventory_count:update');
  protected CAN_CHANGE_COUNT_DATE = this.authService.hasPower('inventory_count:update');

  protected CAN_CREATE_OUT = this.authService.hasPower('product_movement:create');
  protected CAN_CREATE_TRANSFER = this.authService.hasPower('product_movement:create');

  /////

  private isInitialized = false;
  //private alreadyFetchedInventory = false;
  //private alreadyFetchedCount = false;

  protected countController = new PaginationController<Count>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['id', 'storeName', 'warehouseName', 'createdByName', 'assignedToName'],
    sortColumn: 'updatedAt',
    sortAscending: false,
  });

  protected inventoryController = new PaginationController<InventoryProduct>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['sku', 'name', 'warehouseName'],
    sortColumn: 'name',
    pageSize: 30,
  });

  protected inventoryByWarehouseController = new PaginationController<InventoryByWarehouse>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['warehouseName', 'sku', 'name'],
    sortColumn: 'warehouseName',
    pageSize: 30,
  });

  protected warehouses = signal<StoreWarehouse[]>([]);

  protected warehouseOptions = computed(() => {
    const whList = this.warehouses();
    return [{ id: "Todas", warehouseName: 'Todas' }, ...whList];
  });
  /*
  protected warehouses = computed(() => {
    const items = this.movements();
    const uniqueWarehouses = new Map<string, string>();
    items.forEach(item => {
      if (!uniqueWarehouses.has(item.warehouseId)) {
        uniqueWarehouses.set(item.warehouseId, item.warehouseName);
      }
    });
    return Array.from(uniqueWarehouses).map(([id, name]) => ({ id, name }));
  });

  protected warehouseOptions = computed(() => {
    const whList = this.warehouses();
    return [{ id: null, name: 'Todas' }, ...whList];
  });
  */

  protected selectedWarehouse = signal<string>("Todas");
  protected showZeroStock = signal<boolean>(this.getInitialShowZeroStock());
  
  protected selectedWarehousesIdForInventory = computed(() => {
    const selectedName = this.selectedWarehouse();
    let warehouses : StoreWarehouse[] = [];
    warehouses = this.warehouses();

    if (selectedName === "Todas") {
      return warehouses.map(wh => wh.id);
    } else {
      const find = warehouses.find(wh => wh.warehouseName === selectedName);
      if (!find) return [];
      return [find.id];
    }
  });

  protected mobileCreateOptions: MobileCreateOption[] = [
    ...(this.CAN_CREATE_COUNT ? [{
      label: 'Nuevo conteo',
      icon: 'fa-solid fa-plus',
      action: () => this.navigateService.push('new-inventory-count-form')
    }] : []),
    ...(this.CAN_CREATE_OUT ? [{
      label: 'Registrar Movimiento',
      icon: 'fa-solid fa-plus',
      action: () => this.navigateService.push('new-inventory-decrease-form')
    }] : []),
    ...(this.CAN_CREATE_TRANSFER ? [{
      label: 'Nueva Transferencia',
      icon: 'fa-solid fa-arrows-rotate',
      action: () => this.navigateService.push('inventory-transfer')
    }] : [])
  ];

  protected inventoryColumns: ColumnDefinition[] = [
    { columnName: 'sku', nameToShow: 'SKU', type: 'string' },
    { columnName: 'name', nameToShow: 'Producto', type: 'string', showOnly: 'table' },
    { columnName: null, nameToShow: 'Bodega', type: 'string', showOnly: 'table', noSort: true},
    { columnName: 'stockCurrent', nameToShow: 'Stock', type: 'string', showOnly: 'table', centerCol: true },
    { columnName: null, nameToShow: 'Stock en Tránsito', type: 'string', showOnly: 'table', noSort: true, centerCol: true },
    { columnName: 'avgCost', nameToShow: 'Costo Prom. Ponderado', type: 'string', showOnly: 'table', noSort: true, centerCol: true },
    //{ columnName: 'updatedAt', nameToShow: 'Actualizado', type: 'date', wrapHeader: true },
  ]

  protected inventoryByWarehouseColumns: ColumnDefinition[] = [
    { columnName: null, nameToShow: 'Bodega', type: 'string', noSort: true},
    { columnName: 'sku', nameToShow: 'SKU', type: 'string' },
    { columnName: 'name', nameToShow: 'Producto', type: 'string' },
    { columnName: 'stockCurrent', nameToShow: 'Stock', type: 'string', centerCol: true },
    { columnName: null, nameToShow: 'Salud de stock', type: 'string', centerCol: true },
    { columnName: null, nameToShow: 'Stock en Tránsito', type: 'string', noSort: true, centerCol: true },
    { columnName: 'avgCost', nameToShow: 'Costo Prom. Ponderado', type: 'string', noSort: true, centerCol: true },
  ]

  protected countColumns: ColumnDefinition[] = [
    { columnName: 'id', nameToShow: 'ID', type: 'string'},
    { columnName: 'status', nameToShow: 'Estado', type: 'string' },
    { columnName: null, nameToShow:'Progreso', type: 'string', showOnly: 'table', noSort: true, centerCol: true },
    { columnName: 'storeId', nameToShow: 'ID Tienda', type: 'string', showOnly: 'filter' },
    { columnName: 'storeName', nameToShow: 'Tienda', type: 'string'},
    { columnName: 'companyId', nameToShow: 'ID Empresa', type: 'string', showOnly: 'filter' },
    { columnName: 'warehouseId', nameToShow: 'ID Bodega', type: 'string', showOnly: 'filter' },
    { columnName: 'warehouseName', nameToShow: 'Bodega', type: 'string'},
    { columnName: 'createdBy', nameToShow: 'ID Autor', type: 'string', showOnly: 'filter' },
    { columnName: 'createdByName', nameToShow: 'Creador', type: 'string' },
    { columnName: 'assignedTo', nameToShow: 'ID Usuario asignado', type: 'string', showOnly: 'filter', maybeNull: true },
    { columnName: 'assignedToName', nameToShow: 'Asignado a', type: 'string', maybeNull: true, showIf: this.CAN_ASSIGN_COUNT },
    { columnName: 'scheduledAt', nameToShow: 'Inicio programado', type: 'date', maybeNull: true, wrapHeader: true },
    { columnName: 'completedAt', nameToShow: 'Finalización', type: 'date', maybeNull: true },
    { columnName: 'createdAt', nameToShow: 'Fecha creación', type: 'date', wrapHeader: true},
    { columnName: 'updatedAt', nameToShow: 'Última actualización', type: 'date', wrapHeader: true},
    // { columnName: null, nameToShow: 'Opciones', type: 'string', showOnly: 'table', noSort: true },
  ];

  protected userSearchBy: keyof UserAccount = 'userName';

  constructor() {
    // Inicializar datos mock de inventario
    //const mockData = generateMockInventoryData();
    //this.movements.set(mockData);
    // Cargar mock data directamente al controller
    //this.inventoryController.SetRawData(mockData);
    
    effect(() => {
        const selectedStore = this.selectedStore();
        if( !selectedStore ) return;

        untracked(() => {
          this.getWarehouses( selectedStore )
          //this.getInventories( selectedStore )
          this.selectedWarehouse.set( "Todas" );
        })
      
    })
    
    effect(() => {
      const currentMode = this.mode();

      localStorage.setItem('inventoryMode', currentMode);

      if (this.isInitialized) {
        untracked(() => {
          this.toggleMode(currentMode);
        });
      }
    });

    effect(() => {
      const currentMode = this.mode();

      if (!this.isInitialized) return;

      untracked(() => {
        this.fetchByMode(currentMode);
      });
    });

    effect(() => {
      const warehousesIds = this.selectedWarehousesIdForInventory();
      if (warehousesIds.length === 0) return;
      
      untracked(() => {
        this.getInventories( this.selectedStore(), warehousesIds );
      })
    })

    effect(() => {
      const inv = this.inventory();
      const showZero = this.showZeroStock();
      
      // Filtrar productos con stock cero si está desactivado
      const filteredInv = showZero 
        ? inv 
        : inv.map(warehouse => ({
            ...warehouse,
            products: warehouse.products.filter(p => p.totals.currentStock > 0)
          })).filter(warehouse => warehouse.products.length > 0);
      
      this.inventoryByWarehouseController.SetRawData(filteredInv);
    });

    effect(() => {
      this.countController.SetRawData(this.counts());
    })
  }


  onSortChange(event: { column: string, asc: boolean }) {
  const { column, asc } = event;

  function getValue(product: InventoryProduct, column: string) {
    switch (column) {
      case 'sku': return product.productTemplate.sku;
      case 'name': return product.productName || product.productName;
      case 'stockCurrent': return product.totals?.currentStock ?? 0;
      case 'avgCost': return product.totals?.avgCost ?? 0;
      default: return '';
    }
  }

  // Obtén los datos actuales por bodega
  const warehouses = this.inventoryByWarehouseController.GetData().data.slice();

  // Ordena los productos internos de cada bodega
  warehouses.forEach(warehouse => {
    warehouse.products.sort((a: InventoryProduct, b: InventoryProduct) => {
      const aValue = getValue(a, column);
      const bValue = getValue(b, column);
      if (aValue < bValue) return asc ? -1 : 1;
      if (aValue > bValue) return asc ? 1 : -1;
      return 0;
    });
  });

  // Actualiza el controller con el array ordenado
  this.inventoryByWarehouseController.SetRawData(warehouses);
}


  protected filtrarDatos(valor: string): void {
  const inv = this.inventory();
  const showZero = this.showZeroStock();
  
  // Si no hay búsqueda o está vacío, restaurar datos originales
  if (!valor || valor.trim() === '') {
    const filteredInv = showZero 
      ? inv 
      : inv.map(warehouse => ({
          ...warehouse,
          products: warehouse.products.filter(p => p.totals.currentStock > 0)
        })).filter(warehouse => warehouse.products.length > 0);
    
    this.inventoryByWarehouseController.SetRawData(filteredInv);
    return;
  }

  // El valor ya viene limpio desde SearchBarComponent
  const filtered = inv.map(warehouse => {
    const warehouseMatches = warehouse.warehouseName.toLowerCase().includes(valor);
    
    const matchingProducts = warehouse.products.filter(product => {
      const productMatches = 
        product.productTemplate.sku.toLowerCase().includes(valor) ||
        product.productName.toLowerCase().includes(valor);
      
      const hasStock = showZero || product.totals.currentStock > 0;
      
      return productMatches && hasStock;
    });
    
    if (warehouseMatches) {
      const productsToShow = showZero 
        ? warehouse.products 
        : warehouse.products.filter(p => p.totals.currentStock > 0);
      
      return {
        ...warehouse,
        products: productsToShow
      };
    }
    
    return {
      ...warehouse,
      products: matchingProducts
    };
  }).filter(warehouse => warehouse.products.length > 0);
  
  this.inventoryByWarehouseController.SetRawData(filtered);
}

  ngAfterViewInit(): void {
    this.toggleMode(this.mode());
    this.toggleInventoryView(this.inventoryViewMode());
    this.fetchByMode(this.mode());
    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    this.isInitialized = false;
  }

  private async getWarehouses(store: Store | null) {
    if( !store ) return;
    const response = await this.storeService.getWarehouses( store.id )
    if( !response ) return;

    
    this.warehouses.set( response );
    this.selectedWarehouse.set( "Todas" );

  }

  private async fetchByMode(mode: Mode): Promise<void> {
    if (mode === 'inventory') {
      await this.getInventories(this.selectedStore(), this.selectedWarehousesIdForInventory());
    } else if (mode === 'count') {
      await this.getCounts();
      await this.getAllUsersAvailables();
    }
  }

  protected countItemsMethod(count: Count): number {
    return count.metaData.filter(item => item.completed).length;
  }


  private async getCounts(): Promise<void> {
    
    //if (this.alreadyFetchedCount) return;

    //this.alreadyFetchedCount = true;

    const response = await this.countService.getCounts();

    if (!response) return;

    this.counts.set(response);
    //this.countMetadata.set(response.meta);
    
  }
  
  private async getInventories(
    store: Store | null,
    warehousesIds: string[]
  ): Promise<void> {
    //if (this.alreadyFetchedInventory) return;
    if( !store ) return;

    const companyId = this.companySharedService.selectedCompany()?.id;
    if( !companyId ) return;

    const response = await this.inventoryService.getInventory(
      companyId,
      store.id,
      warehousesIds
    );
    
    if (!response) return;

    this.inventory.set( response );
    
    //this.inventoryController.SetRawData( response );

    //this.alreadyFetchedInventory = true;
    /*

    const response = await this.inventoryService.getAllMovements(page);

    // Si hay respuesta del servidor, usar esos datos; si no, mantener los mock
    if (!response) return;

    this.movements.set(response.data);
    this.movementsMetadata.set(response.meta);
    */
  }

  protected onWarehouseChange(wareHouseId: string ): void {
    this.selectedWarehouse.set(wareHouseId);
  }

  

  /*
  protected handleCountPageChangeRequest(page: number): void {
    this.alreadyFetchedCount = false;
    this.getCounts(page); 
  }
  */
  /*
  protected handleInventoryPageChangeRequest(page: number): void {
    this.alreadyFetchedInventory = false;
    //this.getInventories(page);
  }
  */

  private toggleMode(mode: Mode): void {
    const inventoryBox = this.el.nativeElement.querySelector('.mode-toggler-item.inventory') as HTMLElement;
    const countBox = this.el.nativeElement.querySelector('.mode-toggler-item.count') as HTMLElement;
    const activeItem = this.el.nativeElement.querySelector('.active-item') as HTMLElement;

    if (!countBox || !inventoryBox || !activeItem) return;

    const countBoxWidth = countBox.offsetWidth;
    const inventoryBoxWidth = inventoryBox.offsetWidth;

    if (mode === 'inventory') {
      this.renderer.setStyle(activeItem, 'left', `.5rem`);
      this.renderer.setStyle(activeItem, 'width', `${inventoryBoxWidth}px`);

    } else if (mode === 'count') {
      this.renderer.setStyle(activeItem, 'left', `7.68rem`);
      this.renderer.setStyle(activeItem, 'width', `${countBoxWidth}px`);
    }
  }

  private getInitialMode(): Mode {
    const storedMode = localStorage.getItem('inventoryMode');
    return allowedModes.includes(storedMode as Mode) 
      ? (storedMode as Mode) 
      : 'inventory';
  }

  private getInitialViewMode(): ViewMode {
    // const storedViewMode = localStorage.getItem('inventoryViewMode');
    // return allowedViewModes.includes(storedViewMode as ViewMode)
    //   ? (storedViewMode as ViewMode)
    //   : 'product';
    return 'warehouse';
  }

  private getInitialShowZeroStock(): boolean {
    const saved = localStorage.getItem('inventoryShowZeroStock');
    return saved === null ? true : saved === 'true';
  }

  protected toggleShowZeroStock(): void {
    const newValue = !this.showZeroStock();
    this.showZeroStock.set(newValue);
    localStorage.setItem('inventoryShowZeroStock', String(newValue));
  }

  protected switchInventoryView(mode: ViewMode): void {
    this.inventoryViewMode.set(mode);
    localStorage.setItem('inventoryViewMode', mode);
    this.toggleInventoryView(mode);
  }

  private toggleInventoryView(mode: ViewMode): void {
    const productBox = this.el.nativeElement.querySelector('.inventory-view-toggler-item.product') as HTMLElement;
    const warehouseBox = this.el.nativeElement.querySelector('.inventory-view-toggler-item.warehouse') as HTMLElement;
    const activeItem = this.el.nativeElement.querySelector('.inventory-view-toggler .active-item') as HTMLElement;

    if (!productBox || !warehouseBox || !activeItem) return;

    const productBoxWidth = productBox.offsetWidth;
    const warehouseBoxWidth = warehouseBox.offsetWidth;

    if (mode === 'product') {
      this.renderer.setStyle(activeItem, 'left', '.5rem');
      this.renderer.setStyle(activeItem, 'width', `${productBoxWidth}px`);
    } else if (mode === 'warehouse') {
      this.renderer.setStyle(activeItem, 'left', `${productBoxWidth + 8}px`);
      this.renderer.setStyle(activeItem, 'width', `${warehouseBoxWidth}px`);
    }
  }

  private async getAllUsersAvailables(): Promise<void> {
    const response = await this.userService.getUsers();

    if (!response) return;

    const filteredUsers = response.filter(user => user.available);

    this.users.set(filteredUsers);
  }

  protected async changeCountScheduledDate(countId: CountDetail['id'], newDate: Date): Promise<void> {
    const response = await this.countService.changeDate(countId, newDate);

    if (!response) return;

    this.updateActualCountInList(response, countId);
  }

  protected async onUserSelectChange(count: Count, userSelected: UserAccount | null): Promise<void> {

    const { id: countId, assignedTo: oldId } = count;

    const response = await this.countService.changeUser(countId, oldId, userSelected ? userSelected.id : null);

    if (!response) return;

    const fixedResponse = {
      ...response,
      metaData: response.countItems!
    };

    delete fixedResponse.countItems;

    this.updateActualCountInList(fixedResponse, countId);
  }

  protected async cancelCount(countId: Count['id']): Promise<void> {
    const response = await this.countService.cancelCount(countId);

    if (!response) return;

    await this.getCounts();
  }

  protected async rejectCount(countId: Count['id']): Promise<void> {
    const response = await this.countService.rejectCount(countId);

    if (!response) return;

    this.counts.update(counts => {
      return counts.map(count => {
        if (count.id === countId) return {
          ...count,
          completedItems: 0,
          updatedAt: new Date(),
          status: 'rejected' as Count['status'],
          scheduledAt: response.scheduledAt,
        };

        return count;
      });
    });
  }

  protected isNowBefore(countDate: string | Date | null): boolean {
    if (!countDate) return false;

    const now = new Date().getTime();
    const scheduledDate = new Date(countDate).getTime();

    return now > scheduledDate;
  }

  private updateActualCountInList(updatedCount: Count, countId: CountDetail['id']): void {
    this.counts.update(counts => {
      return counts.map(count => {
        if (count.id === countId) return updatedCount;
        return count;
      });
    });
  }

  private convertInventoryByWarehouse(inventory: InventoryProduct[]): InventoryByWarehouse[] {
    const inventoryByWarehouseMap: Map<string, InventoryByWarehouse> = new Map();

    inventory.forEach(product => {
      product.stock.forEach(stockItem => {
        if (!inventoryByWarehouseMap.has(stockItem.warehouseId)) {
          inventoryByWarehouseMap.set(stockItem.warehouseId, {
            warehouseId: stockItem.warehouseId,
            warehouseName: stockItem.warehouseName,
            products: []
          });
        }

        const warehouseEntry = inventoryByWarehouseMap.get(stockItem.warehouseId);
        
        let _productCopy = structuredClone(product);
        _productCopy.stock = _productCopy.stock.filter(stock => stock.warehouseId === stockItem.warehouseId);
        _productCopy.totals.currentStock = stockItem.currentStock;
        _productCopy.totals.avgCost = stockItem.avgCost;
        warehouseEntry?.products.push(_productCopy);
      })
    });

    return Array.from(inventoryByWarehouseMap.values());
  }
}


