import { LayoutService } from '@/shared/services/layout.service';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, untracked } from '@angular/core';
import { PurchaseOrderService } from '@/request/services/purchase-order.service';
import { Router } from '@angular/router';
import { PurchasesOrderByRequest } from '@/request/models/purchase-order';
import { RequestDetail } from '@/request/models/request';
import { RequestService } from '@/request/services/request.service';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { NavigateService } from '@/shared/services/navigate.service';
import { RequestPurchaseItemComponent } from './purchase-families.item/purchase-families-item.component';
import { CopyClipboardButtonComponent } from '@/shared/components/copy-clipboard-button/copy-clipboard-button.component';

export type SortedPurchase = PurchasesOrderByRequest & { children: SortedPurchase[], level: number, branch: string };

@Component({
  selector: 'dot-request-purchase-order',
  imports: [
    DatePipe,
    GoBackComponent,
    SectionWrapperComponent,
    RequestPurchaseItemComponent,
    CopyClipboardButtonComponent,
],
  templateUrl: './purchase-families.component.html',
  styleUrl: './purchase-families.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestPurchaseOrderComponent {
  private layoutService = inject(LayoutService);
  private purchaseService = inject(PurchaseOrderService);
  private requestService = inject(RequestService);
  private router = inject(Router);
  protected navigateService = inject(NavigateService);

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected predefinedTimeline = [
    { name: 'pending', translatedName: 'Pendiente', icon: 'fa-solid fa-hourglass-half' },
    { name: 'on_delivery', translatedName: 'En camino', icon: 'fa-solid fa-truck-fast' },
    { name: 'arrived', translatedName: 'Llegada a bodega', icon: 'fa-solid fa-boxes-packing' },
    { name: 'completed', translatedName: 'Completada', icon: 'fa-solid fa-circle-check' },
  ];

  protected purchases = signal<PurchasesOrderByRequest[]>([]);
  protected actualRequest = signal<RequestDetail | null>(null);
  protected noChildren = signal(true);

  protected sortedPurchases = computed<SortedPurchase[]>(() => {
    const purchases = this.purchases();

    if (!purchases || !purchases.length) return [];

    return this.buildPurchaseTree(purchases);
  })

  constructor() {
    const requestId = this.router.url.split('/').at(-2);

    if (!requestId) return;

    this.getPurchaseOrder(requestId);
    this.getActualRequest(requestId);
  }

  private async getActualRequest(requestId: string): Promise<void> {
    const response = await this.requestService.getRequest(requestId);

    if (!response) return;

    this.actualRequest.set(response);
  }

  private async getPurchaseOrder(requestId: string): Promise<void> {
    const response = await this.purchaseService.getPurchaseByRequestId(requestId);

    if (!response) return;

    this.purchases.set(response);
  }

  private buildPurchaseTree(purchases: PurchasesOrderByRequest[]): SortedPurchase[] {
    const purchaseMap = new Map<string, SortedPurchase>();

    purchases.forEach(purchase => {
      purchaseMap.set(purchase.id, {
        ...purchase,
        children: [],
        branch: purchase.id,
        level: 0
      });
    });
    const rootPurchases: SortedPurchase[] = [];

    purchases.forEach(purchase => {
      const currentPurchase = purchaseMap.get(purchase.id)!;
      
      if (purchase.parentPurchaseId) {
        const parent = purchaseMap.get(purchase.parentPurchaseId);

        untracked(() => this.noChildren.set(false));

        if (parent) {
          currentPurchase.level = parent.level + 1;
          parent.children.push(currentPurchase);
          currentPurchase.branch = parent.branch;

        } else {
          rootPurchases.push(currentPurchase);
        }
        
      } else {
        rootPurchases.push(currentPurchase);
      }
    });

    return rootPurchases;
  }

  protected branchColor(index: number):string {
    const colors = {
      0: '#8E24AA',
      1: '#00B8D4',
      2: '#F50057',
      3: '#2979FF',
      4: '#FF7043',
    }

    return colors[index as keyof typeof colors] || this.generateRandomColor();
  }

  private generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';

    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
  }
}
