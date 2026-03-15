import { SupplierProductForm } from "@/shared/models/products";

export type Contact = {
    id: string;
    name: string;
    email: string;
    phone: string;
    description: string;
}

export type CreationContact = Omit<Contact, 'id'> & {
    id?: string;
};

export type SupplierResume = {
    id: string;
    idFiscal: string;
    rawFiscalId: string;
    countryId: string;
    supplierName: string;
    description: string;
    available: boolean;
    email: string;
    fiscalAddress: string;
}

export type SupplierDetail = {
    id: string;
    countryId: string;
    name: string;
    supplierName?: string;
    description: string;
    available: boolean;
    fiscalData: FiscalData;
    priority?: number;
    contacts: Contact[];
    products: SupplierProductForm[];
}

export type SupplierProductFromBack = {
    productId: string;
    name: string;
    description: string;
    sku: string;
    price: number;
    unitName: string;
    unit?: number;
    available: boolean;
}

export type FiscalData = {
    id: string;
    idFiscal: string;
    fiscalName: string;
    email: string;
    fiscalAddress: string;
    fiscalCity: string;
    fiscalState: string;
};

export type SupplierCreation = {
    name: string;
    description: string;
    idFiscal: string;
    fiscalName: string;
    email: string;
    fiscalAddress: string;
    fiscalCity: string;
    fiscalState: string;
    contacts: CreationContact[];
}

export type SuppliersOfProductToBack = Pick<SupplierDetail, 'id'> & {
  index: number;
};

export type SupplierUpdate = SupplierCreation & {
    available: boolean;
}

export type ProductEditForm = {
  name: string;
  sku: string;
  price: string;
  description: string;
  categories: string[];
  codes: string[];
  unitId: number;
  available: boolean;
}

export type BulkPriceFromBack = {
  productId: string;
  price: number;
}

export type SupplierFormType = {
  name: string;
  description: string;
  idFiscal: string;
  fiscalName: string;
  email: string;
  fiscalAddress: string;
  fiscalCity: string;
  fiscalState: string;
  available: boolean;
}

export type QuickProductPriceChange = {
  productId: SupplierProductForm['productId'];
  productName: SupplierProductForm['name'];
  newPrice: number;
  oldPrice: number;
}