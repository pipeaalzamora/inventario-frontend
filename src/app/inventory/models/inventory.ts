import { ProductTemplate } from '@/shared/models/products';

export type UnitInventory = {
    id: number;
    name: string;
    abbreviation: string;
    description: string;
    isBasic: boolean;
}

export type ProductCosts = {
    costEstimated: number;
}

export type ProductQuantities = {
    minimalStock: number;
    maximalStock: number;
    maxQuantity: number;
}

export type InventoryTotals = {
    currentStock: number;
    areMinAlert: boolean;
    avgCost: number;
    totalCost: number;
    areMaxAlert: boolean;
    stockIn: number;
    stockOut: number;
}

export type InventoryStock = {
    storeProductId: string;
    warehouseId: string;
    warehouseName: string;
    currentStock: number;
    avgCost: number;
}

export type InventoryProduct = {
    id: string;
    storeId: string;
    productTemplate: ProductTemplate;
    tagId: number;
    productName: string;
    image: string;
    itemSale: boolean;
    useRecipe: boolean;
    unitInventory: UnitInventory;
    //unitMatrix: UnitMatrix[];
    description: string;
    costs: ProductCosts;
    quantities: ProductQuantities;
    createdAt: Date | string;
    updatedAt: Date | string;
    totals: InventoryTotals;
    stock: InventoryStock[];
}

export type InventoryProductToMovement = InventoryProduct & {
    quantity: number;
    reason: string;
    // Campos para incidencias
    incidencePhoto?: File | null;
    incidencePhotoPreview?: string | null;
    incidenceObservation?: string;
}

////////////////////
export type InventoryByWarehouse = {
    warehouseId: string;
    warehouseName: string;
    products: InventoryProduct[];
}

////////////////////
// Movimientos de inventario
export type MovementType = 'entrada' | 'salida';

export type Movement = {
    id: string;
    fecha: Date | string;
    tipo: MovementType;
    cantidad: number;
    usuario: string;
    motivo: string;
    saldoResultante: number;
    precioUnitario: number;
    costoTotal: number;
    documentoRef: string | null;
    notas: string | null;
}

export type ProductMovements = {
    id: string;
    productCompanyId: string;
    purchaseId: string | null;
    observation: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    productState: string;
    movedFrom: string;
    movedTo: string;
    movedAt: Date | string;
    movementType: 'NEWINPUT' | 'NEWOUTPUT' | 'TRANSFER';
    movementDocType: string;
    documentReference: string | null;
    movedBy: string;
    stockBefore: number;
    stockAfter: number;
    inventoryUnit: string;
}

////////////////////
// Transferencias de inventario
export type TransferItem = {
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    maxQuantity: number;
    unitCost: number;
    totalCost: number;
}

export type TransferRequest = {
    sourceWarehouseId: string;
    targetWarehouseId: string;
    items: TransferItem[];
}
