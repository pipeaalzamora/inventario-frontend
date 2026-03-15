import { Component, ChangeDetectionStrategy, OnInit, signal, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart as ChartJS, registerables } from 'chart.js';

interface DailyData {
  day: number;
  requests: number;
}

interface StoreTimeData {
  store: string;
  data: DailyData[];
  color: string;
}

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
  
  protected allStores = signal<StoreTimeData[]>([]);
  protected currentMonth = signal<string>('');
  private chart: ChartJS | null = null;

  constructor() {
    ChartJS.register(...registerables);
  }

  private storeColors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899'
  ];

  ngOnInit() {
    this.setCurrentMonth();
    this.initializeData();
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  private setCurrentMonth() {
    const now = new Date();
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
    this.currentMonth.set(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  private initializeData() {
    // Mock data: 30 días del mes, 6 tiendas con solicitudes diarias variadas
    const stores = ['Tienda Centro', 'Tienda Norte', 'Tienda Sur', 'Tienda Este', 'Tienda Oeste', 'Tienda Plaza'];
    
    const mockData: StoreTimeData[] = stores.map((store, idx) => ({
      store,
      color: this.storeColors[idx],
      data: Array.from({ length: 30 }, (_, day) => ({
        day: day + 1,
        requests: Math.floor(Math.random() * 8) + 2 // 2-10 solicitudes por día
      }))
    }));

    this.allStores.set(mockData);
  }

  private renderChart() {
    if (!this.chartRef) return;
    
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const allStores = this.allStores();
    const days = Array.from({ length: 30 }, (_, i) => i + 1);

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
            }
          },
          x: {
            title: {
              display: true,
              text: 'Día del Mes'
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
