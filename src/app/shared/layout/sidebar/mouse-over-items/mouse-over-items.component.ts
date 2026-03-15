import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { LinkDirective } from '@/shared/directives/link.directive';
import { MenuItem } from '@/menu-items';
import { MouseOverSecondLayerComponent } from './mouse-over-second-layer/mouse-over-second-layer.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { tap } from 'rxjs';
import { LayoutService } from '@/shared/services/layout.service';

@Component({
  selector: 'dot-mouse-over-items',
  imports: [
    LinkDirective,
    MouseOverSecondLayerComponent
  ],
  templateUrl: './mouse-over-items.component.html',
  styleUrls: [
    './mouse-over-items.component.less',
    '../../../../../assets/less/components/sidebar.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MouseOverItemsComponent {
  private el = inject(ElementRef);
  private router = inject(Router);
  private layoutService = inject(LayoutService);

  item = input<MenuItem>()
  itemId = output<MenuItem | undefined>()
  clickedOut = output()
  hoverOut = output()
  selectFirstItem = output<MenuItem>()

  protected actualRoute = computed(() => this.layoutService.actualRoute());

  secondItemHover: MenuItem | undefined;
  secondItemClick: MenuItem | undefined;

  stopAnimation: boolean = false;

  constructor() {
    this.router.events.pipe(
      tap(event => {
        if (event instanceof NavigationEnd) {
          this.secondItemHover = undefined;
          this.secondItemClick = undefined;
        }
      }),
      takeUntilDestroyed()
    ).subscribe();
  }

  onScroll() {
    this.stopAnimation = false;
    const box = this.el.nativeElement.querySelector('.menuList');
    if (!box) return;

    if (box.scrollTop + box.clientHeight >= box.scrollHeight) {
      this.stopAnimation = true;
    }
  }

  handleMouseEnter() {
    this.secondItemHover = undefined;
    this.itemId.emit(this.item());
  }

  handleMouseLeave(event: MouseEvent) {
    this.stopAnimation = false;

    const secondLayer = this.el.nativeElement.querySelector('dot-mouse-over-second-layer') as HTMLElement;

    if (secondLayer.contains(event.relatedTarget as HTMLElement)) return;

    this.itemId.emit(undefined);
    this.secondItemHover = undefined;
  }                                     

  handleClickOut() {
    this.clickedOut.emit();
    this.secondItemHover = undefined;
    this.secondItemClick = undefined;
  }

  selectSecondItem(item?: MenuItem | undefined, event?: MouseEvent) {
    if (typeof item === 'undefined') {
      setTimeout(() => {
        this.hoverOut.emit();
        return this.secondItemHover = undefined;
      }, 300);
    }

    if (event) {
      const secondLayer = this.el.nativeElement.querySelector('dot-mouse-over-second-layer') as HTMLElement;
  
      if (secondLayer.contains(event.relatedTarget as HTMLElement)) return;
    }
    this.secondItemHover = item;
  }

  selectSecondItemClick(item: MenuItem | undefined) {
    if (typeof item === 'undefined') {
      this.clickedOut.emit();
      setTimeout(() => {
        this.secondItemHover = undefined;
        this.secondItemClick = undefined;
      }, 1000);
      return;
    }
    this.selectFirstItem.emit(this.item()!);
    this.secondItemClick = item;
  }

  handleItemMouseLeave(event: MouseEvent) {
    const secondLayer = this.el.nativeElement.querySelector('dot-mouse-over-second-layer') as HTMLElement;

    if (secondLayer.contains(event.relatedTarget as HTMLElement)) return;

    this.secondItemClick = undefined;
    this.secondItemHover = undefined;
  }

  handleSecondLayerMouseLeave( event: MouseEvent ) {
    // if (event.relatedTarget === this.el.nativeElement.querySelector('.backdrop')) {
    //   this.secondItemHover = undefined
    //   setTimeout(() => {
    //     this.hoverOut.emit();
    //   }, 140);
    //   return
    // }
    // if (event.target !== this.el.nativeElement.querySelector('.menuList')) return;
    this.secondItemHover = undefined;
    this.hoverOut.emit();
  }

  protected itemHasChilds(item: MenuItem | undefined): boolean {
    if (!item || !item.menuList) {
      return false;
    }

    if (item.menuList.length && item.menuList.some(item => item.isMenuVisible)) {
      return true;
    }

    return false;
  }
}
