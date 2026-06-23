import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-total-requests-widget',
  standalone: true,
  imports: [],
  templateUrl: './total-requests-widget.component.html',
  styleUrl: './total-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TotalRequestsWidgetComponent {
  private metrics = inject(DashboardMetricsService);
  protected totalRequests = this.metrics.totalPurchasesThisMonth;
}
