import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SlowStockItem {
  sku: string;
  productName: string;
  daysSinceMovement: number;
  blockedValue: number;
  store: string;
  percentageOfTotal: number;
}

@Component({
  selector: 'dot-slow-stock-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slow-stock-widget.component.html',
  styleUrl: './slow-stock-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlowStockWidgetComponent implements OnInit {
  protected summaryData = signal<SlowStockItem[]>([]);
  protected slowData = signal<any[]>([]);
  protected moderateData = signal<any[]>([]);
  protected fastData = signal<any[]>([]);

  ngOnInit() {
    this.initializeData();
  }

  private initializeData() {
    // Mock data resumen (10 items variados)
    const summaryMock: SlowStockItem[] = [
      { sku: 'SKU-001', productName: 'Producto A', daysSinceMovement: 45, blockedValue: 1200, store: 'Tienda Centro', percentageOfTotal: 5.2 },
      { sku: 'SKU-002', productName: 'Producto B', daysSinceMovement: 32, blockedValue: 850, store: 'Tienda Norte', percentageOfTotal: 3.8 },
      { sku: 'SKU-003', productName: 'Producto C', daysSinceMovement: 62, blockedValue: 2100, store: 'Tienda Sur', percentageOfTotal: 8.5 },
      { sku: 'SKU-004', productName: 'Producto D', daysSinceMovement: 22, blockedValue: 450, store: 'Tienda Este', percentageOfTotal: 2.1 },
      { sku: 'SKU-005', productName: 'Producto E', daysSinceMovement: 55, blockedValue: 1600, store: 'Tienda Oeste', percentageOfTotal: 6.2 },
      { sku: 'SKU-006', productName: 'Producto F', daysSinceMovement: 18, blockedValue: 300, store: 'Tienda Plaza', percentageOfTotal: 1.5 },
      { sku: 'SKU-007', productName: 'Producto G', daysSinceMovement: 38, blockedValue: 950, store: 'Tienda Centro', percentageOfTotal: 4.3 },
      { sku: 'SKU-008', productName: 'Producto H', daysSinceMovement: 28, blockedValue: 600, store: 'Tienda Norte', percentageOfTotal: 2.8 },
      { sku: 'SKU-009', productName: 'Producto I', daysSinceMovement: 71, blockedValue: 2500, store: 'Tienda Sur', percentageOfTotal: 9.8 },
      { sku: 'SKU-010', productName: 'Producto J', daysSinceMovement: 12, blockedValue: 200, store: 'Tienda Este', percentageOfTotal: 0.9 }
    ];

    this.summaryData.set(summaryMock);

    // Top 10 lentos (>30 días)
    const slowMock = [
      { product: 'Producto I', days: 71 },
      { product: 'Producto C', days: 62 },
      { product: 'Producto E', days: 55 },
      { product: 'Producto A', days: 45 },
      { product: 'Producto G', days: 38 },
      { product: 'Producto B', days: 32 },
      { product: 'Producto L', days: 80 },
      { product: 'Producto M', days: 68 },
      { product: 'Producto N', days: 52 },
      { product: 'Producto O', days: 35 }
    ];
    this.slowData.set(slowMock);

    // Top 10 moderados (15-29 días)
    const moderateMock = [
      { product: 'Producto D', days: 28 },
      { product: 'Producto H', days: 28 },
      { product: 'Producto P', days: 26 },
      { product: 'Producto Q', days: 25 },
      { product: 'Producto R', days: 24 },
      { product: 'Producto S', days: 22 },
      { product: 'Producto T', days: 20 },
      { product: 'Producto U', days: 19 },
      { product: 'Producto V', days: 18 },
      { product: 'Producto W', days: 16 }
    ];
    this.moderateData.set(moderateMock);

    // Top 10 rápidos (<15 días) - ORDENADOS DE MENOR A MAYOR
    const fastMock = [
      { product: 'Producto AE', days: 2 },
      { product: 'Producto AD', days: 4 },
      { product: 'Producto AC', days: 5 },
      { product: 'Producto AB', days: 6 },
      { product: 'Producto AA', days: 7 },
      { product: 'Producto Z', days: 8 },
      { product: 'Producto Y', days: 9 },
      { product: 'Producto X', days: 10 },
      { product: 'Producto F', days: 12 },
      { product: 'Producto J', days: 12 }
    ];
    this.fastData.set(fastMock);
  }

  getStockClass(days: number): string {
    if (days > 30) return 'stock-slow';
    if (days >= 15) return 'stock-moderate';
    return 'stock-fast';
  }
}
