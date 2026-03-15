import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, input, output, Output } from '@angular/core';
import { LinkDirective } from '@/shared/directives/link.directive';
import { MenuItem } from '@/menu-items';
import { LayoutService } from '@/shared/services/layout.service';

@Component({
  selector: 'dot-mouse-over-second-layer',
  imports: [
    LinkDirective,
  ],
  templateUrl: './mouse-over-second-layer.component.html',
  styleUrls: [
    './mouse-over-second-layer.component.less',
    '../../../../../../assets/less/components/sidebar.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MouseOverSecondLayerComponent {
  private layoutService = inject(LayoutService);

  item = input<MenuItem>();
  clickedOut = output()
  hoverOut = output<MouseEvent>()
  secondItem = output<MenuItem | undefined>()

  protected actualRoute = computed(() => this.layoutService.actualRoute());

  handleMouseEnter() {
    this.secondItem.emit(this.item());
  }

  handleMouseLeave(event: MouseEvent) {
    this.hoverOut.emit(event);
  }

  handleClickOut() {
    this.clickedOut.emit();
  }
}
