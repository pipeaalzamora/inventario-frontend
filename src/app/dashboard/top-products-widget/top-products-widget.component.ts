import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TopProduct {
  ranking: number;
  productName: string;
  store: string;
  requests: number;
  percentageOfTotal: number;
}

@Component({
  selector: 'dot-top-products-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-products-widget.component.html',
  styleUrl: './top-products-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopProductsWidgetComponent implements OnInit {
  protected topProducts = signal<TopProduct[]>([]);
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
    // Mock data: top 20 productos más solicitados del mes
    const mockData: TopProduct[] = [
      { ranking: 1, productName: 'Producto Premium A', store: 'Tienda Centro', requests: 45, percentageOfTotal: 8.2 },
      { ranking: 2, productName: 'Producto Premium B', store: 'Tienda Norte', requests: 38, percentageOfTotal: 6.9 },
      { ranking: 3, productName: 'Producto Standard C', store: 'Tienda Sur', requests: 35, percentageOfTotal: 6.4 },
      { ranking: 4, productName: 'Producto Premium D', store: 'Tienda Este', requests: 32, percentageOfTotal: 5.8 },
      { ranking: 5, productName: 'Producto Standard E', store: 'Tienda Oeste', requests: 30, percentageOfTotal: 5.5 },
      { ranking: 6, productName: 'Producto Premium F', store: 'Tienda Centro', requests: 28, percentageOfTotal: 5.1 },
      { ranking: 7, productName: 'Producto Standard G', store: 'Tienda Plaza', requests: 26, percentageOfTotal: 4.7 },
      { ranking: 8, productName: 'Producto Premium H', store: 'Tienda Norte', requests: 24, percentageOfTotal: 4.4 },
      { ranking: 9, productName: 'Producto Standard I', store: 'Tienda Sur', requests: 22, percentageOfTotal: 4.0 },
      { ranking: 10, productName: 'Producto Premium J', store: 'Tienda Este', requests: 20, percentageOfTotal: 3.6 },
      { ranking: 11, productName: 'Producto Standard K', store: 'Tienda Oeste', requests: 18, percentageOfTotal: 3.3 },
      { ranking: 12, productName: 'Producto Premium L', store: 'Tienda Centro', requests: 16, percentageOfTotal: 2.9 },
      { ranking: 13, productName: 'Producto Standard M', store: 'Tienda Plaza', requests: 15, percentageOfTotal: 2.7 },
      { ranking: 14, productName: 'Producto Premium N', store: 'Tienda Norte', requests: 14, percentageOfTotal: 2.5 },
      { ranking: 15, productName: 'Producto Standard O', store: 'Tienda Sur', requests: 13, percentageOfTotal: 2.4 },
      { ranking: 16, productName: 'Producto Premium P', store: 'Tienda Este', requests: 12, percentageOfTotal: 2.2 },
      { ranking: 17, productName: 'Producto Standard Q', store: 'Tienda Oeste', requests: 11, percentageOfTotal: 2.0 },
      { ranking: 18, productName: 'Producto Premium R', store: 'Tienda Centro', requests: 10, percentageOfTotal: 1.8 },
      { ranking: 19, productName: 'Producto Standard S', store: 'Tienda Plaza', requests: 9, percentageOfTotal: 1.6 },
      { ranking: 20, productName: 'Producto Premium T', store: 'Tienda Norte', requests: 8, percentageOfTotal: 1.5 }
    ];

    this.topProducts.set(mockData);
  }

  getRankingClass(ranking: number): string {
    if (ranking <= 3) return 'ranking-top';
    if (ranking <= 10) return 'ranking-high';
    return 'ranking-medium';
  }
}
