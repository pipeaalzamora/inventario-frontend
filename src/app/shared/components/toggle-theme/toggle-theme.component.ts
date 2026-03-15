import { Storage } from '@/shared/services/storage.service';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

@Component({
  selector: 'dot-toggle-theme',
  imports: [],
  templateUrl: './toggle-theme.component.html',
  styleUrl: './toggle-theme.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleThemeComponent {
  protected storage = inject(Storage);

  public sidebar = input(false);

  protected switchTheme(event: MouseEvent) {
    if (this.sidebar()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    this.storage.switchTheme();
  }
}
