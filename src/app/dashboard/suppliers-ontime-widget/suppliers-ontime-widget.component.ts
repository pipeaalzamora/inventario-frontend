import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SupplierMetric {
  ranking: number;
  supplier: string;
  onTimePercentage: number;
  deliveries: number;
}

@Component({
  selector: 'dot-suppliers-ontime-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suppliers-ontime-widget.component.html',
  styleUrl: './suppliers-ontime-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersOntimeWidgetComponent implements OnInit {
  protected suppliers = signal<SupplierMetric[]>([]);
  protected currentMonth = signal<string>('');

  ngOnInit() {
    this.setCurrentMonth();
    this.initializeData();
  }

  private setCurrentMonth() {
    const now = new Date();
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
    this.currentMonth.set(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  private initializeData() {
    // Mock data: top 10 proveedores, 85-100% a tiempo, 5-30 entregas
    const mockData: SupplierMetric[] = [
      { ranking: 1, supplier: 'Proveedor Premium A', onTimePercentage: 100, deliveries: 28 },
      { ranking: 2, supplier: 'Proveedor Confiable B', onTimePercentage: 98, deliveries: 24 },
      { ranking: 3, supplier: 'Proveedor Standard C', onTimePercentage: 96, deliveries: 18 },
      { ranking: 4, supplier: 'Proveedor Premium D', onTimePercentage: 95, deliveries: 20 },
      { ranking: 5, supplier: 'Proveedor Confiable E', onTimePercentage: 94, deliveries: 15 },
      { ranking: 6, supplier: 'Proveedor Standard F', onTimePercentage: 92, deliveries: 22 },
      { ranking: 7, supplier: 'Proveedor Premium G', onTimePercentage: 90, deliveries: 12 },
      { ranking: 8, supplier: 'Proveedor Confiable H', onTimePercentage: 88, deliveries: 18 },
      { ranking: 9, supplier: 'Proveedor Standard I', onTimePercentage: 87, deliveries: 14 },
      { ranking: 10, supplier: 'Proveedor Premium J', onTimePercentage: 85, deliveries: 9 }
    ];

    this.suppliers.set(mockData);
  }

  getOnTimeClass(percentage: number): string {
    if (percentage >= 95) return 'ontime-excellent';
    if (percentage >= 90) return 'ontime-good';
    if (percentage >= 85) return 'ontime-acceptable';
    return 'ontime-poor';
  }
}
