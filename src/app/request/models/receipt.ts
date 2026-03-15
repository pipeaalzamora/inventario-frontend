import { MetaData } from "@/shared/models/apiResponse";
import { PurchaseOrder } from "./purchase-order";

export type Receipt = {
    id: string;
    display_id: string;
    supplier_id: string;
    supplier_name: string;
    store_id: string;
    store_name: string;
    folio_invoice: string;
    folio_guide: string;
    status: ReceiptStatus;
    warehouse_id: string;
    warehouse_name: string;
    due_date: string | Date;
    comment: string;
    total: number;
    user_name: string;
    created_at: string | Date;
    updated_at: string | Date;
}

export type ReceiptAllResponse = {
    items: Receipt[];
}

export type ReceiptResponse = {
    items: Receipt[];
    metadata: MetaData;
}

export type ReceiptDetail = {
    id: string;
    displayId: string;
    supplierId: string;
    supplierName: string;
    purchaseId: string;
    folioInvoice: string;
    folioGuide: string;
    purchaseDisplayId: string;
    storeId: string;
    storeName: string;
    warehouseId: string;
    status: ReceiptStatus;
    warehouseName: string;
    comment: string;
    total: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    items: ItemReceipt[];
    files: FileReceipt[];
}

export type ReceiptStatus = 'completed' | 'pending' | 'disputed' | 'cancelled';

export type ItemReceipt = {
    id: string;
    deliveryPurchaseNoteId: string;
    productCompanyId: string;
    productName: string;
    quantity: number;
    difference: number;
    status: ReceiptItemStatus;
    unitPrice: number;
    subtotal: number;
    taxTotal: number;
    purchaseUnit: string;
}

export type FileReceipt = {
    id: string;
    fileType: 'img' | 'pdf';
    extension: string;
    fileUrl: string;
    fileName: string;
    fileRole: FileRole;
}

export type FileRole = 'invoice' | 'guide' | 'other';

export type ReceiptItemStatus = string;

export type ReceiptPost = Pick<PurchaseOrder, 'supplierId' | 'storeId' | 'warehouseId'> & { 
    companyId: string;
    purchaseId: string;
    comment: string;
    items: ReceiptItemPost[];
};

export type ReceiptItemPost = {
    storeProductId: string;
    quantity: number;
}