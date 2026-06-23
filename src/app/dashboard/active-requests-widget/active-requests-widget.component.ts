import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart as ChartJS, registerables } from 'chart.js';
import { DashboardMetricsService, StoreRequestMetric } from '../services/dashboard-metrics.service';

@Component({
  selector: 'dot-active-requests-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-requests-widget.component.html',
  styleUrl: './active-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActiveRequestsWidgetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('activeRequestsChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private metrics = inject(DashboardMetricsService);
  protected storeData = this.metrics.activeByStore;
  private chart: ChartJS | null = null;

  constructor() {
    ChartJS.register(...registerables);
    effect(() => {
      this.storeData();
      this.renderChart();
    });
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  private renderChart() {
    if (!this.chartCanvas) return;
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data: StoreRequestMetric[] = this.storeData();
    const labels = data.map(d => d.store);
    const pendingData = data.map(d => d.pending);
    const inTransitData = data.map(d => d.inTransit);
    const toReceiveData = data.map(d => d.toReceive);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pendientes',
            data: pendingData,
            backgroundColor: 'rgba(239, 179, 68, 1)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 0
          },
          {
            label: 'En camino',
            data: inTransitData,
            backgroundColor: 'rgba(37, 150, 165, 1)',
            borderColor: 'rgb(249, 115, 22)',
            borderWidth: 0
          },
          {
            label: 'Por recepcionar',
            data: toReceiveData,
            backgroundColor: 'rgb(34, 197, 94)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 0
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          },
          y: {
            stacked: true
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
