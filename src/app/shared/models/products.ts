import { UnitMatrix } from "./units";
import { MetaData } from "./apiResponse";
import { SupplierDetail } from "@/my-company/supplier/models/supplier";

export type ProductRestrictedReponse = {
    items: ProductRestricted[];
    metadata: MetaData
}

export type ProductRestricted = {
    id: string;
    name: string;
    description: string;
    image: string | null;
    createdAt: Date | string;
    maxQuantity: number | null;
    unit: string;
}

export type WarehouseProduct = {
    productId: string;
    productName: string;
    productImage: string | null;
    productSku: string | null;
    inStock: number;
    baseUnit: string;
    baseUnitId: number;
}

export type ProductTemplate = {
    id: string;
    sku: string;
    name: string;
    description: string;
    image: string | null;
    categories: ProductTemplateCategory[];
    codes: ProductTemplateCode[];
}

export type SupplierProductForm = Omit<ProductTemplate, 'id' | 'codes'> & {
    productId: string;
    sku: string;
    price: string;
    unitId: number;
    unit?: number;
    unitName: string;
    available: boolean;
}

export type SupplierProductFormPriceInt = Omit<SupplierProductForm, 'price'> & {
    price: number;
}


export type ProductTemplateCategory = {
    id: string;
    name: string;
    description: string;
    available: boolean;
}

export type ProductTemplateCode = {
    id: string;
    kind: CodeKind;
    value: string;
}

export type CodeKind = {
    id: number;
    name: string;
    description: string;
}

export type SupplierRankingList = {
    supplierId: string;
    supplierName: string;
    index: number;
}

export type UnitInventory = {
    id: number;
    name: string;
    abbreviation: string;
    description: string;
    isBasic: boolean;
}

export type ProductCosts = {
    costAvg: number;
    costEstimated: number;
}

export type ProductQuantities = {
    minimalStock: number;
    maximalStock: number;
    maxQuantity: number;
}

export type CompanyProduct = {
    id: string;
    storeId: string;
    productTemplate: ProductTemplate;
    tagId: number;
    sku: string;
    productName: string;
    image: string;
    itemSale: boolean;
    useRecipe: boolean;
    unitInventory: UnitInventory;
    unitMatrix: UnitMatrix[];
    description: string;
    costs: ProductCosts;
    quantities: ProductQuantities;
    suppliers: SupplierDetail[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

