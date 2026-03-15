import { Route, Routes } from '@angular/router';
import { menuItems, MenuItem } from './menu-items';
import { powersGuard } from '@/shared/guards/powers.guard';
import canActivateGuard from '@/shared/guards/canActivate.guard';


export function createRoutes(items: MenuItem[], parentPath: string = '', routes: Routes = []): Routes {
    for (const item of items) {
        
        const itemPath = `${parentPath}/${item.url}`.replace(/\/+/g, '/');
        
        if (item.menuList && item.menuList.length > 0) {
            createRoutes(item.menuList, itemPath, routes);
        }

        if (typeof item.loadComponent === 'undefined') {
            continue;
        }

        let route: Route = {};
        
        route.path = itemPath.replace(/^\//, '');

        if (typeof item.loadComponent !== 'undefined') {
            route.loadComponent = item.loadComponent;
        }

        if (typeof item.canDeactivate !== 'undefined') {
            route.canDeactivate = [ item.canDeactivate ];
        }

        if (typeof item.powers !== 'undefined' && item.powers.length > 0) {
            route.canActivate = [ () => powersGuard(...item.powers)];
        }

        routes.push(route);
    }
    return routes;
}

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('@auth/login/login.component').then(m => m.Login)
    },
    {
        path: 'recovery',
        loadComponent: () => import('@auth/recovery/recovery.component').then(m => m.Recovery)
    },
    {
        path: 'change-password',
        loadComponent: () => import('@auth/change-password/change-password.component').then(m => m.ChangePassword)
    },
    {
        path: 'supplier-manage-oc',
        loadChildren: () => import('@self-contained-pages/outside-supplier/supplier.routes').then(m => m.routes),
    },
    {
        path: 'not-found',
        loadComponent: () => import('@self-contained-pages/outside-supplier/supplier-manage-oc/error-page.component').then(m => m.ErrorPageComponent),
    },
    {
        path: '',
        canActivate: [canActivateGuard],
        loadComponent: () => import('@shared/layout/layout.component').then(m => m.LayoutComponent),
        loadChildren: () => createRoutes(menuItems)
    },
    {
        path: '**',
        redirectTo: 'not-found',
        pathMatch: 'full'
    }
];
