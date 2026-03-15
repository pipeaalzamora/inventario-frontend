export type StoresResponse = {
    stores: Store[];
}

export type Store = {
    id: string;
    companyId: string;
    externalCode?: string;
    storeName: string;
    storeAddress: string;
    description: string;
    idCostCenter: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    warehouses: StoreWarehouse[]; 
     
    //supplierApplied?: StoreSupplier[];
    //supplierCount?: number;
}
export type StoreWarehouse = {
    id : string;
    storeId: string;
    warehouseName: string;
    description: string;
    warehouseAddress: string;
    warehousePhone: string;
    isMomeventWarehouse: boolean;
    createdAt: string | Date;
}

/*
export type StoreSupplier = {
    id?:string;
    supplier_name: string;
    available: boolean;
    idFiscal?: string;
}
*/


export type WarehouseResponse = {
    warehouses: StoreWarehouse[];
}

export type WarehouseRecipe = {
    companyId: string;
    storeId: string;
    warehouseName: string;
    description: string;
    warehouseAddress: string;
}

/*

export type Warehouse = {
    id: string;
    store_id: Store['id'];
    warehouse_name: string;
    warehouse_address: string;
    description: string;
    delivery_instructions: string;
    working_hours: Record<string, Array<string>>;
    working_timezone: string;
    createdAt: string | Date;
}
*/
