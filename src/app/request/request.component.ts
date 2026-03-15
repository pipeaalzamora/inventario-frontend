import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { Request } from '@/request/models/request';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { RequestService } from '@/request/services/request.service';
import { StoreService } from '@/shared/services/store.service';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, Renderer2, signal, untracked } from '@angular/core';
import { AuthService } from '@/auth/services/auth.service';
import { HumanDatePipe } from '@/shared/pipes/human-date.pipe';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PurchaseOrder } from './models/purchase-order';
import { LayoutService } from '@/shared/services/layout.service';
import { GoodsReceiptService } from './services/goods-receipt.service';
import { Receipt } from './models/receipt';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { MetaData } from '@/shared/models/apiResponse';
import { NavigateService } from '@/shared/services/navigate.service';
import { MobileCreateComponent, MobileCreateOption } from '@/shared/components/mobile-create/mobile-create.component';
import { MatTooltipModule } from '@angular/material/tooltip';
const allowedModes = ['request', 'order', 'receipt'] as const;
type Mode = typeof allowedModes[number];

const CONTROLLER_COMPONENTS = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent
]

@Component({
  selector: 'dot-request',
  imports: [
    CONTROLLER_COMPONENTS,
    LinkDirective,
    DropdownComponent,
    HumanDatePipe,
    DatePipe,
    LoadingDirective,
    NgTemplateOutlet,
    ClpCurrencyPipe,
    MobileCreateComponent,
    MatTooltipModule,
],
  templateUrl: './request.component.html',
  styleUrl: './request.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestComponent implements AfterViewInit, OnDestroy {
  private storeService = inject(StoreService);
  private authService = inject(AuthService);
  private requestService = inject(RequestService);
  private purchaseService = inject(PurchaseOrderService);
  private goodsReceiptService = inject(GoodsReceiptService);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private layoutService = inject(LayoutService);
  private navigateService = inject(NavigateService);

  private selectedStore = computed(() => this.storeService.selectedStore());

  protected requests = signal<Request[]>([]);
  protected orders = signal<PurchaseOrder[]>([]);
  protected receipts = signal<Receipt[]>([]);
  protected mode = signal<Mode>(this.getInitialMode());

  protected requestMetadata = signal<MetaData | undefined>(undefined);
  protected orderMetadata = signal<MetaData | undefined>(undefined);
  protected receiptMetadata = signal<MetaData | undefined>(undefined);

  private alreadyFetchedOrders = false;
  private alreadyFetchedRequests = false;
  private alreadyFetchedReceipt = false;
  private isInitialized = false;

  protected requestController = new PaginationController<Request>([], <PaginationControllerCFG>{
    defaultSearchColumns: [
      'id', 
      'displayId',
      'createdAt', 
      'updatedAt', 
      'requesterId', 
      'requesterName', 
      'storeName',
      'warehouseName',
      'storeId', 
      'warehouseId', 
      'requestType', 
      'status'
    ],
    sortColumn: 'updatedAt',
    sortAscending: false
  });

  protected orderController = new PaginationController<PurchaseOrder>([], <PaginationControllerCFG>{
    defaultSearchColumns: [
      'displayId',
      'supplierName',
      'storeName',
      'warehouseName',
      'status'
    ],
    sortColumn: 'updatedAt',
    sortAscending: false
  });

  protected receiptController = new PaginationController<Receipt>([], <PaginationControllerCFG>{
    defaultSearchColumns: [
      'displayId',
      'supplierName',
      'storeName',
      'warehouseName',
      'status'
    ],
    sortColumn: 'updated_at',
    sortAscending: false
  });

  protected mobileCreateOptions: MobileCreateOption[] = [
    { label: 'Crear solicitud', icon: 'fa-solid fa-plus', action: () => this.navigateService.replace('solicitud-form-new') },
    { label: 'Crear orden', icon: 'fa-solid fa-plus', action: () => this.navigateService.replace('purchase-order-form-new') }
  ]

  protected CAN_CREATE = this.authService.hasPower('request:create');
  protected CAN_UPDATE = this.authService.hasPower('request:update');
  protected CAN_RESOLVE = this.authService.hasPower('request:resolve');

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected requestColumns: ColumnDefinition[] = [
    { columnName: 'displayId', nameToShow: 'ID solicitud', type: 'string', noSort: true, centerCol: true },
    { columnName: 'status', nameToShow: 'Estado', type: 'array', posibleSelections: ['conflicted', 'approved', 'rejected'] },
    { columnName: 'requesterId', nameToShow: 'ID Solicitante', type: 'string', showOnly: 'filter' },
    { columnName: 'requesterName', nameToShow: 'Solicitante', type: 'string' },
    { columnName: 'storeName', nameToShow: 'Tienda', type: 'string' },
    { columnName: 'storeId', nameToShow: 'ID Tienda', type: 'string', showOnly: 'filter' },
    { columnName: 'warehouseName', nameToShow: 'Bodega', type: 'string' },
    { columnName: 'warehouseId', nameToShow: 'ID Bodega', type: 'string', showOnly: 'filter' },
    { columnName: 'requestType', nameToShow: 'Tipo', type: 'string' },
    { columnName: 'createdAt', nameToShow: 'Fecha creación', type: 'date', centerCol: true },
    { columnName: 'updatedAt', nameToShow: 'Última actualización', type: 'date', centerCol: true },
    // { columnName: null, nameToShow: 'Opciones', type: 'entity', noSort: true, centerCol: true, showOnly: 'table' },
  ];

  protected orderColumns: ColumnDefinition[] = [
    { columnName: 'displayId', nameToShow: 'ID Compra', type: 'string', noSort: true, centerCol: true },
    { columnName: 'status', nameToShow: 'Estado', type: 'array', posibleSelections: ['pending', 'approved', 'rejected'] },
    { columnName: 'inventoryRequestId', nameToShow: 'ID Solicitud', type: 'string',showOnly: 'filter'},
    { columnName: 'id', nameToShow: 'ID', type: 'string', showOnly: 'filter' },
    { columnName: 'supplierId', nameToShow: 'ID Proveedor', type: 'string', showOnly: 'filter' },
    { columnName: 'supplierName', nameToShow: 'Proveedor', type: 'string' },
    { columnName: 'storeId', nameToShow: 'ID Tienda', type: 'string', showOnly: 'filter' },
    { columnName: 'storeName', nameToShow: 'Tienda', type: 'string' },
    { columnName: 'warehouseId', nameToShow: 'ID Bodega', type: 'string', showOnly: 'filter' },
    { columnName: 'warehouseName', nameToShow: 'Bodega', type: 'string' },
    { columnName: 'createdAt', nameToShow: 'Fecha creación', type: 'date', centerCol: true },
    { columnName: 'updatedAt', nameToShow: 'Última actualización', type: 'date', centerCol: true },
    // { columnName: null, nameToShow: 'Opciones', type: 'entity', noSort: true, centerCol: true, showOnly: 'table' },
  ]

  protected receiptColumns: ColumnDefinition[] = [
    { columnName: 'displayId', nameToShow: 'ID Recepción', type: 'string', noSort: true, centerCol: true },
    { columnName: 'id', nameToShow: 'ID', type: 'string', showOnly: 'filter' },
    { columnName: 'status', nameToShow: 'Estado', type: 'array', posibleSelections: ['pending', 'completed'] },
    { columnName: 'user_id', nameToShow: 'ID Recibido por', type: 'string', showOnly: 'filter' },
    { columnName: 'user_name', nameToShow: 'Recibido por', type: 'string'},
    { columnName: 'folio_invoice', nameToShow: 'Folios', type: 'string', centerCol: true, noSort: true },
    { columnName: 'supplierId', nameToShow: 'ID Proveedor', type: 'string', showOnly: 'filter' },
    { columnName: 'supplierName', nameToShow: 'Proveedor', type: 'string' },
    { columnName: 'storeId', nameToShow: 'ID Tienda', type: 'string', showOnly: 'filter' },
    { columnName: 'storeName', nameToShow: 'Tienda', type: 'string' },
    { columnName: 'warehouseId', nameToShow: 'ID Bodega', type: 'string', showOnly: 'filter' },
    { columnName: 'warehouseName', nameToShow: 'Bodega', type: 'string' },
    { columnName: 'due_date', nameToShow: 'Fecha de entrega', type: 'date', centerCol: true },
    { columnName: 'comment', nameToShow: 'Comentario', type: 'string', showOnly: 'filter' },
    { columnName: 'total', nameToShow: 'Total', type: 'number', centerCol: true },
    { columnName: 'created_at', nameToShow: 'Fecha creación', type: 'date', centerCol: true },
    { columnName: 'updated_at', nameToShow: 'Última actualización', type: 'date', centerCol: true }
  ]

  constructor() {

    effect(() => {
      const store = this.selectedStore();
      
      if (!store) return;

      this.alreadyFetchedOrders = false;
      this.alreadyFetchedRequests = false;
      this.alreadyFetchedReceipt = false;

      if (this.isInitialized) untracked(() => this.fetchByMode(this.mode()));
    });

    effect(() => {
      const currentMode = this.mode();

      localStorage.setItem('mode', currentMode);

      if (!this.isInitialized) return;

      untracked(() => {
        this.fetchByMode(currentMode);
        this.toggleMode(currentMode);
      });
    });

    effect(() => {
      this.requestController.SetRawData(this.requests());
    });

    effect(() => {
      this.orderController.SetRawData(this.orders());
    });

    effect(() => {
      this.receiptController.SetRawData(this.receipts());
    });
  }

  ngAfterViewInit(): void {
    this.isInitialized = true;
    this.toggleMode(this.mode());

    if (this.selectedStore()) this.fetchByMode(this.mode());
  }

  ngOnDestroy(): void {
    this.isInitialized = false;
  }
  
  private async fetchByMode(mode: Mode): Promise<void> {
    if (mode === 'order') await this.getOrders();
    else if (mode === 'receipt') await this.getReceipts();
    else await this.getRequests();
  }

  protected async getRequests(page = 1): Promise<void> {
    if (this.alreadyFetchedRequests) return;

    this.alreadyFetchedRequests = true;

    const storeId = this.selectedStore()?.id;

    if (!storeId) return;

    const response = await this.requestService.getRequestByPagination(storeId, page);

    if (!response) return;

    this.requestMetadata.set(response.meta);
    this.requests.set(response.data);
  }

  private async getReceipts(page = 1): Promise<void> {
    if (this.alreadyFetchedReceipt) return;

    this.alreadyFetchedReceipt = true;

    const storeId = this.selectedStore()?.id;

    if (!storeId) return;

    const response = await this.goodsReceiptService.getGoodsReceiptByStorePaginated(storeId, page);

    if (!response) return;

    this.receipts.set(response.data);
    this.receiptMetadata.set(response.meta);
  }

  protected async getOrders(page = 1): Promise<void> {
    if (this.alreadyFetchedOrders) return;

    this.alreadyFetchedOrders = true;

    const storeId = this.selectedStore()?.id;

    if (!storeId) return;

    const response = await this.purchaseService.getPurchasesByStorePaginated(storeId, page);

    if (!response) return;

    this.orders.set(response.data);
    this.orderMetadata.set(response.meta);
  }

  protected handlePageChangeReceipt(page: number): void {
    this.alreadyFetchedReceipt = false;
    this.getReceipts(page);
  }

  protected handlePageChangeOrder(page: number): void {
    this.alreadyFetchedOrders = false;
    this.getOrders(page);
  }

  protected handlePageChangeRequest(page: number): void {
    this.alreadyFetchedRequests = false;
    this.getRequests(page);
  }

  private toggleMode(mode: Mode): void {
    const requestBox = this.el.nativeElement.querySelector('.mode-toggler-item.request') as HTMLElement;
    const orderBox = this.el.nativeElement.querySelector('.mode-toggler-item.order') as HTMLElement;
    const receiptBox = this.el.nativeElement.querySelector('.mode-toggler-item.receipt') as HTMLElement;
    const activeItem = this.el.nativeElement.querySelector('.active-item') as HTMLElement;

    if (!requestBox || !orderBox || !activeItem) return;

    const orderBoxWidth = orderBox.offsetWidth;
    const requestBoxWidth = requestBox.offsetWidth;
    const receiptBoxWidth = receiptBox.offsetWidth;

    if (mode === 'request') {
      this.renderer.setStyle(activeItem, 'left', `.5rem`);
      this.renderer.setStyle(activeItem, 'width', `${requestBoxWidth}px`);

    } else if (mode === 'order') {
      this.renderer.setStyle(activeItem, 'left', `8.1rem`);
      this.renderer.setStyle(activeItem, 'width', `${orderBoxWidth}px`);
    } else if (mode === 'receipt') {
      this.renderer.setStyle(activeItem, 'left', `14.4rem`);
      this.renderer.setStyle(activeItem, 'width', `${receiptBoxWidth}px`);
    }
  }

  private getInitialMode(): Mode {
    const storedMode = localStorage.getItem('mode');
    return allowedModes.includes(storedMode as Mode) 
      ? (storedMode as Mode) 
      : 'request';
  }
}