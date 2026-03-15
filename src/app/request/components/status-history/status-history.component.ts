import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'dot-status-history',
  imports: [
    DatePipe
  ],
  templateUrl: './status-history.component.html',
  styleUrl: './status-history.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusHistoryComponent <T extends Record<string, any>>{
  public statusHistory = input.required<T[]>();
  public showOnlyLast = input<boolean>();
  public isMobile = input<boolean>();

  public valueInput = output<string>();
  public emitRedirect = output<void>();

  constructor() {}
}
