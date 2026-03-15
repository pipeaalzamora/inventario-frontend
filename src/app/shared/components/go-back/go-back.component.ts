import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

@Component({
  selector: 'dot-go-back',
  imports: [],
  templateUrl: './go-back.component.html',
  styleUrl: './go-back.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoBackComponent {
  private layoutService = inject(LayoutService);
  private navigateService = inject(NavigateService);

  //public predefinedBack = input<boolean>(false);

  protected isMobile = computed(() => this.layoutService.isMobile());

  public fallback = input<string>();
  public replace = input<string | undefined>(undefined);
  public replacePath = input<Record<string, string> | undefined>(undefined);
  public replaceQuery = input<Record<string, unknown> | undefined>(undefined);

  protected goBack():void {
    if (typeof this.replace() != 'undefined') {
      // Navegación temporal a fallback predefinido
      this.navigateService.replace(this.replace() as string, this.replacePath(), this.replaceQuery());
      return;
    }
    // Volver en el historial
    this.navigateService.pop(this.fallback(), this.replacePath(), this.replaceQuery());
  }

}
