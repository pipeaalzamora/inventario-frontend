import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

export type RadioGroup = {
  label: string;
  icon: string;
  type: string;
  disabled?: boolean;
  description?: string;
}

@Component({
  selector: 'dot-radio-group-buttons',
  imports: [],
  templateUrl: './radio-group-buttons.component.html',
  styleUrl: './radio-group-buttons.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadioGroupButtonsComponent {
  public options = input.required<RadioGroup[]>();
  public selected = model<RadioGroup>();
  public detailedView = input<boolean>(false);
  public onSelectOption = output<RadioGroup>();

  protected handleOptionClick(option: RadioGroup, event: Event): void {
    if (option.disabled) return;
    event.preventDefault();
    this.selected.set(option);
    this.onSelectOption.emit(option);
  }
}
