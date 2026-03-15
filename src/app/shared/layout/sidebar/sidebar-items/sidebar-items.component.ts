import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, Renderer2} from '@angular/core';
import { MenuItem } from '@/menu-items';
import { MatExpansionModule } from '@angular/material/expansion';
import { LinkDirective } from '@/shared/directives/link.directive';
import { LayoutService } from '@/shared/services/layout.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'dot-sidebar-items',
  imports: [
    MatExpansionModule,
    LinkDirective,
    MatTooltipModule,
  ],
  templateUrl: './sidebar-items.component.html',
  styleUrls: [
    './sidebar-items.component.less',
    '../../../../../assets/less/components/sidebar.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarItemsComponent {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private layoutService = inject(LayoutService);

  item = input.required<MenuItem>();
  itemId = output<MenuItem | undefined>();

  protected actualRoute = computed(() => this.layoutService.actualRoute());

  isOpened = input.required();

  constructor() {

    effect(() => {
      if (this.isOpened()) {
        return this.removeCloseClass();
      }

      return this.applyCloseClass();
    })
  }

  applyCloseClass() {
    const matPanel = this.el.nativeElement.querySelector('mat-expansion-panel');
    const matText = this.el.nativeElement.querySelector('.matText');

    if (matText) this.renderer.addClass(matText, 'close');
    
    setTimeout(() => {
      if (matPanel) this.renderer.addClass(matPanel, 'close');
    }, 300);
  }

  removeCloseClass() {
    const matPanel = this.el.nativeElement.querySelector('mat-expansion-panel');
    const matText = this.el.nativeElement.querySelector('.matText');

    setTimeout(() => {
      if (matPanel) this.renderer.removeClass(matPanel, 'close');
    }, 80);
    
    setTimeout(() => {
      if (matText) this.renderer.removeClass(matText, 'close');
    }, 150);
  }

  handleMouseEnter() {
    if (!this.isOpened() && this.item().menuList.length && this.item().menuList.some(item => item.isMenuVisible)) {
      this.itemId.emit(this.item());
    } else {
      this.itemId.emit(undefined);
    }
  }

  protected handleDisable() {
    if (!this.isOpened() || !this.item().menuList.length || this.item().menuList.some(item => !item.isMenuVisible)) return true;

    return false;
  }

  protected redirectLink() {
    if (this.item().menuList.length && this.item().menuList.some(item => item.isMenuVisible)) return null;

    return this.item().url;
  }

  protected checkForChilds(item: MenuItem | undefined): boolean {
    if (!item || !item.menuList) {
      return false;
    }

    if (item.menuList.length && item.menuList.some(item => item.isMenuVisible)) {
      return true;
    }

    return false;
  }
  

}
