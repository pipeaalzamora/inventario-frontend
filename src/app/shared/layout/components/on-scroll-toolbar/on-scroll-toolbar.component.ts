import { LayoutService } from '@/shared/services/layout.service';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, signal, TemplateRef } from '@angular/core';

@Component({
  selector: 'dot-on-scroll-toolbar',
  imports: [
    NgTemplateOutlet
  ],
  templateUrl: './on-scroll-toolbar.component.html',
  styleUrl: './on-scroll-toolbar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnScrollToolbarComponent {

  private layoutService = inject(LayoutService);

  public templateRef = input<TemplateRef<any> | null>(null);
  public noLayout = input<boolean>(false);
  public pxToTriggerShow = input<number>(30);

  protected scrolled = signal<boolean>(false);
  protected isSidebarOpen = computed(() => this.layoutService.isSidebarOpen());
  protected isMobile = computed(() => this.layoutService.isMobile());


  @HostListener('window:scroll', [])
  protected onScroll() {
    this.scrolled.set(window.scrollY > this.pxToTriggerShow());
  }
}
