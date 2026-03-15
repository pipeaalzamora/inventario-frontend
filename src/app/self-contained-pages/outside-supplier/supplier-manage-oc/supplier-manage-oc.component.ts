import { PurchaseOrderDetail, PurchaseOrderItem } from '@/request/models/purchase-order';
import { ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { OnScrollToolbarComponent } from '@/shared/layout/components/on-scroll-toolbar/on-scroll-toolbar.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ManageOcService } from '@self-contained-pages/outside-supplier/services/manage-oc.service';
import { ActivatedRoute } from '@angular/router';
import { tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputDirective } from '@/shared/directives/input.directive';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'dot-supplier-manage-oc',
  imports: [
    SearchBarComponent,
    SorterHeaderComponent,
    ClpCurrencyPipe,
    ModalComponent,
    OnScrollToolbarComponent,
    InputDirective,
    DatePipe
  ],
  templateUrl: './supplier-manage-oc.component.html',
  styleUrl: './supplier-manage-oc.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierManageOcComponent {
  private layoutService = inject(LayoutService);
  private manageOcService = inject(ManageOcService);
  private route = inject(ActivatedRoute);

  private actualToken:string = '';

  protected isLoading = signal<boolean>(true);
  protected selectedProducts = signal<PurchaseOrderItem[]>([]);
  protected bulkValue = signal<boolean>(false);
  protected actualPurchase = signal<PurchaseOrderDetail | null>(null);
  protected observationValue = signal<string>('');

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected productApproved = computed(() => this.products()!.filter(p => p.status === 'approved'));
  protected getTotalApproved = computed(() => this.productApproved().reduce((acc, item) => acc + item.subtotal, 0));

  protected productRejected = computed(() => this.products()!.filter(p => p.status === 'rejected'));
  protected getTotalRejected = computed(() => this.productRejected().reduce((acc, item) => acc + item.subtotal, 0));

  protected getTotal = computed(() => this.products()!.reduce((acc, item) => acc + item.subtotal, 0));

  protected productPending = computed(() => this.products()!.filter(p => p.status === 'pending'));

  protected products = computed<PurchaseOrderDetail['items']>(() => this.actualPurchase()?.items || []);

  private confirmationModal = viewChild<ModalComponent>('confirmationModal')

  protected controller = new PaginationController<PurchaseOrderItem>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['purchaseId', 'productName'],
    slicedMode: false
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Producto', columnName: 'productName', type: 'string' },
    { nameToShow: 'Estado', columnName: 'status', type: 'string', noSort: true, centerCol: true },
    { nameToShow: 'Cantidad', columnName: 'quantity', type: 'number', centerCol: true },
    { nameToShow: 'Precio unitario (CLP)', columnName: 'unitPrice', type: 'number', centerCol: true },
    { nameToShow: 'Subtotal (CLP)', columnName: 'subtotal', type: 'number', centerCol: true },
  ];

  constructor() {
    this.route.queryParams.pipe(
      tap(async params => {
        const token = params['token'];

        const response = await this.manageOcService.getPurchaseByToken(token);

        if (!response) return;

        this.actualToken = token;

        this.actualPurchase.set(response);

        this.isLoading.set(false)
      }),
      takeUntilDestroyed()
    ).subscribe();

    effect(() => {
      this.controller.SetRawData(this.products()!);
    });
  }

  protected selectProduct(product: PurchaseOrderItem):void {
    if (this.isSelected(product)) {
      this.deleteSelected(product);
      return;
    }
    
    this.selectedProducts.update(products => [...products, product]);
  }

  protected toggleSelectionByCheckbox(event: Event, product: PurchaseOrderItem):void {
    event.stopPropagation();
    event.preventDefault();

    const checked: boolean = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedProducts.update(products => [...products, product]);
    } else {
      this.deleteSelected(product);
    }
  }

  protected isSelected(product: PurchaseOrderItem):boolean {
    return this.selectedProducts().some(p => p.id === product.id);
  }

  protected deleteSelected(product: PurchaseOrderItem):void {
    this.selectedProducts.update(products => products.filter(p => p.id !== product.id));
  }

  protected switchSelectedStatus(status: 'approved' | 'rejected'):void {
    if (this.selectedProducts().length === 0) return;

    const selectedIds = this.selectedProducts().map(p => p.id);

    this.actualPurchase.update(purchase => {
      if (!purchase) return purchase;
      return {
        ...purchase,
        items: purchase.items!.map(p => selectedIds.includes(p.id) ? { ...p, status: status } : p)
      };
    })

    this.selectedProducts.set([]);
    this.bulkValue.set(false);
  }

  protected selectedAllStatus(status: 'approved' | 'rejected'):boolean {
    return this.selectedProducts().every(p => p.status === status) && this.selectedProducts().length > 0;
  }

  protected toggleSelectAll(checked: boolean):void {
    this.bulkValue.set(checked);

    if (!checked) {
      this.selectedProducts.set([]);
      return;
    }

    this.selectedProducts.set([...this.controller.GetData().data]);
  }

  protected setObservationValue(event:Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.observationValue.set(value);
  }

  protected async postPurchase(): Promise<void> {
    const token = this.actualToken;

    if (!token || token === '') return;

    const body = {
      purchaseId: this.actualPurchase()!.id,
      observation: this.observationValue(),
      items: this.products()!.map(p => ({ itemId: p.id, accepted: p.status === 'approved' }))
    }

    this.confirmationModal()?.closeModal();

    await this.manageOcService.postPurchaseByToken(token, body);
  }
}
