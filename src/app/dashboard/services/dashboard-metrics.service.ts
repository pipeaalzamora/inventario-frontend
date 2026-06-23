import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PurchaseOrder, PurchaseOrderDetail } from '@/request/models/purchase-order';
import { Receipt } from '@/request/models/receipt';
import { PurchaseOrderService } from '@/request/services/purchase-order.service';
import { GoodsReceiptService } from '@/request/services/goods-receipt.service';
import { StoreService } from '@/shared/services/store.service';
import { Store } from '@/shared/models/store';
import { InventoryService } from '@/inventory/services/inventory.service';
import { InventoryByWarehouse } from '@/inventory/models/inventory';
import { CompanyService } from '@/shared/services/company.service';
import { CountService } from '@/inventory/services/count.service';
import { Count } from '@/inventory/models/count';

export type StoreRequestMetric = {
  store: string;
  pending: number;
  inTransit: number;
  toReceive: number;
};

export type TopProductMetric = {
  ranking: number;
  productName: string;
  store: string;
  requests: number;
  percentageOfTotal: number;
};

export type DailyPurchaseMetric = {
  day: number;
  requests: number;
};

export type StoreTimelineMetric = {
  store: string;
  color: string;
  data: DailyPurchaseMetric[];
};

export type SupplierOnTimeMetric = {
  ranking: number;
  supplier: string;
  onTimePercentage: number;
  deliveries: number;
};

export type CountCoverageMetric = {
  store: string;
  coverage: number;
  lastCountDate: Date | null;
};

export type SlowStockMetric = {
  sku: string;
  productName: string;
  productId: string;
  daysSinceMovement: number;
  blockedValue: number;
  store: string;
  percentageOfTotal: number;
};

type SlowStockCandidate = Omit<SlowStockMetric, 'daysSinceMovement' | 'percentageOfTotal'> & {
  lastReferenceDate: Date | null;
};

@Injectable({ providedIn: 'root' })
export class DashboardMetricsService {
  private storeService = inject(StoreService);
  private companyService = inject(CompanyService);
  private purchaseService = inject(PurchaseOrderService);
  private receiptService = inject(GoodsReceiptService);
  private inventoryService = inject(InventoryService);
  private countService = inject(CountService);

  private purchases = signal<PurchaseOrder[]>([]);
  private receipts = signal<Receipt[]>([]);
  private purchaseDetails = signal<PurchaseOrderDetail[]>([]);
  private counts = signal<Count[]>([]);
  private slowStock = signal<SlowStockMetric[]>([]);
  private loadedStoreId = signal<string | null>(null);

  public selectedStore = computed(() => this.storeService.selectedStore());
  public loading = signal(false);

  public totalPurchasesThisMonth = computed(() => {
    const now = new Date();
    return this.purchases().filter(purchase => {
      const createdAt = new Date(purchase.createdAt);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length;
  });

  public openPurchases = computed(() => {
    return this.purchases().filter(purchase => !['completed', 'cancelled'].includes(purchase.status)).length;
  });

  public pendingReceipts = computed(() => {
    const pendingPurchaseReceipts = this.purchases().filter(purchase => purchase.status === 'on_delivery').length;
    const pendingCreatedReceipts = this.receipts().filter(receipt => ['pending', 'disputed'].includes(receipt.status)).length;
    return pendingPurchaseReceipts + pendingCreatedReceipts;
  });

  public activeByStore = computed<StoreRequestMetric[]>(() => {
    const store = this.selectedStore();
    if (!store) return [];

    return [{
      store: store.storeName,
      pending: this.purchases().filter(p => p.status === 'pending').length,
      inTransit: this.purchases().filter(p => p.status === 'on_delivery').length,
      toReceive: this.receipts().filter(r => ['pending', 'disputed'].includes(r.status)).length,
    }];
  });

  public topProducts = computed<TopProductMetric[]>(() => {
    const totals = new Map<string, { productName: string; store: string; requests: number }>();
    let totalRequested = 0;

    for (const detail of this.purchaseDetails()) {
      for (const item of detail.items ?? []) {
        const key = item.storeProductId;
        const current = totals.get(key) ?? {
          productName: item.productName,
          store: detail.storeName,
          requests: 0,
        };
        current.requests += item.quantity;
        totalRequested += item.quantity;
        totals.set(key, current);
      }
    }

    return Array.from(totals.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20)
      .map((item, index) => ({
        ranking: index + 1,
        productName: item.productName,
        store: item.store,
        requests: item.requests,
        percentageOfTotal: totalRequested > 0 ? Number(((item.requests / totalRequested) * 100).toFixed(1)) : 0,
      }));
  });

  public purchasesTimeline = computed<StoreTimelineMetric[]>(() => {
    const store = this.selectedStore();
    if (!store) return [];

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, requests: 0 }));

    for (const purchase of this.purchases()) {
      const createdAt = this.toDate(purchase.createdAt);
      if (!createdAt || createdAt.getMonth() !== now.getMonth() || createdAt.getFullYear() !== now.getFullYear()) continue;
      data[createdAt.getDate() - 1].requests += 1;
    }

    return [{ store: store.storeName, color: '#3b82f6', data }];
  });

  public suppliersOnTime = computed<SupplierOnTimeMetric[]>(() => {
    const now = new Date();
    const grouped = new Map<string, { supplier: string; deliveries: number; onTime: number }>();

    for (const receipt of this.receipts()) {
      if (receipt.status !== 'completed') continue;

      const deliveredAt = this.toDate(receipt.updated_at ?? receipt.created_at);
      if (!deliveredAt || deliveredAt.getMonth() !== now.getMonth() || deliveredAt.getFullYear() !== now.getFullYear()) continue;

      const supplierKey = receipt.supplier_id || receipt.supplier_name || 'sin-proveedor';
      const metric = grouped.get(supplierKey) ?? {
        supplier: receipt.supplier_name || 'Sin proveedor',
        deliveries: 0,
        onTime: 0,
      };

      metric.deliveries += 1;
      const dueDate = this.toDate(receipt.due_date);
      if (dueDate && deliveredAt.getTime() <= dueDate.getTime()) {
        metric.onTime += 1;
      }
      grouped.set(supplierKey, metric);
    }

    return Array.from(grouped.values())
      .map(metric => ({
        ranking: 0,
        supplier: metric.supplier,
        deliveries: metric.deliveries,
        onTimePercentage: metric.deliveries > 0 ? Math.round((metric.onTime / metric.deliveries) * 100) : 0,
      }))
      .sort((a, b) => b.onTimePercentage - a.onTimePercentage || b.deliveries - a.deliveries)
      .slice(0, 10)
      .map((metric, index) => ({ ...metric, ranking: index + 1 }));
  });

  public countCoverage = computed<CountCoverageMetric[]>(() => {
    const store = this.selectedStore();
    if (!store) return [];

    const latestByWarehouse = new Map<string, Count>();
    for (const count of this.counts().filter(item => item.storeId === store.id)) {
      const key = count.warehouseId || store.id;
      const current = latestByWarehouse.get(key);
      if (!current || this.countDateValue(count) > this.countDateValue(current)) {
        latestByWarehouse.set(key, count);
      }
    }

    const records = Array.from(latestByWarehouse.values())
      .map(count => ({
        store: count.warehouseName || store.storeName,
        coverage: this.countCoveragePercentage(count),
        lastCountDate: this.toDate(count.completedAt ?? count.updatedAt ?? count.createdAt),
      }))
      .sort((a, b) => a.store.localeCompare(b.store));

    if (!records.length) return [];

    const globalCoverage = Math.round(records.reduce((acc, record) => acc + record.coverage, 0) / records.length);
    const latestDate = records.reduce<Date | null>((latest, record) => {
      if (!record.lastCountDate) return latest;
      if (!latest || record.lastCountDate.getTime() > latest.getTime()) return record.lastCountDate;
      return latest;
    }, null);

    return [{ store: 'Global', coverage: globalCoverage, lastCountDate: latestDate }, ...records];
  });

  public slowStockSummary = computed<SlowStockMetric[]>(() => this.slowStock());

  constructor() {
    effect(() => {
      const store = this.selectedStore();
      void this.loadStoreMetrics(store);
    });
  }

  public async refresh(): Promise<void> {
    await this.loadStoreMetrics(this.selectedStore(), true);
  }

  private async loadStoreMetrics(store: Store | null, force = false): Promise<void> {
    if (!store) {
      this.loadedStoreId.set(null);
      this.purchases.set([]);
      this.receipts.set([]);
      this.purchaseDetails.set([]);
      this.counts.set([]);
      this.slowStock.set([]);
      return;
    }

    if (!force && this.loadedStoreId() === store.id) return;

    this.loading.set(true);
    this.loadedStoreId.set(store.id);

    try {
      const [purchasesResponse, receiptsResponse, counts] = await Promise.all([
        this.purchaseService.getPurchasesByStorePaginated(store.id, 1, 200),
        this.receiptService.getGoodsReceiptByStorePaginated(store.id, 1, 200),
        this.countService.getCounts(),
      ]);

      const purchases = purchasesResponse?.data ?? [];
      this.purchases.set(purchases);
      this.receipts.set(receiptsResponse?.data ?? []);
      this.counts.set(counts ?? []);

      const currentMonth = new Date();
      const details = await Promise.all(
        purchases
          .filter(purchase => {
            const createdAt = new Date(purchase.createdAt);
            return createdAt.getMonth() === currentMonth.getMonth() && createdAt.getFullYear() === currentMonth.getFullYear();
          })
          .slice(0, 50)
          .map(purchase => this.purchaseService.getPurchaseById(purchase.id))
      );

      this.purchaseDetails.set(details.filter((detail): detail is PurchaseOrderDetail => detail !== null));
      await this.loadSlowStockMetrics(store);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSlowStockMetrics(store: Store): Promise<void> {
    const company = this.companyService.selectedCompany();
    if (!company) {
      this.slowStock.set([]);
      return;
    }

    const warehouses = await this.storeService.getWarehousesByStoreId(store.id);
    const warehouseIds = (warehouses ?? []).map(warehouse => warehouse.id);
    if (!warehouseIds.length) {
      this.slowStock.set([]);
      return;
    }

    const inventory = await this.inventoryService.getInventory(company.id, store.id, warehouseIds);
    const candidates = this.buildSlowStockCandidates(inventory, store.storeName)
      .sort((a, b) => b.blockedValue - a.blockedValue)
      .slice(0, 30);

    const metrics = await Promise.all(candidates.map(candidate => this.enrichWithMovementAge(store.id, candidate)));
    const totalBlockedValue = metrics.reduce((sum, item) => sum + item.blockedValue, 0);

    this.slowStock.set(
      metrics
        .map(item => ({
          ...item,
          percentageOfTotal: totalBlockedValue > 0 ? Number(((item.blockedValue / totalBlockedValue) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.daysSinceMovement - a.daysSinceMovement || b.blockedValue - a.blockedValue)
    );
  }

  private buildSlowStockCandidates(inventory: InventoryByWarehouse[], storeName: string): SlowStockCandidate[] {
    const byProduct = new Map<string, SlowStockCandidate>();

    for (const warehouse of inventory) {
      for (const product of warehouse.products ?? []) {
        const warehouseStock = product.stock?.find(stock => stock.warehouseId === warehouse.warehouseId);
        const currentStock = warehouseStock?.currentStock ?? product.totals?.currentStock ?? 0;
        if (currentStock <= 0) continue;

        const avgCost = warehouseStock?.avgCost ?? product.totals?.avgCost ?? 0;
        const productId = product.id;
        const current = byProduct.get(productId) ?? {
          sku: product.productTemplate?.sku || productId,
          productName: product.productName || product.productTemplate?.name || 'Producto sin nombre',
          productId,
          blockedValue: 0,
          store: storeName,
          lastReferenceDate: this.toDate(product.updatedAt ?? product.createdAt),
        };

        current.blockedValue += currentStock * avgCost;
        byProduct.set(productId, current);
      }
    }

    return Array.from(byProduct.values());
  }

  private async enrichWithMovementAge(storeId: string, candidate: SlowStockCandidate): Promise<SlowStockMetric> {
    let lastMovementDate: Date | null = null;
    try {
      const movements = await this.inventoryService.getProductMovements(storeId, candidate.productId);
      lastMovementDate = movements.reduce<Date | null>((latest, movement) => {
        const movedAt = this.toDate(movement.movedAt);
        if (!movedAt) return latest;
        if (!latest || movedAt.getTime() > latest.getTime()) return movedAt;
        return latest;
      }, null);
    } catch {
      lastMovementDate = null;
    }

    const referenceDate = lastMovementDate ?? candidate.lastReferenceDate;
    const daysSinceMovement = referenceDate
      ? Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / 86_400_000))
      : 0;

    return {
      sku: candidate.sku,
      productName: candidate.productName,
      productId: candidate.productId,
      blockedValue: candidate.blockedValue,
      store: candidate.store,
      daysSinceMovement,
      percentageOfTotal: 0,
    };
  }

  private countCoveragePercentage(count: Count): number {
    const metadata = count.metaData ?? count.countItems ?? [];
    if (!metadata.length) return count.status === 'completed' ? 100 : 0;

    const completed = metadata.filter(item => item.completed).length;
    return Math.round((completed / metadata.length) * 100);
  }

  private countDateValue(count: Count): number {
    return this.toDate(count.completedAt ?? count.updatedAt ?? count.createdAt)?.getTime() ?? 0;
  }

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
