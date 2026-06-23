import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-top-products-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-products-widget.component.html',
  styleUrl: './top-products-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopProductsWidgetComponent implements OnInit {
  private metrics = inject(DashboardMetricsService);
  protected topProducts = this.metrics.topProducts;
  protected currentMonth = signal<string>('');

  ngOnInit() {
    this.setCurrentMonth();
  }

  private setCurrentMonth() {
    const now = new Date();
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
    this.currentMonth.set(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  getRankingClass(ranking: number): string {
    if (ranking <= 3) return 'ranking-top';
    if (ranking <= 10) return 'ranking-high';
    return 'ranking-medium';
  }
}
