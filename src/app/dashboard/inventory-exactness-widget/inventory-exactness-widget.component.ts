import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ExactnessRecord {
  store: string;
  exactness: number;
  lastCountDate: Date;
}

@Component({
  selector: 'dot-inventory-exactness-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-exactness-widget.component.html',
  styleUrl: './inventory-exactness-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryExactnessWidgetComponent implements OnInit {
  protected records = signal<ExactnessRecord[]>([]);
  protected globalExactness = signal<number>(0);

  ngOnInit() {
    this.initializeData();
  }

  private initializeData() {
    // Mock data: 94-99% global, 88-98% por tienda
    const mockData: ExactnessRecord[] = [
      { store: 'Global', exactness: 96, lastCountDate: new Date('2025-12-20') },
      { store: 'Tienda Centro', exactness: 98, lastCountDate: new Date('2025-12-18') },
      { store: 'Tienda Norte', exactness: 94, lastCountDate: new Date('2025-12-19') },
      { store: 'Tienda Sur', exactness: 95, lastCountDate: new Date('2025-12-20') },
      { store: 'Tienda Este', exactness: 97, lastCountDate: new Date('2025-12-17') },
      { store: 'Tienda Oeste', exactness: 92, lastCountDate: new Date('2025-12-16') },
      { store: 'Tienda Plaza', exactness: 96, lastCountDate: new Date('2025-12-20') }
    ];

    const globalRecord = mockData[0];
    this.globalExactness.set(globalRecord.exactness);
    this.records.set(mockData);
  }

  getExactnessClass(exactness: number): string {
    if (exactness >= 95) return 'exactness-good';
    if (exactness >= 90) return 'exactness-warning';
    return 'exactness-danger';
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
}
