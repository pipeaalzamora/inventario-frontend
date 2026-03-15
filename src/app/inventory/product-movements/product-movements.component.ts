import { 
  ChangeDetectionStrategy, 
  Component, 
  computed, 
  effect, 
  ElementRef, 
  inject, 
  OnDestroy, 
  signal, 
  untracked,
  viewChild 
} from '@angular/core';
import { Router } from '@angular/router';
import { Chart as ChartJS, registerables } from 'chart.js';
import { DatePipe } from '@angular/common';
import { InventoryProduct, ProductMovements } from '../models/inventory';
import { CompanyService } from '@/shared/services/company.service';
import { StoreService } from '@/shared/services/store.service';
import { StoreWarehouse } from '@/shared/models/store';
import { LayoutService } from '@/shared/services/layout.service';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { NoImageComponent } from 'public/default/no-image.component';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { InventoryService } from '../services/inventory.service';
import { LinkDirective } from "@/shared/directives/link.directive";

const CONTROLLER_COMPONENTS = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent,
];



// Registrar Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'dot-product-movements',
  imports: [
    CONTROLLER_COMPONENTS,
    SelectComponent,
    NoImageComponent,
    ClpCurrencyPipe,
    DatePipe,
    SectionWrapperComponent,
    GoBackComponent,
    LoadingDirective,
    LinkDirective,
],
  templateUrl: './product-movements.component.html',
  styleUrl: './product-movements.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductMovementsComponent implements OnDestroy {
  private stockChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('stockChart');
  private movementsChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('movementsChart');

  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  private storeService = inject(StoreService);
  private layoutService = inject(LayoutService);

  protected isMobile = this.layoutService.isMobile;

  // Servicios externos
  protected selectedCompany = this.companyService.selectedCompany;
  protected selectedStore = this.storeService.selectedStore;

  // Parámetros de ruta
  protected productId = signal<string | null>(null);

  // Data
  protected product = signal<InventoryProduct | null>(null);
  protected movements = signal<ProductMovements[]>([]);
  protected warehouses = signal<StoreWarehouse[]>([]);
  protected movementsLoaded = signal<boolean>(false);

  // Bodega seleccionada
  protected selectedWarehouse = signal<StoreWarehouse | null>(null);

  // Movimientos filtrados por bodega seleccionada
  protected filteredMovements = computed(() => {
    const allMovements = this.movements();
    const selectedWarehouse = this.selectedWarehouse();
    
    if (!selectedWarehouse) return allMovements;
    
    // Filtrar movimientos donde movedFrom o movedTo coincida con la bodega seleccionada
    return allMovements.filter(mov => 
      mov.movedFrom === selectedWarehouse.id || 
      mov.movedTo === selectedWarehouse.id
    );
  });

  // Stock actual del producto en la bodega seleccionada
  protected currentWarehouseStock = computed(() => {
    const prod = this.product();
    if (!prod) return { currentStock: 0, avgCost: 0 };
    return {
      currentStock: prod.totals.currentStock,
      avgCost: prod.totals.avgCost
    };
  });

  // Detectar si hay datos para los gráficos
  protected hasChartData = computed(() => {
    const movements = this.filteredMovements();
    return movements && movements.length > 0;
  });

  // Mensaje de filtros activos para gráficos
  protected chartFiltersMessage = computed(() => {
    const warehouse = this.selectedWarehouse();
    const now = new Date();
    const currentMonth = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    
    if (!warehouse) return '';
    
    return `Mostrando: ${warehouse.warehouseName} • ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}`;
  });

  // Controller de movimientos
  protected movementsController = new PaginationController<ProductMovements>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['usuario', 'motivo', 'documentoRef'],
    sortColumn: 'fecha',
    sortAscending: false,
    pageSize: 15,
  });

  protected movementsColumns: ColumnDefinition[] = [
    { columnName: 'fecha', nameToShow: 'Fecha', type: 'date' },
    { columnName: 'tipo', nameToShow: 'Tipo', type: 'string', centerCol: true },
    { columnName: 'documentoRef', nameToShow: 'Documento', type: 'string', centerCol: true },
    { columnName: 'cantidad', nameToShow: 'Cantidad', type: 'number', centerCol: true },
    { columnName: 'stockBefore', nameToShow: 'Stock', type: 'number', centerCol: true },
    { columnName: 'costoTotal', nameToShow: 'Costo Total', type: 'number', centerCol: true },
    { columnName: 'usuario', nameToShow: 'Usuario', type: 'string' },
    { columnName: 'motivo', nameToShow: 'Motivo', type: 'string' },
  ];

  // Charts
  private stockChart: ChartJS | null = null;
  private movementsChart: ChartJS | null = null;

  constructor() {
    // Obtener productId de la URL
    const productId = this.router.url.split('/').pop();
    if (productId && productId !== 'product-movements') {
      this.productId.set(productId);
    }

    // Cargar bodegas cuando cambie la tienda
    effect(() => {
      const store = this.selectedStore();
      if (!store) return;

      untracked(() => this.loadWarehouses(store.id));
    });

    // Cargar producto cuando cambie la bodega seleccionada
    effect(() => {
      const company = this.selectedCompany();
      const store = this.selectedStore();
      const warehouse = this.selectedWarehouse();
      const productId = this.productId();

      if (!company || !store || !warehouse || !productId) return;

      untracked(() => this.getProduct(company.id, store.id, warehouse.id, productId));
      untracked(() => this.getMovements(store.id, productId));
    });

    // Actualizar controller de movimientos
    effect(() => {
      this.movementsController.SetRawData(this.filteredMovements());
    });

    // Renderizar gráficos cuando los canvas y datos estén disponibles
    effect(() => {
      const stockCanvas = this.stockChartCanvas();
      const movementsCanvas = this.movementsChartCanvas();
      const product = this.product();
      const movements = this.filteredMovements();
      console.log({stockCanvas, movementsCanvas, product, movements});

      if (stockCanvas && movementsCanvas && product) {
        if (movements.length > 0) {
          untracked(() => this.renderCharts());
        } else {
          // Destruir gráficos cuando no hay datos filtrados para mostrar canvas limpio
          untracked(() => {
            this.stockChart?.destroy();
            this.movementsChart?.destroy();
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stockChart?.destroy();
    this.movementsChart?.destroy();
  }

  private async loadWarehouses(storeId: string): Promise<void> {
    const warehouses = await this.storeService.getWarehousesByStoreId(storeId);
    this.warehouses.set(warehouses ?? []);

    // Seleccionar la primera bodega por defecto
    if (warehouses && warehouses.length > 0) {
      this.selectedWarehouse.set(warehouses[0]);
    }
  }

  private async getProduct(companyId: string, storeId: string, warehouseId: string, productId: string): Promise<void> {

    const response = await this.inventoryService.getInventoryProduct(companyId, storeId, warehouseId, productId);

    if (!response) return;

    this.product.set(response);
  }

  private async getMovements(storeId: string, storeProductId: string): Promise<void> {
    this.movementsLoaded.set(false);
    
    const response = await this.inventoryService.getProductMovements(storeId, storeProductId);

    if (!response) {
      this.movementsLoaded.set(true);
      return;
    }

    this.movements.set(response);
    this.movementsLoaded.set(true);
  }

  protected onWarehouseChange(warehouse: StoreWarehouse | null): void {
    if (!warehouse) return;
    this.selectedWarehouse.set(warehouse);
  }

  private renderCharts(): void {
    this.renderStockChart();
    this.renderMovementsChart();
  }

  private renderStockChart(): void {
    const canvas = this.stockChartCanvas();
    if (!canvas) return;

    this.stockChart?.destroy();

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const movs = this.filteredMovements();
    const product = this.product();

    // Usar mes actual completo
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Generar array de todas las fechas del mes
    const dates: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }

    const fullDates = dates.map(d => d.toLocaleDateString('es-CL'));
    
    // Labels: mostrar de 5 en 5 días
    const labels = dates.map((d, idx) => {
      const day = d.getDate();
      // Mostrar día 1, cada 5 días (5, 10, 15, 20, 25, 30) y último día
      if (day === 1 || day % 5 === 0 || idx === dates.length - 1) {
        return `${day}`;
      }
      return '';
    });

    const dailyStock = new Map<string, { value: number; hasData: boolean }>();
    const sortedMovs = [...movs].sort((a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime());

    // Guardar el stockAfter de cada día
    sortedMovs.forEach(m => {
      const dateStr = new Date(m.movedAt).toLocaleDateString('es-CL');
      dailyStock.set(dateStr, { value: m.stockAfter, hasData: true });
    });

    // Construir array de datos con carry-forward
    const data: number[] = [];
    const hasRealData: boolean[] = [];
    let lastValue = 0;
    const currentStock = product?.totals?.currentStock ?? null;

    for (let idx = 0; idx < fullDates.length; idx++) {
      const d = fullDates[idx];
      const stockInfo = dailyStock.get(d);
      
      if (stockInfo) {
        lastValue = stockInfo.value;
        hasRealData.push(true);
      } else {
        hasRealData.push(false);
      }
      
      // Si es el último día del mes actual y tenemos el stock actual, forzamos ese valor
      if (idx === fullDates.length - 1 && currentStock !== null && dates[idx].getDate() === now.getDate()) {
        lastValue = currentStock;
      }
      data.push(lastValue);
    }

    const maxDataValue = Math.max(...data, currentStock ?? 0);
    const minStock = product?.quantities?.minimalStock ?? null;
    const maxStock = product?.quantities?.maximalStock ?? null;

    const actualMonth = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

    // Crear datasets adicionales para líneas de stock mínimo y máximo
    const datasets: any[] = [
      {
        label: 'Stock Actual',
        data,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: (context: any) => hasRealData[context.dataIndex] ? 4 : 0,
        pointBackgroundColor: (context: any) => hasRealData[context.dataIndex] ? '#4f46e5' : 'transparent',
        pointBorderColor: (context: any) => hasRealData[context.dataIndex] ? '#4f46e5' : 'transparent',
      }
    ];

    // Agregar líneas de stock crítico como datasets
    if (minStock !== null) {
      datasets.push({
        label: `Stock Mínimo (${minStock})`,
        data: new Array(data.length).fill(minStock),
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0,
      });
    }

    if (maxStock !== null) {
      datasets.push({
        label: `Stock Máximo (${maxStock})`,
        data: new Array(data.length).fill(maxStock),
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0,
      });
    }

    this.stockChart = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const index = items[0].dataIndex;
                const date = dates[index];
                return date.toLocaleDateString('es-CL', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              },
              label: (context) => {
                const index = context.dataIndex;
                const value = context.parsed.y;
                const isRealData = hasRealData[index];
                const lines = [
                  `${context.dataset.label}: ${value} unidades`
                ];
                
                if (context.datasetIndex === 0) {
                  if (!isRealData) {
                    lines.push('(Sin movimientos este día)');
                  }
                  
                  // Calcular diferencia con día anterior
                  if (index > 0 && value !== null) {
                    const prevValue = data[index - 1];
                    const diff = value - prevValue;
                    if (diff !== 0) {
                      const sign = diff > 0 ? '+' : '';
                      lines.push(`Cambio: ${sign}${diff}`);
                    }
                  }
                }
                
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { 
              color: '#374151',
              maxRotation: 0,
              autoSkip: false,
            },
            grid: { color: 'rgba(15,23,42,0.03)' }
          },
          y: { 
            beginAtZero: true,
            ticks: { color: '#374151' },
            grid: { color: 'rgba(15,23,42,0.06)' },
            title: { display: true, text: 'Cantidad', color: '#374151' },
            suggestedMax: Math.ceil(maxDataValue * 1.1)
          }
        }
      }
    });
  }

  private renderMovementsChart(): void {
    const canvas = this.movementsChartCanvas();
    if (!canvas) return;

    this.movementsChart?.destroy();

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const movs = this.filteredMovements();

    // Usar mes actual completo
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Generar array de todas las fechas del mes
    const dates: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }

    const fullDates = dates.map(d => d.toLocaleDateString('es-CL'));
    
    // Labels: mostrar de 5 en 5 días
    const labels = dates.map((d, idx) => {
      const day = d.getDate();
      // Mostrar día 1, cada 5 días (5, 10, 15, 20, 25, 30) y último día
      if (day === 1 || day % 5 === 0 || idx === dates.length - 1) {
        return `${day}`;
      }
      return '';
    });

    // Contar movimientos por día y tipo
    const dailyEntradas = new Map<string, number>();
    const dailySalidas = new Map<string, number>();
    const dailyTransfers = new Map<string, number>();
    const movementCounts = new Map<string, { entradas: number; salidas: number; transfers: number }>();

    movs.forEach((m: ProductMovements) => {
      const dateStr = new Date(m.movedAt).toLocaleDateString('es-CL');
      
      if (m.movementType === 'NEWINPUT') {
        dailyEntradas.set(dateStr, (dailyEntradas.get(dateStr) || 0) + m.quantity);
        const counts = movementCounts.get(dateStr) || { entradas: 0, salidas: 0, transfers: 0 };
        counts.entradas++;
        movementCounts.set(dateStr, counts);
      } else if (m.movementType === 'TRANSFER') {
        dailyTransfers.set(dateStr, (dailyTransfers.get(dateStr) || 0) + m.quantity);
        const counts = movementCounts.get(dateStr) || { entradas: 0, salidas: 0, transfers: 0 };
        counts.transfers++;
        movementCounts.set(dateStr, counts);
      } else {
        dailySalidas.set(dateStr, (dailySalidas.get(dateStr) || 0) + m.quantity);
        const counts = movementCounts.get(dateStr) || { entradas: 0, salidas: 0, transfers: 0 };
        counts.salidas++;
        movementCounts.set(dateStr, counts);
      }
    });

    // Mapear datos a todos los días del mes usando las fechas completas
    const entradasData = fullDates.map(d => dailyEntradas.get(d) || 0);
    const salidasData = fullDates.map(d => dailySalidas.get(d) || 0);
    const transfersData = fullDates.map(d => dailyTransfers.get(d) || 0);

    const actualMonth = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

    this.movementsChart = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Entradas',
            data: entradasData,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: '#22c55e',
          },
          {
            label: 'Salidas',
            data: salidasData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: '#ef4444',
          },
          {
            label: 'Transferencias',
            data: transfersData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const index = items[0].dataIndex;
                const date = dates[index];
                return date.toLocaleDateString('es-CL', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              },
              label: (context) => {
                const value = context.parsed.y;
                if (value === 0) return '';
                return `${context.dataset.label}: ${value} unidades`;
              },
              footer: (items) => {
                const index = items[0].dataIndex;
                const dateStr = fullDates[index];
                const counts = movementCounts.get(dateStr);
                
                if (!counts) return '';
                
                const lines = [];
                const total = counts.entradas + counts.salidas + counts.transfers;
                if (total > 0) {
                  lines.push(`Total operaciones: ${total}`);
                  
                  const netBalance = entradasData[index] - salidasData[index];
                  if (netBalance !== 0) {
                    const sign = netBalance > 0 ? '+' : '';
                    lines.push(`Balance neto: ${sign}${netBalance}`);
                  }
                }
                
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { 
              color: '#374151',
              maxRotation: 0,
              autoSkip: false,
            },
            grid: { color: 'rgba(15,23,42,0.03)' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#374151' },
            grid: { color: 'rgba(15,23,42,0.06)' },
            title: { display: true, text: 'Cantidad', color: '#374151' }
          }
        }
      }
    });
  }
}
