import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, Renderer2, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarItemsComponent } from './sidebar-items/sidebar-items.component';
import { MenuItem, menuItems } from '@/menu-items';
import { MouseOverItemsComponent } from './mouse-over-items/mouse-over-items.component';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigateService } from '@/shared/services/navigate.service';
import { LayoutService } from '@/shared/services/layout.service';
import { tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarItemsMobileComponent } from './sidebar-items-mobile/sidebar-items-mobile.component';
import { ToggleThemeComponent } from '@/shared/components/toggle-theme/toggle-theme.component';
import { AuthService } from '@/auth/services/auth.service';
import { LinkDirective } from '@/shared/directives/link.directive';
import { LogoComponent } from 'public/logo';
import { CompanyService } from '@/shared/services/company.service';
import { Company } from '@/shared/models/company';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { NgOptimizedImage } from '@angular/common';
import { NoImageComponent } from 'public/default/no-image.component';



@Component({ 
  selector: 'dot-sidebar',
  imports: [
    SidebarItemsComponent,
    MouseOverItemsComponent,
    MatExpansionModule,
    MatTooltipModule,
    SidebarItemsMobileComponent,
    ToggleThemeComponent,
    LinkDirective,
    LogoComponent,
    DropdownComponent,
    ModalComponent,
    NgOptimizedImage,
    NoImageComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: [
    './sidebar.component.less',
    '../../../../assets/less/components/sidebar.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private layoutService = inject(LayoutService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  protected navigateService = inject(NavigateService);

  protected isSidebarOpen = computed(() => this.layoutService.isSidebarOpen());
  protected items = signal<MenuItem[]>([]);
  protected isMobile = computed(() => this.layoutService.isMobile());
  protected companies = computed<Company[]>(() => this.companyService.companies());
  protected selectedCompany = computed<Company | null>(() => this.companyService.selectedCompany());
  protected userAccount = computed(() => this.authService.userAccount());

  protected mouseOverItem: MenuItem | undefined;
  protected clickedItem: MenuItem | undefined;

  protected accordion = viewChild.required<MatAccordion>(MatAccordion);

  constructor() {
    this.items.set(menuItems);

    this.router.events.pipe(
      tap(event => {
        if (event) {
          this.mouseOverItem = undefined;
          this.clickedItem = undefined;

          if (this.isMobile()) {
            const sidebar = this.el.nativeElement.querySelector('#sidebar');
  
            this.renderer.removeClass(sidebar, 'open');
          }
        }
      }),
      takeUntilDestroyed()
    ).subscribe();

    effect(() => {
      if (this.isSidebarOpen()) {
        this.mouseOverItem = undefined;
        this.clickedItem = undefined;
      } 
      else {
        this.accordion()?.closeAll();
      }
    })
  }

  protected changeCompany(company: Company) {
    this.companyService.selectedCompany.set(company);
    
    const currentUrl = this.router.url;
    
    if (currentUrl.includes('/company') || currentUrl.includes('/store')) {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          this.router.navigateByUrl(currentUrl);
        }, 10);
      });
    } else {
      window.location.reload();
    }
  }

  protected switchIsOpen() {
    this.layoutService.toggleSidebar();
  }

  protected showItem(item: MenuItem | undefined) {
    if (typeof item === 'undefined') return this.mouseOverItem = undefined;

    this.mouseOverItem = item
  }

  protected handleClick(item: MenuItem) {
    if (!item?.menuList?.length || item.menuList.some(item => !item.isMenuVisible) || this.isSidebarOpen()) {
      this.mouseOverItem = undefined;
      this.clickedItem = undefined;
      return;
    }
    this.clickedItem = item;
  }

  protected deleteItem() {
    this.clickedItem = undefined;
    this.mouseOverItem = undefined;
  }

  protected handleMouseLeave(event: MouseEvent) {
    const helper = this.el.nativeElement.querySelector('#helper-mouse-over') as HTMLElement;

    const container = this.el.nativeElement.querySelector('.routes-items') as HTMLElement;
    const related = event.relatedTarget as HTMLElement;

    if (
      !container.contains(related) ||
      event.layerX < 0
    ) {
      this.mouseOverItem = undefined;

      if (helper) this.renderer.removeClass(helper, 'active');
      return;
    }
  }

  protected handleMouseOver(event: MouseEvent) {
    const helper = this.el.nativeElement.querySelector('#helper-mouse-over') as HTMLElement;

    if (helper) this.renderer.addClass(helper, 'active');

    const el: HTMLElement[] = [
      this.el.nativeElement.querySelector('.itemLink') as HTMLElement,
      this.el.nativeElement.querySelector('a') as HTMLElement
    ]

    const target = event.target as HTMLElement;
    
    if ( el.includes(target) ) return this.mouseOverItem = undefined;
  }

  protected showActions() {
    const container = this.el.nativeElement.querySelector('.accordionActions');
    this.renderer.addClass(container, 'active');
  }

  protected hideActions() {
    const container = this.el.nativeElement.querySelector('.accordionActions');
    this.renderer.removeClass(container, 'active');
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }
}
