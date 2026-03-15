import { MetaData } from "@/shared/models/apiResponse";

export type Supplier = {
    id: string;
    idFiscal: string;
    countryId: string;
    supplierName: string;
    description: string;
    available: boolean;
}

export type ExtendedSupplier = Supplier & {
    rawFiscalId: string;
    fiscalName: string;
    fiscalAddress: string;
    email: string;
}

export type SupplierResponse = {
    items: Supplier[];
    metadata: MetaData;
}

export type SupplierProduct = {
    productId: string;
    productName: string;
    productDescription: string;
    productImage: string | null;
    companyId: string;
    storeId: string;
    supplierId: string;
    productCompanyId: string;
    productCompanySku: string;
    supplierProductId: string;
    supplierProductPrice: number;
    supplierProductMinQuantity: number | null;
    unitPurchase: string;
}

export type SupplierProductsResponse = {
    items: SupplierProduct[];
    metadata: MetaData;
}