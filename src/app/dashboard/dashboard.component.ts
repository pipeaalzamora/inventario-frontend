import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WelcomeComponent } from './welcome/welcome.component';
import { TotalRequestsWidgetComponent } from './total-requests-widget/total-requests-widget.component';
import { OpenRequestsWidgetComponent } from './open-requests-widget/open-requests-widget.component';
import { PendingReceiptWidgetComponent } from './pending-receipt-widget/pending-receipt-widget.component';
import { ActiveRequestsWidgetComponent } from './active-requests-widget/active-requests-widget.component';
import { InventoryExactnessWidgetComponent } from './inventory-exactness-widget/inventory-exactness-widget.component';
import { SlowStockWidgetComponent } from './slow-stock-widget/slow-stock-widget.component';
import { TopProductsWidgetComponent } from './top-products-widget/top-products-widget.component';
import { SuppliersOntimeWidgetComponent } from './suppliers-ontime-widget/suppliers-ontime-widget.component';
import { RequestsTimelineWidgetComponent } from './requests-timeline-widget/requests-timeline-widget.component';

@Component({
  selector: 'dot-dashboard',
  standalone: true,
  imports: [
    WelcomeComponent,
    TotalRequestsWidgetComponent,
    OpenRequestsWidgetComponent,
    PendingReceiptWidgetComponent,
    ActiveRequestsWidgetComponent,
    InventoryExactnessWidgetComponent,
    SlowStockWidgetComponent,
    TopProductsWidgetComponent,
    SuppliersOntimeWidgetComponent,
    RequestsTimelineWidgetComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  constructor() {}
}
