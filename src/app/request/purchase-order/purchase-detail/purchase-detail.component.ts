import { ChildrenPurchases, PurchaseOrderDetail, PurchaseOrderItem } from '@/request/models/purchase-order';
import { PurchaseOrderService } from '@/request/services/purchase-order.service';
import { ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { RedirectOptions, TimelineComponent } from '@/shared/components/timeline/timeline.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { SectionWrapperComponent } from "@/shared/layout/components/section-wrapper/section-wrapper.component";
import { TabsComponent } from '@/shared/components/tabs/tabs.component';
import { StatusHistoryComponent } from '@/request/components/status-history/status-history.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { NavigateService } from '@/shared/services/navigate.service';
import { StoreService } from '@/shared/services/store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { LinkDirective } from '@/shared/directives/link.directive';
import { CopyClipboardButtonComponent } from '@/shared/components/copy-clipboard-button/copy-clipboard-button.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { AuthService } from '@/auth/services/auth.service';

@Component({
  selector: 'dot-purchase-order-form',
  imports: [
    NgTemplateOutlet,
    TimelineComponent,
    MatExpansionModule,
    ClpCurrencyPipe,
    ModalComponent,
    DatePipe,
    SorterHeaderComponent,
    GoBackComponent,
    SectionWrapperComponent,
    TabsComponent,
    StatusHistoryComponent,
    InputDirective,
    DropdownComponent,
    LinkDirective,
    CopyClipboardButtonComponent
],
  templateUrl: './purchase-detail.component.html',
  styleUrl: './purchase-detail.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrderFormComponent implements OnInit {
  private layouteService = inject(LayoutService);
  private route = inject(ActivatedRoute);
  private purchaseService = inject(PurchaseOrderService);
  private navigateService = inject(NavigateService);
  private authService = inject(AuthService);
  private storeService = inject(StoreService);

  protected productController = new PaginationController<PurchaseOrderItem>([], <PaginationControllerCFG>{slicedMode:false, sortColumn:'quantity'});
  protected productColumns: ColumnDefinition[] = [
    { nameToShow: 'Producto', columnName: 'productName', type: 'string'},
    { nameToShow: 'Estado', columnName: 'status', type: 'string', noSort:true, centerCol:true },
    { nameToShow: 'U. Medida', columnName: 'purchaseUnit', type: 'string', centerCol:true },
    { nameToShow: 'Cantidad', columnName: 'quantity', type: 'number', centerCol:true },
    { nameToShow: 'Precio unitario (CLP)', columnName: 'unitPrice', type: 'number', centerCol:true},
    { nameToShow: 'Subtotal (CLP)', columnName: 'subtotal', type: 'number', centerCol:true },
  ]

  protected isExpandibleOpen = signal<boolean>(true);
  protected observationValue = signal<string>('');
  protected actualPurchase = signal<PurchaseOrderDetail | null>(null);

  protected products = computed<PurchaseOrderItem[]>(() => this.actualPurchase()?.items || []);
  protected rejectedProducts = computed<PurchaseOrderItem[]>(() => this.products().filter(p => p.status === 'rejected') || []);
  
  protected isMobile = computed(() => this.layouteService.isMobile());
  protected isTablet = computed(() => this.layouteService.isTablet());
  protected isLaptop = computed(() => this.layouteService.isLaptop());
  protected isDesktop = computed(() => this.layouteService.isDesktop());

  protected childLinks = computed<RedirectOptions<ChildrenPurchases> | undefined>(() => {
    const actualPurchase = this.actualPurchase();

    if (!actualPurchase) return undefined;

    return {
      route: 'purchase-order-form',
      paramName: 'orderId',
      linkTo: actualPurchase.childrenPurchase ?? []
    }
  })

  protected discountAmount = computed(() => {
    // return this.fakeProducts().reduce((acc, item) => acc + item.discount, 0);
    return 0;
  });

  protected subTotalAmount = computed(() => {
    return this.products().reduce((acc, item) => acc + item.subtotal, 0);
  });

  protected TAX_AMOUNT = 19;

  protected taxAmount = computed(() => {
    return this.subTotalAmount() * (this.TAX_AMOUNT / 100);
  });

  protected totalAmount = computed(() => {
    return (this.subTotalAmount() - this.discountAmount()) + this.taxAmount();
  });

  private cancelOrderModal = viewChild<ModalComponent>('cancelOrder')

  protected predefinedTimeline = [
    { name: 'pending', translatedName: 'Pendiente', icon: 'fa-solid fa-hourglass-half' },
    { name: 'on_delivery', translatedName: 'En camino', icon: 'fa-solid fa-truck-fast' },
    { name: 'arrived', translatedName: 'Llegada a bodega', icon: 'fa-solid fa-boxes-packing' },
    { name: 'completed', translatedName: 'Completada', icon: 'fa-solid fa-circle-check' },
  ];

  protected CAN_RESOLVE = true; // TODO: permisos
  protected CAN_APPROVE = this.authService.hasPower('purchase:approve');

  constructor() {

    this.route.params.pipe(
      tap((params) => {
        const purchaseId = params['orderId'];

        if (purchaseId) this.getPurchase(purchaseId);
      }),
      takeUntilDestroyed()
    ).subscribe();

    effect(() => {
      this.productController.SetRawData(this.products());
    });
  }

  ngOnInit(): void {
    this.storeService.cantSelectStore.set(true);
  }

  protected async getPurchase(purchaseId: string): Promise<void> {
    const response = await this.purchaseService.getPurchaseById(purchaseId);

    if (!response) return;
    
    this.actualPurchase.set(response);
  }

  protected setObservationValue(event: Event):void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.observationValue.set(value);
  }

  protected async retryPurchase(): Promise<void> {
    const purchaseId = this.actualPurchase()?.id;

    const response = await this.purchaseService.retryPurchase(purchaseId!);

    if (!response) return;

    this.navigateService.push('request');
  }

  protected async cancelPurchase(): Promise<void> {
    const purchaseId = this.actualPurchase()?.id;

    const response = await this.purchaseService.cancelPurchase(purchaseId!, this.observationValue());

    if (!response) return;

    this.actualPurchase.set(response);

    this.cancelOrderModal()?.closeModal();
  }

  protected async approvePurchase(): Promise<void> {
    const response = await this.purchaseService.aprovePurchase(this.actualPurchase()!.id);

    if (!response) return;

    this.actualPurchase.set(response);
  }

  protected someProductRejected(): boolean {
    return this.products().some(product => product.status === 'rejected');
  }

  protected redirectToSonPurchase() {
    if (!this.actualPurchase()?.sonPurchaseId!) return;

    this.navigateService.push('purchase-order-form', { orderId: this.actualPurchase()?.sonPurchaseId! });
  }

  protected removeDeliveryNoteCard(deliveryNoteCard: HTMLDivElement): void {
    if (!document.startViewTransition) {
      deliveryNoteCard.remove();
      return;
    }

    document.startViewTransition(() => deliveryNoteCard.remove());
  }
}
