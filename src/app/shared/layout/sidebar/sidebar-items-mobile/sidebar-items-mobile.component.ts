import { Component, computed, effect, inject, input, output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { LinkDirective } from '@/shared/directives/link.directive';
import { MenuItem } from '@/menu-items';
import { LayoutService } from '@/shared/services/layout.service';

@Component({
  selector: 'dot-sidebar-items-mobile',
  imports: [
    MatExpansionModule,
    LinkDirective
  ],
  templateUrl: './sidebar-items-mobile.component.html',
  styleUrls: [
    './sidebar-items-mobile.component.less',
    '../../../../../assets/less/components/sidebar.less'
  ]
})
export class SidebarItemsMobileComponent {
  private layoutService = inject(LayoutService);

  item = input<MenuItem>();
  closeMenu = output();

  protected actualRoute = computed(() => this.layoutService.actualRoute());

  constructor() {

    effect(() => {
      const isOpen = this.layoutService.isSidebarOpen();
      const isMobile = this.layoutService.isMobile();

      if (isOpen && isMobile) {
        this.layoutService.stopBodyScroll();
      } else {
        this.layoutService.startBodyScroll();
      }
    })
  }

  protected checkForChilds(item: MenuItem | undefined): boolean {
    if (!item || !item.menuList) {
      return false;
    }

    return item.menuList.length > 0 && item.menuList.some(subItem => subItem.isMenuVisible);
  }

  protected handleDisable() {
    if (!this.item()?.menuList?.length || this.item()?.menuList.some(item => !item.isMenuVisible)) return true;

    return false;
  }
}
