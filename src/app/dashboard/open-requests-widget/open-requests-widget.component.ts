import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-open-requests-widget',
  standalone: true,
  imports: [],
  templateUrl: './open-requests-widget.component.html',
  styleUrl: './open-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpenRequestsWidgetComponent {
  private metrics = inject(DashboardMetricsService);
  protected openRequests = this.metrics.openPurchases;
}
