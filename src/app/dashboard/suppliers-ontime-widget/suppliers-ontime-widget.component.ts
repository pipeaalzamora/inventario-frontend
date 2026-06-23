import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-suppliers-ontime-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suppliers-ontime-widget.component.html',
  styleUrl: './suppliers-ontime-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersOntimeWidgetComponent implements OnInit {
  private dashboardMetrics = inject(DashboardMetricsService);

  protected suppliers = computed(() => this.dashboardMetrics.suppliersOnTime());
  protected currentMonth = signal<string>('');

  ngOnInit() {
    this.setCurrentMonth();
  }

  private setCurrentMonth() {
    const now = new Date();
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
    this.currentMonth.set(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  getOnTimeClass(percentage: number): string {
    if (percentage >= 95) return 'ontime-excellent';
    if (percentage >= 90) return 'ontime-good';
    if (percentage >= 85) return 'ontime-acceptable';
    return 'ontime-poor';
  }
}
