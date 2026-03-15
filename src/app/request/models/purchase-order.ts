import { MetaData } from "@/shared/models/apiResponse"
import { StoreWarehouse } from "@/shared/models/store"
import { Supplier } from "@self-contained-pages/outside-supplier/models/supplier"

export type PurchasesResponse = {
    items: PurchaseOrder[],
    metadata: MetaData
}

export type PurchaseResponseRequest = {
    purchases: PurchasesOrderByRequest[]
}

export type PurchaseOrder = {
    id: string;
    displayId: string;
    supplierId: string;
    supplierName: string;
    supplierPhone: string;
    storeId: string;
    storeName: string;
    warehouseId: string;
    warehouseName: string;
    warehouseAddress: string;
    warehousePhone: string;
    inventoryRequestId: string;
    parentPurchaseId: string | null;
    parentDisplayId: string | null;
    childrenPurchase: ChildrenPurchases[] | null;
    status: PurchaseOrderStatus;
    deliveryPurchaseNoteDisplayId: string | null;
    deliveryPurchaseNoteId: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export type ChildrenPurchases = {
    purchaseChildId: string;
    purchaseChildDisplayId: string;
}

export type PurchaseOrderStatus = 'pending' | 'rejected' | 'completed' | 'sunk' | 'on_delivery' | 'cancelled' | 'arrived' | 'edited';

export type PurchaseOrderDetail = PurchaseOrder & {
    sonPurchaseId: string | null;
    items: PurchaseOrderItem[] | null;
    purchaseHistory: PurchaseHistory[] | null;
}

export type PurchasesOrderByRequest = PurchaseOrder & {
    purchaseHistory: PurchaseHistory[] | null;
}

export type NewPurchaseForm = {
    supplierId: Supplier['id'];
    storeId: string;
    warehouseId: StoreWarehouse['id'];
    description: string;
    items: { itemId: string; quantity: number}[];
}

export type PurchaseOrderItem = {
    id: string;
    purchaseId: string;
    storeProductId: string;
    productCompanyId: string;
    productName: string;
    quantity: number;
    purchaseUnit: string;
    unitPrice: number;
    subtotal: number;
    status: PurchaseOrderItemStatus;
}

export type PurchaseOrderItemStatus = 'pending' | 'approved' | 'rejected' | 'delivered' | 'retried' | 'no_supplier';

export type PurchaseHistory = {
    id: string;
    purchaseId: string;
    newStatus: string;
    changedAt: string | Date;
}