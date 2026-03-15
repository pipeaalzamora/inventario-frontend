import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { InventoryService } from '../services/inventory.service';
import { InventoryProduct, TransferRequest } from '../models/inventory';
import { CompanyService } from '@/shared/services/company.service';
import { StoreService } from '@/shared/services/store.service';
import { StoreWarehouse } from '@/shared/models/store';
import { NavigateService } from '@/shared/services/navigate.service';
import { LayoutService } from '@/shared/services/layout.service';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { SelectComponent } from '@/shared/components/select/select.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { NoImageComponent } from 'public/default/no-image.component';
import { NumericInputComponent } from '@/shared/components/numeric-input/numeric-input.component';
import { TabsComponent } from '@/shared/components/tabs/tabs.component';
import { ToggleComponent } from '@/shared/components/toggle/toggle.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';

type SelectableProduct = InventoryProduct & {
  selected: boolean;
  transferQuantity: number;
};

@Component({
  selector: 'dot-inventory-transfer',
  imports: [
    FormsModule,
    SectionWrapperComponent,
    GoBackComponent,
    SelectComponent,
    LinkDirective,
    SearchBarComponent,
    ClpCurrencyPipe,
    NoImageComponent,
    NumericInputComponent,
    NgOptimizedImage,
    NgTemplateOutlet,
    TabsComponent,
    LoadingDirective,
    ToggleComponent,
    ModalComponent,
  ],
  templateUrl: './inventory-transfer.component.html',
  styleUrl: './inventory-transfer.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryTransferComponent {
  private inventoryService = inject(InventoryService);
  private companyService = inject(CompanyService);
  private storeService = inject(StoreService);
  private navigateService = inject(NavigateService);
  private layoutService = inject(LayoutService);

  protected isMobile = this.layoutService.isMobile;
  protected isTablet = this.layoutService.isTablet;

  protected isSidebarOpen = this.layoutService.isSidebarOpen;

  protected tabMode = computed<boolean>(() => this.isMobile() || this.isTablet());

  protected selectedStore = this.storeService.selectedStore;

  // Control de estado
  protected insufficientWarehouses = signal<boolean>(false);

  // Modal de confirmación
  protected confirmModal = viewChild<ModalComponent>('confirmModal');

  // Bodegas
  protected warehouses = signal<StoreWarehouse[]>([]);
  // Productos de la bodega origen
  protected sourceProducts = signal<SelectableProduct[]>([]);
  // Productos de la bodega destino
  protected destinationProducts = signal<InventoryProduct[]>([]);

  // Control de filtro en bodega destino
  protected showAllDestinationProducts = signal<boolean>(false);

  protected selectedSourceOption = signal<StoreWarehouse | null>(null);
  protected selectedTargetOption = signal<StoreWarehouse | null>(null);

  // Bodegas disponibles para destino (excluye origen)
  protected targetWarehouseOptions = computed<StoreWarehouse[]>(() => {
    const selectedSource = this.selectedSourceOption();

    if (!selectedSource) return this.warehouses();

    return this.warehouses().filter(w => w.id !== selectedSource.id);
  });

  protected sourceWarehouseOptions = computed<StoreWarehouse[]>(() => {
    const selectedTarget = this.selectedTargetOption();

    if (!selectedTarget) return this.warehouses();

    return this.warehouses().filter(w => w.id !== selectedTarget.id);
  });

  // Productos seleccionados para transferir
  protected selectedProducts = computed(() => {
    return this.sourceProducts().filter(p => p.selected && p.transferQuantity > 0);
  });

  // Totales
  protected totalItemsToTransfer = computed(() => {
    return this.selectedProducts().reduce((sum, p) => sum + p.transferQuantity, 0);
  });

  protected totalCostToTransfer = computed(() => {
    return this.selectedProducts().reduce((sum, p) => sum + (p.transferQuantity * p.totals.avgCost), 0);
  });

  // Validación del formulario
  protected isFormValid = computed(() => {
    return (
      this.selectedSourceOption() &&
      this.selectedTargetOption() &&
      this.selectedProducts().length > 0 &&
      this.selectedProducts().every(p => p.transferQuantity <= p.totals.currentStock)
    );
  });

  // Controllers para búsqueda/paginación
  protected sourceController = new PaginationController<SelectableProduct>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['productName', 'sku'],
    slicedMode: false,
  });

  protected destinationController = new PaginationController<InventoryProduct>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['productName', 'sku'],
    slicedMode: false,
  });

  constructor() {
    effect(() => {
      const storeId = this.selectedStore()?.id;

      if (!storeId) return;

      this.getWarehouses(storeId);
    })

    // Alimentar controllers cuando cambian los datos
    effect(() => this.sourceController.SetRawData(this.sourceProducts()));
    effect(() => this.destinationController.SetRawData(this.getMergedDestinationView()));
  }

  private async getWarehouses(storeId: string): Promise<void> {
    const warehouses = await this.storeService.getWarehousesByStoreId(storeId);

    this.warehouses.set(warehouses ?? []);
    this.insufficientWarehouses.set((warehouses ?? []).length < 2);
  }

  protected async onSourceWarehouseChange(option: StoreWarehouse | null): Promise<void> {
    if (!option) {
      this.sourceProducts.set([]);
      this.selectedSourceOption.set(null);
      return;
    }

    this.selectedSourceOption.set(option);

    const targetWarehouse = this.selectedTargetOption();

    // Limpiar destino si es igual al nuevo origen
    if (targetWarehouse && targetWarehouse.id === option.id) {
      this.selectedTargetOption.set(null);
      this.destinationProducts.set([]);
    }

    await this.loadSourceProducts();
  }

  protected async onTargetWarehouseChange(option: any): Promise<void> {
    if (!option) {
      this.selectedTargetOption.set(null);
      this.destinationProducts.set([]);
      return;
    }

    const warehouse = this.warehouses().find(w => w.id === option.id) ?? null;
    this.selectedTargetOption.set(warehouse);

    await this.loadDestinationProducts();
  }

  private async loadSourceProducts(): Promise<void> {
    const companyId = this.companyService.selectedCompany()?.id;
    const storeId = this.storeService.selectedStore()?.id;
    const warehouseId = this.selectedSourceOption()?.id;

    if (!companyId || !storeId || !warehouseId) return;

    const inventory = await this.inventoryService.getInventory(companyId, storeId, [warehouseId]);
    
    const warehouseData = inventory.find(w => w.warehouseId === warehouseId);
    const products: SelectableProduct[] = (warehouseData?.products ?? []).map(p => ({
      ...p,
      selected: false,
      transferQuantity: 0,
    }));

    this.sourceProducts.set(products);
  }

  private async loadDestinationProducts(): Promise<void> {
    const companyId = this.companyService.selectedCompany()?.id;
    const storeId = this.storeService.selectedStore()?.id;
    const warehouseId = this.selectedTargetOption()?.id;

    if (!companyId || !storeId || !warehouseId) {
      this.destinationProducts.set([]);
      return;
    }

    const inventory = await this.inventoryService.getInventory(companyId, storeId, [warehouseId]);
    const warehouseData = inventory.find(w => w.warehouseId === warehouseId);
    this.destinationProducts.set(warehouseData?.products ?? []);
  }

  protected toggleProductSelection(product: SelectableProduct): void {
    const products = this.sourceProducts();
    const index = products.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
      const updated = [...products];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected,
        transferQuantity: !updated[index].selected ? 1 : 0,
      };
      this.sourceProducts.set(updated);
    }
  }

  protected updateTransferQuantity(product: SelectableProduct, quantity: number): void {
    const products = this.sourceProducts();
    const index = products.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
      const updated = [...products];
      const validQuantity = Math.max(0, Math.min(quantity, product.totals.currentStock));
      updated[index] = {
        ...updated[index],
        transferQuantity: validQuantity,
        selected: validQuantity > 0,
      };
      this.sourceProducts.set(updated);
    }
  }

  protected getNewSourceStock(product: SelectableProduct): number {
    return product.totals.currentStock - product.transferQuantity;
  }

  protected getNewSourceTotalCost(product: SelectableProduct): number {
    return this.getNewSourceStock(product) * product.totals.avgCost;
  }

  protected getNewDestinationStock(product: InventoryProduct): number {
    const selected = this.selectedProducts().find(p => p.id === product.id);
    const qty = selected?.transferQuantity ?? 0;
    const destCurrent = product.totals.currentStock ?? 0;
    return destCurrent + qty;
  }

  protected getTransferQuantity(product: InventoryProduct): number {
    const selected = this.selectedProducts().find(p => p.id === product.id);
    
    return selected?.transferQuantity ?? 0;
  }

  protected isNewInDestination(product: InventoryProduct): boolean {
    const selected = this.selectedProducts().find(p => p.id === product.id);
    if (!selected || selected.transferQuantity <= 0) return false;
    return (product.totals.currentStock ?? 0) <= 0;
  }

  protected hasSourceWarning(product: SelectableProduct): boolean {
    const newStock = this.getNewSourceStock(product);
    const min = product.quantities?.minimalStock ?? 0;
    return newStock < min;
  }

  protected hasDestinationWarning(product: InventoryProduct): boolean {
    const min = product.quantities?.minimalStock ?? 0;
    return this.getNewDestinationStock(product) < min;
  }

  // Métodos para cálculo de costos en destino
  protected getDestinationOldAvgCost(product: InventoryProduct): number {
    // Retorna el costo promedio actual en destino (antes de transferencia)
    return product.totals.avgCost ?? 0;
  }

  protected getNewDestinationAvgCost(product: InventoryProduct): number {
    // Calcula el costo promedio ponderado en destino después de la transferencia
    const selected = this.selectedProducts().find(p => p.id === product.id);
    if (!selected || selected.transferQuantity <= 0) {
      return this.getDestinationOldAvgCost(product);
    }

    const stockDestino = product.totals.currentStock ?? 0;
    const cantidadEntrante = selected.transferQuantity;
    const costoDestino = this.getDestinationOldAvgCost(product);
    const costoOrigen = selected.totals.avgCost;

    // Si no hay stock en destino, usar costo de origen
    if (stockDestino <= 0) {
      return costoOrigen;
    }

    // Calcular promedio ponderado: (stockDestino × costoDestino + cantidadEntrante × costoOrigen) / (stockDestino + cantidadEntrante)
    const totalCostoDestino = stockDestino * costoDestino;
    const totalCostoEntrante = cantidadEntrante * costoOrigen;
    const nuevoStock = stockDestino + cantidadEntrante;
    
    return (totalCostoDestino + totalCostoEntrante) / nuevoStock;
  }

  protected getNewDestinationTotalCost(product: InventoryProduct): number {
    // Calcula el costo total del producto en destino después de la transferencia
    return this.getNewDestinationStock(product) * this.getNewDestinationAvgCost(product);
  }

  protected getCostChangeDirection(product: InventoryProduct): 'up' | 'down' | 'same' {
    // Compara costo antiguo vs nuevo y retorna dirección del cambio
    const oldCost = this.getDestinationOldAvgCost(product);
    const newCost = this.getNewDestinationAvgCost(product);
    
    const difference = newCost - oldCost;
    const threshold = 0.01; // Umbral para considerar iguales (evitar problemas de punto flotante)
    
    if (Math.abs(difference) < threshold) {
      return 'same';
    }
    
    return difference > 0 ? 'up' : 'down';
  }

  // Métodos para costos totales por bodega
  protected getSourceWarehouseTotalCost(): number {
    // Suma de costos totales de productos seleccionados en origen (después de transferencia)
    return this.selectedProducts().reduce((sum, p) => {
      return sum + (this.getNewSourceStock(p) * p.totals.avgCost);
    }, 0);
  }

  protected getDestinationWarehouseTotalCost(): number {
    // Suma de costos totales de productos en destino (después de transferencia)
    const selectedIds = new Set(this.selectedProducts().map(p => p.id));
    let total = 0;

    // Sumar costos de productos que ya existen en destino y no están siendo transferidos
    this.destinationProducts().forEach(destProduct => {
      if (!selectedIds.has(destProduct.id)) {
        const destStock = destProduct.totals.currentStock ?? 0;
        const destCost = destProduct.totals.avgCost ?? 0;
        total += destStock * destCost;
      }
    });

    // Sumar costos de productos que están siendo transferidos (con su nuevo costo)
    selectedIds.forEach(productId => {
      const destProduct = this.destinationProducts().find(p => p.id === productId);
      if (destProduct) {
        total += this.getNewDestinationTotalCost(destProduct);
      } else {
        // Producto nuevo en destino
        const sourceProduct = this.selectedProducts().find(p => p.id === productId);
        if (sourceProduct) {
          const transferQty = sourceProduct.transferQuantity;
          const originCost = sourceProduct.totals.avgCost;
          total += transferQty * originCost;
        }
      }
    });

    return total;
  }

  // Métodos para mostrar costos en origen
  protected getProductSourceCurrentTotalCost(product: SelectableProduct): number {
    // Costo total producto en origen (antes de transferencia)
    return product.totals.currentStock * product.totals.avgCost;
  }

  // Método helper para obtener producto de destino desde producto de origen
  protected getDestinationProductForSource(sourceProduct: SelectableProduct): InventoryProduct | null {
    const destProduct = this.destinationProducts().find(p => p.id === sourceProduct.id);
    if (destProduct) {
      return destProduct;
    }
    // Si no existe en destino, crear un producto virtual con stock 0
    return {
      ...sourceProduct,
      totals: {
        ...sourceProduct.totals,
        currentStock: 0,
      }
    } as InventoryProduct;
  }

  private getMergedDestinationView(): InventoryProduct[] {
    const dest = this.destinationProducts();
    if (!this.selectedTargetOption()) return [];

    if (!this.showAllDestinationProducts()) {
      // NUEVO: Mostrar solo productos seleccionados en origen
      const selectedIds = new Set(this.selectedProducts().map(p => p.id));
      const destFiltered = dest.filter(d => selectedIds.has(d.id));
      
      // Agregar productos seleccionados que no existen en destino (virtuales nuevos)
      const destIds = new Set(destFiltered.map(d => d.id));
      const virtualNew: InventoryProduct[] = this.selectedProducts()
        .filter(sp => !destIds.has(sp.id))
        .map(sp => ({
          ...sp,
          totals: {
            ...sp.totals,
            currentStock: 0, // En destino no existe, stock actual = 0
          },
        } as InventoryProduct));
      
      return [...destFiltered, ...virtualNew];
    }

    // ACTUAL: Mostrar todos los productos (con stock > 0)
    const destWithStock = dest.filter(d => (d.totals.currentStock ?? 0) > 0);
    const destIds = new Set(destWithStock.map(d => d.id));

    // Agregar productos seleccionados que no existen en destino (virtuales nuevos)
    // Para estos, el stock actual en destino es 0
    const virtualNew: InventoryProduct[] = this.selectedProducts()
      .filter(sp => !destIds.has(sp.id))
      .map(sp => ({
        ...sp,
        totals: {
          ...sp.totals,
          currentStock: 0, // En destino no existe, stock actual = 0
        },
      } as InventoryProduct));

    return [...destWithStock, ...virtualNew];
  }

  protected openConfirmModal(): void {
    if (!this.isFormValid()) return;
    
    this.confirmModal()?.openModal();
  }

  protected async executeTransfer(): Promise<void> {
    const companyId = this.companyService.selectedCompany()?.id;
    const storeId = this.storeService.selectedStore()?.id;

    if (!companyId || !storeId) {
      return;
    }

    const transfer: TransferRequest = {
      sourceWarehouseId: this.selectedSourceOption()!.id,
      targetWarehouseId: this.selectedTargetOption()!.id,
      items: this.selectedProducts().map(p => ({
        productId: p.id,
        sku: p.productTemplate.sku,
        productName: p.productName,
        quantity: p.transferQuantity,
        maxQuantity: p.totals.currentStock,
        unitCost: p.totals.avgCost,
        totalCost: p.transferQuantity * p.totals.avgCost,
      }))
    };

    const success = await this.inventoryService.createTransfer(companyId, storeId, transfer);

    if (success) {
      this.navigateService.push('inventory', {});
    }
  }
}
