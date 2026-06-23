import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-inventory-exactness-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-exactness-widget.component.html',
  styleUrl: './inventory-exactness-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryExactnessWidgetComponent {
  private dashboardMetrics = inject(DashboardMetricsService);

  protected records = computed(() => this.dashboardMetrics.countCoverage());

  getExactnessClass(exactness: number): string {
    if (exactness >= 95) return 'exactness-good';
    if (exactness >= 90) return 'exactness-warning';
    return 'exactness-danger';
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';

    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
}
