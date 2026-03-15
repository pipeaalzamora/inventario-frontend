import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import { Storage } from './storage.service';
import { NotificationService } from './notification.service';
import { NavigationEnd, Router } from '@angular/router';
import appData from 'public/config';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private breakpointObserver = inject(BreakpointObserver);
  private storageService = inject(Storage);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isMobile = signal<boolean>(false);
  public isTablet = signal<boolean>(false);
  public isLaptop = signal<boolean>(false);
  public isDesktop = signal<boolean>(false);
  
  public isSidebarOpen = signal<boolean>(false);
  
  public actualRoute = signal<string[]>([]);
  
  private openModals = signal<number[]>([]);
  
  public someModalOpen = computed(() => this.openModals().length > 0);
  

  constructor() {
    this.isSidebarOpen.set(this.storageService.getItem('isOpen') ?? false);

    this.breakpointObserver.observe([
      '(max-width: 750px)',
      '(min-width: 751px) and (max-width: 1145px)',
      '(min-width: 1146px) and (max-width: 1540px)',
      '(min-width: 1541px)'
    ]).pipe(
      takeUntilDestroyed(),
      tap((result: BreakpointState) => {
        const breakpoints = result.breakpoints;
        
        this.isMobile.set(!!breakpoints['(max-width: 750px)']);
        this.isTablet.set(!!breakpoints['(min-width: 751px) and (max-width: 1145px)']);
        this.isLaptop.set(!!breakpoints['(min-width: 1025px) and (max-width: 1540px)']);
        this.isDesktop.set(!!breakpoints['(min-width: 1541px)']);
      })
    ).subscribe();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      tap(() => {
        if (this.isMobile() && this.isSidebarOpen()) this.toggleSidebar();
      }),
      tap(() => this.actualRoute.set(this.router.url.split('/'))),
      takeUntilDestroyed()
    ).subscribe();

    effect(() => {
      const value: number = this.notificationService.totalNewNotifications();

      document.title = value > 0 ? `(${value}) ${appData.proyectName}` : appData.proyectName;
      return;
    });

    effect(() => {
      if (this.someModalOpen()) {
        this.stopBodyScroll();
      } else {
        this.startBodyScroll();
      }
    })

    effect(() => {
      const isSidebarOpen = this.isSidebarOpen();

      const tables = document.querySelectorAll('.dot-table');

      tables.forEach(table => {
        if (isSidebarOpen) {
          table.classList.add('sidebar-open');
        }else {
          table.classList.remove('sidebar-open');
        }
      });
    })
  }

  public toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());

    this.storageService.setItem('isOpen', this.isSidebarOpen());
  }

  public stopBodyScroll() {
    document.body.style.overflowY = 'hidden';
  }

  public startBodyScroll() {
    document.body.style.overflowY = 'auto';
  }

  public openModal() {
    this.openModals.update((arr) => [...arr, 1]);
  }

  public closeModal() {
    this.openModals.update((arr) => {
      arr.pop();
      return [...arr];
    });
  }
}
