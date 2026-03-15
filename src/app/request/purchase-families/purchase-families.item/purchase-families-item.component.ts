import { PredefinedTimeline, TimelineComponent } from '@/shared/components/timeline/timeline.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, Renderer2, untracked } from '@angular/core';
import { SortedPurchase } from '@/request/purchase-families/purchase-families.component';

@Component({
  selector: 'dot-request-purchase-item',
  imports: [
    TimelineComponent,
    DatePipe,
    LinkDirective,
    RequestPurchaseItemComponent
  ],
  templateUrl: './purchase-families-item.component.html',
  styleUrl: './purchase-families-item.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestPurchaseItemComponent {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  public order = input.required<SortedPurchase>();
  public predefinedTimeline = input.required<PredefinedTimeline[]>();
  public isMobile = input<boolean>();
  public branchColor = input<string>();
  public noChildren = input<boolean>(false);

  constructor() {
    effect(() => {
      const order = this.order();
      const card = this.el.nativeElement.querySelector('.order-status') as HTMLElement;

      if (!order || !card || this.noChildren()) return;

      untracked(() => this.makeBranchColor(order.level, card));
    })
  }

  private makeBranchColor(level: number, card: HTMLElement) {
    this.renderer.setStyle(card, 'border-left-color', `color-mix(in srgb, ${this.branchColor()} 50%, light-dark(black, white) ${level * 10}%)`);
  }
}
