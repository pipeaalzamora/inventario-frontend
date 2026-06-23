import { Component, ChangeDetectionStrategy, OnInit, signal, OnDestroy, ViewChild, ElementRef, AfterViewInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart as ChartJS, registerables } from 'chart.js';
import { DashboardMetricsService } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-requests-timeline-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requests-timeline-widget.component.html',
  styleUrl: './requests-timeline-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestsTimelineWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('requestsTimelineChart') chartRef!: ElementRef<HTMLCanvasElement>;

  private dashboardMetrics = inject(DashboardMetricsService);

  protected allStores = computed(() => this.dashboardMetrics.purchasesTimeline());
  protected currentMonth = signal<string>('');
  private chart: ChartJS | null = null;

  constructor() {
    ChartJS.register(...registerables);
    effect(() => {
      this.allStores();
      queueMicrotask(() => this.renderChart());
    });
  }

  ngOnInit() {
    this.setCurrentMonth();
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  private setCurrentMonth() {
    const now = new Date();
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
    this.currentMonth.set(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  private renderChart() {
    if (!this.chartRef) return;

    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const allStores = this.allStores();
    const days = allStores[0]?.data.map(item => item.day) ?? [];

    const datasets = allStores.map(storeData => ({
      label: storeData.store,
      data: storeData.data.map(d => d.requests),
      backgroundColor: storeData.color,
      borderColor: storeData.color,
      borderWidth: 1
    }));

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: days.map(d => `${d}`),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '# Solicitudes'
            },
            ticks: {
              precision: 0
            }
          },
          x: {
            title: {
              display: true,
              text: 'Dia del Mes'
            }
          }
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
