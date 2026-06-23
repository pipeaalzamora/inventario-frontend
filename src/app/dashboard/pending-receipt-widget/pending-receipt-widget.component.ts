import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-pending-receipt-widget',
  standalone: true,
  imports: [],
  templateUrl: './pending-receipt-widget.component.html',
  styleUrl: './pending-receipt-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PendingReceiptWidgetComponent {
  private metrics = inject(DashboardMetricsService);
  protected pendingReceipt = this.metrics.pendingReceipts;
}
