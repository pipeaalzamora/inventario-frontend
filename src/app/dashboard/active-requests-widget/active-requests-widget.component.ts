import { Component, ChangeDetectionStrategy, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart as ChartJS, registerables } from 'chart.js';

interface StoreRequest {
  store: string;
  pending: number;
  inTransit: number;
  toReceive: number;
}

@Component({
  selector: 'dot-active-requests-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-requests-widget.component.html',
  styleUrl: './active-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActiveRequestsWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('activeRequestsChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  protected storeData = signal<StoreRequest[]>([]);
  private chart: ChartJS | null = null;

  constructor() {
    ChartJS.register(...registerables);
  }

  ngOnInit() {
    this.initializeData();
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  private initializeData() {
    // Mock data realista: máx 3 solicitudes por tienda, algunas sin solicitudes
    const mockData: StoreRequest[] = [
      { store: 'Tienda Centro', pending: 2, inTransit: 1, toReceive: 0 },
      { store: 'Tienda Norte', pending: 1, inTransit: 0, toReceive: 2 },
      { store: 'Tienda Sur', pending: 0, inTransit: 0, toReceive: 0 },
      { store: 'Tienda Este', pending: 3, inTransit: 0, toReceive: 0 },
      { store: 'Tienda Oeste', pending: 1, inTransit: 1, toReceive: 1 },
      { store: 'Tienda Plaza', pending: 2, inTransit: 2, toReceive: 0 }
    ];
    this.storeData.set(mockData);
  }

  private renderChart() {
    if (!this.chartCanvas) return;
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.storeData();
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
            max: 3
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
