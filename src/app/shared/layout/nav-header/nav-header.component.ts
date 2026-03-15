import { AuthService } from '@/auth/services/auth.service';
import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { NotificationContainerComponent } from './notification-container/notification-container.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { Store } from '@/shared/models/store';
import { StoreService } from '@/shared/services/store.service';

@Component({
  selector: 'dot-nav-header',
  imports: [
    NotificationContainerComponent,
    SelectComponent
  ],
  templateUrl: './nav-header.component.html',
  styleUrls: [
    './nav-header.component.less',
    '../../../../assets/less/components/nav-header.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavHeaderComponent {
  private layoutService = inject(LayoutService);
  private authService = inject(AuthService);
  private storeService = inject(StoreService);

  protected isMobile = computed(() => this.layoutService.isMobile());
  protected isSidebarOpen = computed(() => this.layoutService.isSidebarOpen());
  protected scrolled = signal<boolean>(false);
  protected userAccount = computed(() => this.authService.userAccount());
  protected selectedStore = computed<Store | null>(() => this.storeService.selectedStore());
  protected stores = computed<Store[]>(() => this.storeService.stores());
  protected cantSelectStore = computed(() => this.storeService.cantSelectStore());
  protected storeSearchKey = 'storeName' as keyof Store;

  protected toggleSidebar() {
    this.layoutService.toggleSidebar();
  }

  @HostListener('window:scroll', [])
  protected onScroll() {
    this.scrolled.set(window.scrollY > 0);
  }

  protected storeChange(store: Store | null): void {
    if (this.cantSelectStore() || !store) return;
    if (!this.stores().includes(store)) return;

    this.storeService.selectedStore.set(store);
  }
}
