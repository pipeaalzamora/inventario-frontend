import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'dot-toggle',
  templateUrl: './toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  // Inputs usando signal-based inputs
  checked = input<boolean>(false);
  label = input<string>('');
  size = input<'sm' | 'md'>('md');
  labelPosition = input<'left' | 'right'>('right');
  disabled = input<boolean>(false);

  // Output usando signal-based outputs
  checkedChange = output<boolean>();

  protected handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkedChange.emit(target.checked);
  }
}
