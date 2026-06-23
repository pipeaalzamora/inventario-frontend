import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-slow-stock-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slow-stock-widget.component.html',
  styleUrl: './slow-stock-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlowStockWidgetComponent {
  private dashboardMetrics = inject(DashboardMetricsService);

  protected summaryData = computed(() => this.dashboardMetrics.slowStockSummary().slice(0, 10));
  protected slowData = computed(() => this.toVelocityRows(this.dashboardMetrics.slowStockSummary().filter(item => item.daysSinceMovement > 30).slice(0, 10)));
  protected moderateData = computed(() => this.toVelocityRows(this.dashboardMetrics.slowStockSummary().filter(item => item.daysSinceMovement >= 15 && item.daysSinceMovement <= 29).slice(0, 10)));
  protected fastData = computed(() => this.toVelocityRows(this.dashboardMetrics.slowStockSummary().filter(item => item.daysSinceMovement < 15).slice(0, 10)));

  getStockClass(days: number): string {
    if (days > 30) return 'stock-slow';
    if (days >= 15) return 'stock-moderate';
    return 'stock-fast';
  }

  private toVelocityRows(items: { productName: string; daysSinceMovement: number }[]): { product: string; days: number }[] {
    return items.map(item => ({ product: item.productName, days: item.daysSinceMovement }));
  }
}
