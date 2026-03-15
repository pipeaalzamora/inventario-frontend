import { Routes } from "@angular/router";

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('@self-contained-pages/outside-supplier/supplier-manage-oc/supplier-manage-oc.component').then(m => m.SupplierManageOcComponent),
    },
    {
        path: 'success',
        loadComponent: () => import('@self-contained-pages/outside-supplier/supplier-manage-oc/success.component').then(m => m.SuccessComponent),
    },
    {
        path: 'token-expired',
        loadComponent: () => import('@self-contained-pages/outside-supplier/supplier-manage-oc/token-expired.component').then(m => m.TokenExpiredComponent),
    },
    {
        path: '**',
        redirectTo: 'error'
    }
    
]