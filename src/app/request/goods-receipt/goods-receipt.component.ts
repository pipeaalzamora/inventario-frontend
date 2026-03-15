import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Renderer2, signal, untracked } from '@angular/core';
import { SectionWrapperComponent } from "@/shared/layout/components/section-wrapper/section-wrapper.component";
import { GoBackComponent } from "@/shared/components/go-back/go-back.component";
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { Router } from '@angular/router';
import { PurchaseOrderService } from '@/request/services/purchase-order.service';
import { PurchaseOrder, PurchaseOrderItem } from '@/request/models/purchase-order';
import { ReceiptPost } from '@/request/models/receipt';
import { GoodsReceiptService } from '@/request/services/goods-receipt.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { DatePipe } from '@angular/common';
import { LayoutService } from '@/shared/services/layout.service';
import { InputDirective } from '@/shared/directives/input.directive';
import { CompanyService } from '@/shared/services/company.service';

type Product = Omit<PurchaseOrderItem, 'status'> & {
  expectedQuantity: number;
  quantity: number;
  unitPrice: number;
  status: 'pending' | 'approved' | 'partial' | 'rejected' | 'exceded';
}

@Component({
  selector: 'dot-goods-receipt',
  imports: [
    SectionWrapperComponent,
    GoBackComponent,
    SearchBarComponent,
    ClpCurrencyPipe,
    ModalComponent,
    DatePipe,
    InputDirective,
],
  templateUrl: './goods-receipt.component.html',
  styleUrl: './goods-receipt.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoodsReceiptComponent {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private router = inject(Router);
  private purchaseService = inject(PurchaseOrderService);
  private receiptService = inject(GoodsReceiptService);
  private navigateService = inject(NavigateService);
  private layoutService = inject(LayoutService)
  private companyService = inject(CompanyService);

  protected products = signal<Product[]>([]);

  protected productsToBack = computed(() => {
    return this.products().map(product => ({
      storeProductId: product.id,
      quantity: product.quantity,
    }));
  });

  private selectedCompany = this.companyService.selectedCompany;

  protected pendingProducts = computed(() => this.products().filter(p => p.status === 'pending'));
  protected approvedProducts = computed(() => this.products().filter(p => p.status === 'approved'));
  protected rejectedProducts = computed(() => this.products().filter(p => p.status === 'rejected'));
  protected partialProducts = computed(() => this.products().filter(p => p.status === 'partial'));
  protected excededProducts = computed(() => this.products().filter(p => p.status === 'exceded'));

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected actualPurchase = signal<PurchaseOrder | null>(null);
  private observation = signal<string>('');

  protected controller = new PaginationController<Product>(this.products(), <PaginationControllerCFG>{
    slicedMode: false
  });

  protected selectedProducts = signal<Product[]>([]);
  protected bulkValue = signal<boolean>(false);

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Producto', columnName: 'productName', type:'string' },
    { nameToShow: 'Cantidad Esperada', columnName: 'expectedQuantity', type:'number', centerCol: true },
    { nameToShow: 'Cantidad Recibida', columnName: 'quantity', type:'number', centerCol: true },
    { nameToShow: 'Precio Unitario', columnName: 'unitPrice', type:'number' },
    { nameToShow: 'Estado', columnName: 'status', type:'array', posibleSelections: ['pending', 'approved', 'partial', 'rejected', 'exceded'], centerCol: true },
  ]

  constructor() {
    const purchaseId = this.router.url.split('/').at(-2);

    if (purchaseId) {
      this.getPurchase(purchaseId);
    }

    effect(() => {
      const products = this.products();

      this.controller.SetRawData(products);
    });

    effect(() => {
      const selectedQ = this.selectedProducts().length;

      untracked(() => {
        if (selectedQ > 0) this.uiAnimateToolbar('show');
        else this.uiAnimateToolbar('hide');
      })
    });
  }

  protected async getPurchase(purchaseId: string):Promise<void> {
    const response = await this.purchaseService.getPurchaseById(purchaseId);

    if (!response) return;

    const products = response.items!.map(item => {
      return {
        ...item,
        id: item.storeProductId,
        quantity: 0,
        status: 'pending' as Product['status'],
        expectedQuantity: item.quantity
      }
    });

    this.actualPurchase.set(response);

    this.products.set(products);
  }

  protected toggleAllSelection(checked: boolean) {
    this.bulkValue.set(checked);

    if (checked) {
      this.selectedProducts.set([...this.products()]);
      return;
    }

    this.selectedProducts.set([]);
  } 

  protected isSelected(product: Product): boolean {
    return this.selectedProducts().some(p => p.id === product.id);
  }

  protected deleteSelected(product: Product): void {
    this.selectedProducts.update(products => products.filter(p => p.id !== product.id));
  }

  protected updateQuantity(event: Event, product: Product): void {
    
    let quantity = Math.floor((event.target as HTMLInputElement).valueAsNumber);
    
    if (quantity < 0) return;

    if (isNaN(quantity)) quantity = 0;

    (event.target as HTMLInputElement).valueAsNumber = quantity;
    
    this.products.update(products => {
      return products.map(p => {
        if (p.id === product.id) {

          const newStatus = () => {
            if (quantity === p.expectedQuantity) return 'approved';
            else if (quantity < p.expectedQuantity && quantity > 0) return 'partial';
            else if (quantity > p.expectedQuantity && quantity > 0) return 'exceded';
            else return 'rejected';
          }

          return { ...p, status: newStatus(), quantity };
        }

        return p;
      })
    });
  }

  protected toggleSelectionByCheckbox(event: Event, product: Product): void {
    event.stopPropagation();
    event.preventDefault();

    const checked: boolean = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedProducts.update(products => [...products, product]);
      return; 
    }

    this.deleteSelected(product);
  }

  protected updateBulkQuantity(event: Event): void {
    const quantity = (event.target as HTMLInputElement).valueAsNumber;

    if (isNaN(quantity) || quantity < 0) return;

    this.products.update(products => {
      return products.map(p => {
        if (this.isSelected(p)) {
          const newStatus = () => {
            if (quantity === p.expectedQuantity) return 'approved';
            else if (quantity < p.expectedQuantity && quantity > 0) return 'partial';
            else if (quantity > p.expectedQuantity && quantity > 0) return 'exceded';
            else return 'rejected';
          }

          return { ...p, status: newStatus(), quantity };
        }
        return p;
      })
    });
  }

  protected approveBulkQuantity(): void {
    this.products.update(products => {
      return products.map(p => {
        if (this.isSelected(p)) {
          return { ...p, status: 'approved', quantity: p.expectedQuantity };
        }
        return p;
      })
    });

    this.cleanSelections();
  }

  protected rejectBulkQuantity(): void {
    this.products.update(products => {
      return products.map(p => {
        if (this.isSelected(p)) {
          return { ...p, status: 'rejected', quantity: 0 };
        }
        return p;
      })
    });

    this.cleanSelections();
  }

  protected approveQuantity(product: Product): void {
    this.products.update(products => {
      return products.map(p => {
        if (p.id === product.id) {
          return { ...p, status: 'approved', quantity: p.expectedQuantity };
        }
        return p;
      })
    });
  }

  protected rejectQuantity(product: Product): void {
    this.products.update(products => {
      return products.map(p => {
        if (p.id === product.id) {
          return { ...p, status: 'rejected', quantity: 0 };
        }
        return p;
      })
    });
  }

  private uiAnimateToolbar(mode: 'show' | 'hide'): void {
    const toolbar = this.el.nativeElement.querySelector('.toolbar-bulk-container');

    if (mode === 'show') {
      this.renderer.addClass(toolbar, 'show');
      return;
    }

    this.renderer.removeClass(toolbar, 'show');
  }

  protected uiExpandEvidenceContainer(productId: string):void {
    const container = this.el.nativeElement.querySelector(`#evidence-tr-${productId}`)
    const chevron = this.el.nativeElement.querySelector(`#evidence-chevron-${productId}`)

    if (!container) return;

    if (container.classList.contains('expanded')) {
      this.renderer.removeClass(container, 'expanded');
      this.renderer.removeClass(chevron, 'rotated');
      return;
    }

    this.renderer.addClass(container, 'expanded');
    this.renderer.addClass(chevron, 'rotated');
  }

  protected cleanSelections():void {
    this.selectedProducts.set([]);
    this.bulkValue.set(false);
  }

  protected getProductById(productId: Product['id']): Product | undefined {
    return this.products().find(p => p.id === productId);
  }

  protected async confirmReceipt(): Promise<void> {
    if (!this.actualPurchase()) return;

    const formToBacK: ReceiptPost = {
      companyId: this.selectedCompany()!.id,
      supplierId: this.actualPurchase()!.supplierId,
      storeId: this.actualPurchase()!.storeId,
      warehouseId: this.actualPurchase()!.warehouseId,
      purchaseId: this.actualPurchase()!.id,
      items: this.productsToBack(),
      comment: this.observation(),
    }

    const response = await this.receiptService.confirmReceipt(formToBacK);

    if (!response) return;

    this.navigateService.replace('receipt-detail', {receiptId: response.id});
  }

  protected setObservationValue(event: Event):void {
    const value = (event.target as HTMLInputElement).value;

    if (!this.actualPurchase()) return;

    this.observation.set(value);
  }
}