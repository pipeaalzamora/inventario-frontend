import { MenuItem } from "@/menu-items";

export const defaultRoutes: MenuItem[] = [
    {
        name: 'users',
        text: 'Usuarios',
        url: 'users',
        icon: 'fa-solid fa-users',
        loadComponent: () => import('@/system/users/users.component').then(m => m.UsersComponent),
        powers: [],
        isMenuVisible: true,
        menuList: [
            {
                name: 'user-form',
                text: 'Formulario',
                url: ':id',
                loadComponent: () => import('@/system/users/user-form/user-form.component').then(m => m.UserFormComponent),
                powers: [
                    'user:update',
                    'user:delete',
                    'user:enable-disable'
                ],
                isMenuVisible: false,
                menuList: []
            },
            {
                name: 'user-form-new',
                text: 'Formulario',
                url: 'new',
                loadComponent: () => import('@/system/users/user-form/user-form.component').then(m => m.UserFormComponent),
                powers: [
                    'user:create'
                ],
                isMenuVisible: false,
                menuList: []
            }
        ]
    },
    {
        name: 'profiles',
        text: 'Perfiles',
        url: 'profiles',
        icon: 'fa-solid fa-shield',
        loadComponent: () => import('@/system/profiles/profiles.component').then(m => m.ProfilesComponent),
        powers: [],
        isMenuVisible: true,
        menuList: [
            {
                name: 'profile-form',
                text: 'Formulario',
                url: ':id',
                loadComponent: () => import('@/system/profiles/profile-form/profile-form.component').then(m => m.ProfileFormComponent),
                powers: [
                    'profile:update',
                    'profile:delete'
                ],
                isMenuVisible: false,
                menuList: []
            },
            {
                name: 'profile-form-new',
                text: 'Formulario',
                url: 'new',
                loadComponent: () => import('@/system/profiles/profile-form/profile-form.component').then(m => m.ProfileFormComponent),
                powers: [
                    'profile:create'
                ],
                isMenuVisible: false,
                menuList: []
            }
        ]
    }
];