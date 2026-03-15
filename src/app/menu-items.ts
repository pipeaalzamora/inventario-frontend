import { Type } from "@angular/core";
import { CanDeactivateFn, DefaultExport } from "@angular/router";
import { Observable } from "rxjs";
import { defaultRoutes } from "src/default-routes";
import { CanComponentDeactivate, canDeactivateGuard } from "@/shared/guards/canDeactivate.guard";

export type MenuItem = {
    name: string;
    text: string;
    abbreviation?: string;
    url: string;
    icon?: string;
    loadComponent?: () => Type<unknown> | Observable<Type<unknown> | DefaultExport<Type<unknown>>> | Promise<Type<unknown> | DefaultExport<Type<unknown>>>;
    menuList: MenuItem[];
    powers: string[];
    hasBottomDivider?: boolean;
    canDeactivate?: CanDeactivateFn<CanComponentDeactivate>;
    isMenuVisible: boolean;
}

const dashboard: MenuItem = {
    name: 'dashboard',
    text: 'Dashboard',
    abbreviation: 'Dashboard',
    url: '',
    icon: 'fa-solid fa-table-columns',
    loadComponent: () => import('@/dashboard/dashboard.component').then(m => m.Dashboard),
    powers: [],
    hasBottomDivider: true,
    isMenuVisible: true,
    menuList: []
}

const compras: MenuItem = {
    name: 'request',
    text: 'Compras',
    abbreviation: 'Compras',
    url: 'request',
    icon: 'fa-solid fa-basket-shopping',
    loadComponent: () => import('@/request/request.component').then(m => m.RequestComponent),
    powers: [],
    isMenuVisible: true,
    menuList: [
        {
            name: 'solicitud-form',
            text: 'Formulario',
            url: ':id',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/request-form/request-form.component').then(m => m.RequestFormComponent),
            powers: [],
            isMenuVisible: false,
            menuList: [
                {
                    name: 'solicitud-orders',
                    text: 'Formulario',
                    url: 'orders',
                    icon: 'fa-solid fa-table-columns',
                    loadComponent: () => import('@/request/purchase-families/purchase-families.component').then(m => m.RequestPurchaseOrderComponent),
                    powers: [],
                    isMenuVisible: false,
                    menuList: []
                },
            ]
        },
        {
            name: 'solicitud-form-new',
            text: 'Formulario',
            url: 'new',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/request-form/request-form.component').then(m => m.RequestFormComponent),
            powers: [],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'purchase-order-form-new',
            text: 'Formulario',
            url: 'order/new',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/purchase-order/new-purchase/new-purchase.component').then(m => m.NewPurchaseComponent),
            powers: [
                'request:resolve'
            ],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'purchase-order-form',
            text: 'Formulario',
            url: 'order/:orderId',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/purchase-order/purchase-detail/purchase-detail.component').then(m => m.PurchaseOrderFormComponent),
            powers: [
                'request:create'
            ],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'goods-receipt',
            text: 'Recepción de mercancías',
            url: 'order/:purchaseId/goods-receipt',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/goods-receipt/goods-receipt.component').then(m => m.GoodsReceiptComponent),
            powers: [],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'receipt-detail',
            text: 'Recepción de mercancías',
            url: 'receipt/:receiptId',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/request/goods-receipt/goods-receipt-detail/goods-receipt-detail.component').then(m => m.GoodsReceiptDetailComponent),
            powers: [],
            isMenuVisible: false,
            menuList: []
        }
    ]
}

const inventario: MenuItem = {
    name: 'inventory',
    text: 'Inventario',
    abbreviation: 'Inventario',
    url: 'inventory',
    icon: 'fa-solid fa-boxes-stacked',
    loadComponent: () => import('@/inventory/inventory.component').then(m => m.InventoryComponent),
    powers: [],
    isMenuVisible: true,
    menuList: [
        {
            name: 'inventory-count-form',
            text: 'Conteo de inventario',
            url: 'count/:countId',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/inventory/count-form/create/count-form-create.component').then(m => m.CountFormComponent),
            powers: ['inventory_count:update'],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'new-inventory-count-form',
            text: 'Conteo de inventario',
            url: 'count/new',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/inventory/count-form/create/count-form-create.component').then(m => m.CountFormComponent),
            powers: ['inventory_count:create'],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'complete-count',
            text: 'Conteo de inventario completo',
            url: 'make-count/:countId',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/inventory/count-form/assigned-count/assigned-count.component').then(m => m.AssignedCountComponent),
            powers: ['inventory_count:update'],
            canDeactivate: canDeactivateGuard,
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'new-inventory-decrease-form',
            text: 'Registrar salida',
            url: 'decrease/new',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/inventory/movement-form/movement-form.component').then(m => m.DecreaseFormComponent),
            powers: ['product_movement:create'],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'inventory-decrease-form',
            text: 'Registrar salida',
            url: 'decrease/:decreaseId',
            icon: 'fa-solid fa-table-columns',
            loadComponent: () => import('@/inventory/movement-form/movement-form.component').then(m => m.DecreaseFormComponent),
            powers: ['product_movement:update'],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'product-movements',
            text: 'Movimientos de producto',
            url: 'movements/:warehouseId/:productId',
            icon: 'fa-solid fa-eye',
            loadComponent: () => import('@/inventory/product-movements/product-movements.component').then(m => m.ProductMovementsComponent),
            powers: [],
            isMenuVisible: false,
            menuList: []
        },
        {
            name: 'inventory-transfer',
            text: 'Transferencia de inventario',
            url: 'transfer/new',
            icon: 'fa-solid fa-arrows-rotate',
            loadComponent: () => import('@/inventory/inventory-transfer/inventory-transfer.component').then(m => m.InventoryTransferComponent),
            powers: ['product_movement:create'],
            isMenuVisible: false,
            menuList: []
        }
    ]
}

const recipes: MenuItem = {
    name: 'recipes',
    text: 'Recetas',
    abbreviation: 'Recetas',
    url: 'recipes',
    icon: 'fa-solid fa-book-open',
    loadComponent: () => import('@/recipes/recipes-list/recipes-list.component').then(m => m.RecipesListComponent),
    powers: [],
    hasBottomDivider: true,
    isMenuVisible: true,
    menuList: []
}

const reports: MenuItem = {
    name: 'reports',
    text: 'Reportes',
    abbreviation: 'Reportes',
    url: 'reports',
    icon: 'fa-solid fa-chart-line',
    powers: [],
    isMenuVisible: true,
    menuList: [
        {
            name: 'inventory-report',
            text: 'Reporte de inventario',
            url: 'inventory-report',
            icon: 'fa-solid fa-boxes-stacked',
            loadComponent: () => import('@/reports/materia-prima/materia-prima.component').then(m => m.MateriaPrimaComponent),
            powers: [],
            isMenuVisible: true,
            menuList: []
        },
    ]
}  

const myCompany: MenuItem = {
    name: 'my-company',
    text: 'Mi Empresa',
    abbreviation: 'Empresa',
    url: 'my-company',
    icon: 'fa-solid fa-industry',
    powers: [],
    hasBottomDivider: true,
    isMenuVisible: true,
    menuList: [
        // {
        //     name: 'product-management',
        //     text: 'Gestión productos',
        //     url: 'product-management',
        //     icon: 'fa solid fa-clipboard-list',
        //     loadComponent: () => import('@/my-company/products/products.component').then(m => m.ProductManagementComponent),
        //     powers: [],
        //     isMenuVisible: true,
        //     menuList: [
        //         {
        //             name: 'product-management-form-new',
        //             text: 'Crear producto',
        //             url: 'new',
        //             icon: 'fa-solid fa-box',
        //             loadComponent: () => import('@/my-company/products/products-form/product-management-form.component')
        //                 .then(m => m.ProductManagementFormComponent),
        //             powers: [],
        //             isMenuVisible: false,
        //             menuList: []
        //         },
        //         {
        //             name: 'product-management-form',
        //             text: 'Editar producto',
        //             url: ':id',
        //             icon: 'fa-solid fa-box',
        //             loadComponent: () => import('@/my-company/products/products-form/product-management-form.component')
        //                 .then(m => m.ProductManagementFormComponent),
        //             powers: [],
        //             isMenuVisible: false,
        //             menuList: []
        //         }
        //     ]
        // },
        {
            name: 'my-suppliers',
            text: 'Mis Proveedores',
            url: 'my-suppliers',
            icon: 'fa-solid fa-truck',
            loadComponent: () => import('@/my-company/my-suppliers/my-suppliers.component').then(m => m.MySuppliersComponent),
            powers: [],
            isMenuVisible: true,
            canDeactivate: canDeactivateGuard,
            menuList: []
        },
        {
            name: 'store',
            text:'Tiendas',
            url: 'store',
            icon:"fa-solid fa-store",
            loadComponent: () => import('@/my-company/store/store.component').then(m => m.StoreComponent),
            powers: [],
            isMenuVisible:true,
            menuList: [
                {
                    name: 'store-form-new',
                    text: 'Nueva tienda',
                    url: 'new',
                    loadComponent: () => import('@/my-company/store/form/form.component').then(m => m.StoreFormComponent),
                    powers: ['store:create'],
                    canDeactivate: canDeactivateGuard,
                    isMenuVisible: false,
                    menuList: [],
                },
                {
                    name: 'store-form',
                    text: 'Ver/Editar',
                    url: ':id',
                    loadComponent: () => import('@/my-company/store/form/form.component').then(m => m.StoreFormComponent),
                    powers: ['store:update'],
                    canDeactivate: canDeactivateGuard,
                    isMenuVisible: false,
                    menuList: [],
                },
            ]
        },
    ],
}

const system: MenuItem = {
    name: 'sistem',
    text: 'Sistema',
    abbreviation: 'Sistema',
    url: 'sistem',
    icon: 'fa-solid fa-cogs',
    powers: [],
    isMenuVisible: true,
    menuList: [
        {
            name: 'unit-measurement',
            text:'Unidades de medida',
            url: 'unit-measurement',
            icon:"fa-solid fa-building",
            loadComponent: () => import('@/system/unit-measurement/unit-measurement.component').then(m => m.UnitMeasurementComponent),
            powers: [],
            isMenuVisible:true,
            menuList: []
        },
        {
            name: 'product',
            text: 'Plantillas de producto',
            url: 'product',
            icon: 'fa-solid fa-box',
            loadComponent: () => import('@/system/template-product/template-product.component').then(m => m.ProductComponent),
            powers: [],
            isMenuVisible: true,
            menuList: [
                {
                    name: 'product-form-new',
                    text: 'Crear producto',
                    url: 'new',
                    icon: 'fa-solid fa-box',
                    loadComponent: () => import('@/system/template-product/template-product-form/product-form.component')
                        .then(m => m.ProductFormComponent),
                    powers: ['template_product:create'],
                    isMenuVisible: false,
                    menuList: []
                },
                {
                    name: 'product-form',
                    text: 'Editar producto',
                    url: ':id',
                    icon: 'fa-solid fa-box',
                    loadComponent: () => import('@/system/template-product/template-product-form/product-form.component')
                        .then(m => m.ProductFormComponent),
                    powers: ['template_product:update'],
                    isMenuVisible: false,
                    menuList: []
                }
            ]
        },
        {
            name: 'supplier',
            text: 'Proveedores',
            url: 'supplier',
            icon: 'fa-solid fa-industry',
            loadComponent: () => import('@/my-company/supplier/supplier.component').then(m => m.SupplierComponent),
            powers: [],
            isMenuVisible: true,
            menuList: [
                {
                    name: 'supplier-form',
                    text: 'Formulario de proveedor',
                    url: ':id',
                    icon: 'fa-solid fa-table-columns',
                    loadComponent: () => import('@/my-company/supplier/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
                    powers: [],
                    isMenuVisible: false,
                    menuList: []
                },
                {
                    name: 'new-supplier-form',
                    text: 'Formulario de proveedor',
                    url: 'new',
                    icon: 'fa-solid fa-table-columns',
                    loadComponent: () => import('@/my-company/supplier/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
                    powers: [],
                    isMenuVisible: false,
                    menuList: []
                },
            ],
        },
        {
            name: 'company',
            text:'Empresas',
            url: 'company',
            icon:"fa-solid fa-building",
            loadComponent: () => import('@/system/company/company.component').then(m => m.company),
            powers: [],
            isMenuVisible:true,
            menuList: [
                {
                    name: 'company-form-new',
                    text: 'Nueva compañía',
                    url: 'new',
                    loadComponent: () => import('@/system/company/form/form.component').then(m => m.CompanyFormComponent),
                    powers: ['company:create'],
                    canDeactivate: canDeactivateGuard,
                    isMenuVisible: false,
                    menuList: [],
                
                },
                {
                    name: 'company-form',
                    text: 'Ver/Editar',
                    url: ':id',
                    loadComponent: () => import('@/system/company/form/form.component').then(m => m.CompanyFormComponent),
                    powers: ['company:update'],
                    canDeactivate: canDeactivateGuard,
                    isMenuVisible: false,
                    menuList: [],
                    
                },
            ]
        },
        ...defaultRoutes
    ]
}



export const menuItems: MenuItem[] = [
    dashboard,
    compras,
    inventario,
    recipes,
    reports,
    myCompany,
    system,
];