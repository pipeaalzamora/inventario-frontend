import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { DatePipe, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, model, untracked } from '@angular/core';

export type PredefinedTimeline = {
  name: string;
  translatedName: string;
  icon: string;
  failed?: boolean;
  link?: boolean;
}

export type RedirectOptions<T> = {
  route: string;
  paramName: string;
  linkTo: T[];
}

@Component({
  selector: 'dot-timeline',
  imports: [NgStyle, DatePipe, DropdownComponent, LinkDirective],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineComponent<T extends Record<string, any>, K extends Record<string, string>> {

  public predefined = model.required<PredefinedTimeline[]>();
  public actualStatus = model.required<string>();
  public customColor = input<string>('var(--background-3)');
  public statusHistory = input<T[]>();
  public failedCases = input<string[]>(['cancelled', 'rejected', 'sunk', 'edited']);
  public redirectOptions = input<RedirectOptions<K>>();
  public noRedirect = input<boolean>(false);

  private actualStatusIndex = computed(() => this.predefined().findIndex(i => i.name === this.actualStatus()));

  private failed = false;

  constructor() {
    effect(() => {
      const statusHistory = this.statusHistory();

      if (!statusHistory) return;

      untracked(() => this.updateEntityStatus(statusHistory));
    })
  }

  protected updateEntityStatus(statusHistory: T[]): void {
    if (!statusHistory || statusHistory.length === 0) return;
    if (!this.failedCases() || this.failedCases().length === 0) return;

    this.cleanPredefined();

    if (!this.failedCases().includes(this.actualStatus())) return;

    this.failed = true;

    const lastStatus = statusHistory[1];
    const failedCase = statusHistory[0];

    if (!lastStatus) return;

    const index = this.predefined().findIndex(i => i.name === lastStatus['newStatus']);

    if (index === -1) return;

    const failedCaseTranslated = () => {
      switch(failedCase['newStatus']) {
        case 'cancelled': return 'Cancelada';
        case 'rejected': return 'Rechazada';
        case 'sunk': return 'No concretada';
        case 'edited': return 'Editada';
        default: return '';
      }
    }

    const failedCaseIcon = () => {
      switch(failedCase['newStatus']) {
        case 'cancelled': return 'fa-solid fa-xmark';
        case 'rejected': return 'fa-solid fa-xmark';
        case 'sunk': return 'fa-solid fa-arrow-up-right-from-square';
        case 'edited': return 'fa-solid fa-pen';
        default: return '';
      }
    }

    this.predefined.update(timeline => {
      return [
        ...timeline.slice(0, index + 1),
        {
          name: failedCase['newStatus'],
          translatedName: failedCaseTranslated(),
          icon: failedCaseIcon(),
          failed: true,
          link: failedCase['newStatus'] === 'sunk' || failedCase['newStatus'] === 'edited' ? true : false
        },
        ...timeline.slice(index + 1)
      ];
    });
  }

  protected itemAlready(index: number):boolean {

    return index <= this.actualStatusIndex();
  }

  protected afterItemAlready(index: number):boolean {
    if (this.failed) return false;

    return index - 1 === this.actualStatusIndex();
  }

  protected cleanPredefined() {
    this.failed = false;
    
    this.predefined.update(timeline => {
      return timeline.filter(item => !this.failedCases().includes(item.name));
    })
  }

  protected getDateByItem(item: PredefinedTimeline): Date | null {
    if (!this.statusHistory()) return null;

    const statusFind = this.statusHistory()!.find(status => status['newStatus'] === item.name);

    if (!statusFind) {
      return null
    }

    return new Date(statusFind['changedAt']);
  }

  protected getRedirectParams(option: any): Record<string, string> {
    const redirectOption = this.redirectOptions();
    if (!redirectOption) return {};
    return { [redirectOption.paramName]: option.purchaseChildId };
  }
}