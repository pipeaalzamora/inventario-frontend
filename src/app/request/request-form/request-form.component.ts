import { AuthService } from '@/auth/services/auth.service';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { CompanyProduct, ProductRestricted } from '@/shared/models/products';
import { Conflict, ProductPayload, ProductPayloadFront, Request, RequestDetail, RequestPayload } from '@/request/models/request';
import { Store, StoreWarehouse } from '@/shared/models/store';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { RequestService } from '@/request/services/request.service';
import { StoreService as SharedStoreService } from '@/shared/services/store.service';
import { DatePipe, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild} from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { NoImageComponent } from 'public/default/no-image.component'
import { StatusHistoryComponent } from '@/request/components/status-history/status-history.component';
import { NavigateService } from '@/shared/services/navigate.service';
import { ProductListComponent } from '@/request/components/product-list/product-list.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { LinkDirective } from "@/shared/directives/link.directive";
import { CopyClipboardButtonComponent } from '@/shared/components/copy-clipboard-button/copy-clipboard-button.component';
import { UnitMeasuresPipe } from '@/shared/pipes/unit-measures.pipe';
import { StoreService } from '@/my-company/store/services/store.service';
import { CompanyService } from '@/shared/services/company.service';

const CONTROLLER_COMPONENTS = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent
]

@Component({
  selector: 'dot-request-form',
  imports: [
    ModalComponent,
    CONTROLLER_COMPONENTS,
    MatExpansionModule,
    NgTemplateOutlet,
    NoImageComponent,
    NgOptimizedImage,
    SelectComponent,
    InputDirective,
    DatePipe,
    StatusHistoryComponent,
    MatExpansionModule,
    ProductListComponent,
    GoBackComponent,
    SectionWrapperComponent,
    LinkDirective,
    CopyClipboardButtonComponent,
    UnitMeasuresPipe,
],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestFormComponent {
  private layoutService = inject(LayoutService);
  private sharedStoreService = inject(SharedStoreService);
  private storeService = inject(StoreService);
  private requestService = inject(RequestService);
  private router = inject(Router);
  private navigateService = inject(NavigateService);
  protected authService = inject(AuthService);
  private companyService = inject(CompanyService);

  protected columns: ColumnDefinition[] = [
    { columnName: 'id', nameToShow: 'ID', type: 'string', noSort: true, centerCol: true, showOnly: 'filter' },
    { columnName: 'image', nameToShow: 'Imagen', type: 'entity', noSort: true, centerCol: true},
    { columnName: 'productName', nameToShow: 'Producto', type: 'string' },
    { columnName: 'description', nameToShow: 'Descripción', type: 'string', showOnly: 'filter' },
    { columnName: 'maxQuantity', nameToShow: 'Max. Cantidad', type: 'number', centerCol: true },
    { columnName: 'createdAt', nameToShow: 'Fecha de creación', type: 'date', showOnly: 'filter' },
    { columnName: 'unit', nameToShow: 'U. medida', type: 'string' },
  ];

  private requestId = signal<string | null>(null);
  protected actualRequest = signal<RequestDetail | null>(null);
  protected date = signal<Date>(new Date());
  protected isExpansibleOpen = signal<boolean>(true); 

  protected products = signal<CompanyProduct[]>([]);
  protected warehouses = signal<StoreWarehouse[]>([]);
  protected selectedProducts = signal<ProductPayloadFront[]>([]);
  protected warehouseSeachKey = 'warehouseName' as keyof StoreWarehouse;

  private selectedProductToBack = computed<ProductPayload[]>(() => this.selectedProducts().map(p => ({ itemId: p.id, quantity: p.quantity })));
  protected selectedProductsMaxQuantity = computed<ProductPayloadFront[]>(() => {
    return this.selectedProducts().filter(p => p.quantities!.maxQuantity && p.quantity > p.quantities!.maxQuantity);
  });
  protected isMobile = computed(() => this.layoutService.isMobile());
  protected isLaptop = computed(() => this.layoutService.isLaptop());
  protected isDesktop = computed(() => this.layoutService.isDesktop());
  private handlePageSize = computed<number>(() => {
    if (this.isMobile()) return 5;
    else if (this.isLaptop()) return 5;
    else if (this.isDesktop()) return 10;
    else return 12;
  });
  protected selectedCompany = this.companyService.selectedCompany;
  private observationValue = signal<string>('');
  protected selectedStore = computed<Store | null>(() => this.sharedStoreService.selectedStore());
  protected selectedWarehouse = signal<StoreWarehouse | null>(null);
  private requestPayload = computed<RequestPayload | null>(() => {
    if (!this.selectedStore() || (this.warehouses().length === 0 || !this.selectedWarehouse())) return null
    const warehouseId = this.selectedWarehouse() ? this.selectedWarehouse()!.id : this.warehouses()[0].id

    return {
      storeId: this.selectedStore()!.id,
      companyId: this.selectedCompany()!.id,
      warehouseId: warehouseId,
      requesterId: this.authService.userAccount()!.id,
      observation: this.observationValue() ?? '',
      requestType: 'supplier_request',
      items: this.selectedProductToBack()
    }
  });
  protected userEdited = computed<boolean>(() => {
    const payload = this.requestPayload();
    const actual = this.actualRequest();

    if (!payload || !actual) return false;

    // Store/Warehouse changed
    if (payload.storeId !== actual.storeId || payload.warehouseId !== actual.warehouseId) return true;

    // Any non-empty observation counts as an edit (ignore whitespace)
    if (this.observationValue().trim().length > 0) return true;

    // Compare items by relevant fields only (itemId + quantity), ignoring extra fields like purchaseUnit
    const norm = (items: Array<{ itemId?: string; quantity?: number }>) =>
      items
        .map(i => ({ itemId: i.itemId ?? '', quantity: i.quantity ?? 0 }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId) || a.quantity - b.quantity);

    const payloadItems = norm((payload.items as Array<{ itemId?: string; quantity?: number }>) ?? []);
    const actualItems = norm((actual.items as Array<{ itemId?: string; quantity?: number }>) ?? []);

    if (payloadItems.length !== actualItems.length) return true;

    for (let i = 0; i < payloadItems.length; i++) {
      const a = payloadItems[i];
      const b = actualItems[i];
      if (a.itemId !== b.itemId || a.quantity !== b.quantity) return true;
    }

    return false;
  })

  protected CAN_RESOLVE = this.authService.hasPower('request:resolve');
  protected CAN_EDIT = computed(() => {
    if (!this.actualRequest() && this.authService.hasPower('request:create')) return true;
    else if (
      this.actualRequest() && 
      this.authService.hasPower('request:update') && 
      !this.authService.hasPower('request:resolve') &&
      this.actualRequest()!.status !== 'conflicted'
    ) return true;
    else if (
      this.authService.hasPower('request:resolve')
    ) return true

    return false
  });
  protected CAN_CREATE = this.authService.hasPower('request:create');

  private confirmationModal = viewChild<ModalComponent>('confirmationModal');
  private responseRequestModal = viewChild<ModalComponent>('responseRequestModal');

  protected controller = new PaginationController<CompanyProduct>([], <PaginationControllerCFG>{
    pageSize: this.handlePageSize(),
    defaultSearchColumns: ["productName", "description"],
  });

  constructor() {
    effect(() => {
      this.controller.SetPageSize(this.handlePageSize());
    })

    effect(() => {
      this.controller.SetRawData(this.products());
    });

    effect(() => {
      if (this.selectedStore()) this.selectedProducts.set([]);
    })

    effect(() => {
      if (!this.CAN_EDIT()) this.sharedStoreService.cantSelectStore.set(true);
      else this.sharedStoreService.cantSelectStore.set(false);
    })

    effect(() => {
      const selectedStore = this.selectedStore();

      if (!selectedStore) return;

      untracked(() => {
        this.getWarehousesByStoreId(selectedStore.id);
        this.getProducts(selectedStore.id);
      })
    });

    effect(() => {
      const products = this.products();

      if (products.length > 0 && this.actualRequest()) {
        for (const product of this.actualRequest()!.items) {
          const find = products.find(p => p.id === product.itemId);
  
          if (find) {
            untracked(() => this.selectedProducts.update(products => [...products, {...find, quantity: product.quantity}]));
          };
        }
      };

    });

    effect(() => {
      const actualRequest = this.actualRequest();

      if (!actualRequest) return;
      
      if (this.actualRequest()?.storeId !== this.selectedStore()?.id) {
        const find = this.storeService.stores().find(s => s.id === this.actualRequest()!.storeId);

        if (find) this.sharedStoreService.selectedStore.set(find);
      }

      if (this.actualRequest()?.warehouseId) {
        const find = this.warehouses().find(w => w.id === this.actualRequest()!.warehouseId);
        
        if (find) this.selectedWarehouse.set(find);
      }
    })

    const requestId = this.router.url.split('/').at(-1);

    if (requestId && requestId !== 'new') {
      this.requestId.set(requestId);

      this.getActualRequest();
    }
  }

  protected async sendRequest():Promise<void> {
    if (this.selectedProducts().length === 0) return;

    if (this.userEdited()) return await this.updateRequest();
    if (this.actualRequest() && this.CAN_RESOLVE) return await this.handleRequestStatus('approved');
    else if (this.actualRequest() && !this.CAN_RESOLVE) {
      return await this.updateRequest();
    }

    const response = await this.requestService.createRequest(this.requestPayload()!);

    if (!response) return;

    this.confirmationModal()?.closeModal();

    if(response.status === 'approved') {
      this.navigateService.replace('solicitud-orders', { id: response.id });
      return;
    }

    if(this.CAN_RESOLVE) {
      this.selectedProducts.set([]);
      this.requestId.set(response.id);
      this.actualRequest.set(response);
      return;
    }

    this.navigateService.replace('request');
  }

  protected async updateRequest(): Promise<void> {
    const response = await this.requestService.editRequest(this.requestId()!, this.requestPayload()!);

    if (response) {
      this.confirmationModal()?.closeModal();
      this.updateActualRequest(response);
      this.navigateService.push('request');
    }
  }

  private async getProducts(selectedStoreId: Store['id']): Promise<void> {
    const response = await this.storeService.getProductsForRequest(selectedStoreId);
    
    this.products.set(response);
  }

  protected async handleRequestStatus(action: Extract<Request['status'], 'rejected' | 'approved' | 'cancelled'>): Promise<void> {
    if (!this.requestId() || !this.CAN_RESOLVE) return;

    const observation = this.observationValue();

    switch (action) {
      case 'rejected':
        await this.rejectRequest(this.requestId()!, observation);
        break;

      case 'cancelled':
        await this.cancelRequest(this.requestId()!, observation);
        break;

      case 'approved':
        await this.approveRequest(this.requestId()!);
        break;
    }

    this.responseRequestModal()?.closeModal();
  }

  private async getActualRequest(): Promise<void> {
    if (!this.requestId()) return;

    const response = await this.requestService.getRequest(this.requestId()!);

    if (!response) return;

    this.sharedStoreService.cantSelectStore.set(true);

    this.actualRequest.set(response);
  }

  protected async getWarehousesByStoreId(storeId: Store['id']): Promise<void> {
    const response = await this.storeService.getWarehouses(storeId) //.getWarehousesByStoreId(storeId);
    if (!response) return;

    this.warehouses.set(response);
    this.selectedWarehouse.set(response[0]);
  }

  protected selectProduct(product: CompanyProduct) : void {
    if (!this.CAN_EDIT()) return;

    if (this.selectedProducts().some(p => p.id === product.id)) return this.unselectProduct(product);

    this.selectedProducts.update(products => [{...product, quantity: 1}, ...products]);
  }

  protected unselectProduct(product: CompanyProduct | ProductPayloadFront) : void {
    if (!this.CAN_EDIT()) return;

    this.selectedProducts.update(products => products.filter(p => p.id !== product.id));
  }

  protected updateProducts(products: ProductPayloadFront[]): void {
    this.selectedProducts.set(products);
  }

  protected isSelected(product: CompanyProduct):boolean {
    return this.selectedProducts().some(p => p.id === product.id);
  }

  protected eraseAll() {
    if (!this.CAN_EDIT()) return;

    this.selectedProducts.set([]);
  }

  protected warehouseChange(warehouse: StoreWarehouse | null): void {
    if (!this.CAN_EDIT()) return;

    this.selectedWarehouse.set(warehouse);
  }

  protected getProductFromId(productId: CompanyProduct['id']): CompanyProduct | ProductPayloadFront {
    const find = this.products().find(p => p.id === productId) || this.selectedProducts().find(p => p.id === productId);

    return find!;
  }

  private async rejectRequest(requestId: Request['id'], observation: string | undefined): Promise<void> {
    const response = await this.requestService.rejectRequest(requestId, observation);
    
    if (response) this.updateActualRequest(response);

    this.navigateService.push('request');
  }

  private async cancelRequest(requestId: Request['id'], observation: string | undefined): Promise<void> {
    const response = await this.requestService.cancelRequest(requestId, observation);
    
    if (response) this.updateActualRequest(response);

    this.navigateService.push('request');
  }

  private async approveRequest(requestId: Request['id']): Promise<void> {

    const response = await this.requestService.approveRequest(requestId, this.requestPayload()!);
    
    if (response) {
      this.updateActualRequest(response);
      this.navigateService.push('request');
    }
  }

  private updateActualRequest(res: Request): void {
    if (!this.actualRequest()) return;

    this.actualRequest.update(request => {
      return {
        ...request!,
        storeId: res.storeId,
        warehouseId: res.warehouseId,
        status: res.status,
        updatedAt: res.updatedAt,
      }
    })
  }

  protected async sendRequestAndApprove(): Promise<void> {
    if (this.actualRequest()) return await this.approveRequest(this.actualRequest()!.id);

    const response = await this.requestService.createRequest(this.requestPayload()!);

    if (!response) return;

    await this.approveRequest(response.id);

    this.navigateService.push('request');
  }

  protected setObservationValue(event: Event):void {
    const value = (event.target as HTMLInputElement).value;

    this.observationValue.set(value);
  }

  protected isConflictSolved(conflict: Conflict):boolean {
    return !this.selectedProductsMaxQuantity().some(p => p.id === conflict.itemId);
  }

  protected setMaxQuantity(productId: ProductRestricted['id']):void {
    if (!this.CAN_EDIT()) return;

    this.selectedProducts.update(products => {
      return products.map(p => p.id === productId ? {...p, quantity: p.quantities?.maxQuantity!} : p);
    })
  }
}
