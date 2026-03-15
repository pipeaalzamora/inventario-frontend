import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, untracked, viewChild } from '@angular/core';

type CustomBackground = '1' | '2' | '3' | '4' | '5';
type ButtonAlign = 'right' | 'left' | 'center';
type Justify = 'start' | 'center' | 'end';

@Component({
  selector: 'dot-numeric-input',
  imports: [
    NgStyle,
    NgTemplateOutlet,
],
  templateUrl: './numeric-input.component.html',
  styleUrl: './numeric-input.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NumericInputComponent {
  public initialValue = input<number>(0);
  public step = input<number>(1);
  public min = input<number>(-Infinity);
  public max = input<number>(Infinity);
  public disabled = input<boolean>(false);
  public readonly = input<boolean>(false);
  public floatNumber = input<boolean>(false);
  public customBackground = input<CustomBackground>('2');
  public buttonsAlign = input<ButtonAlign>('center');
  public compact = input<boolean>(false);
  public valueChange = output<number>();
  public justify = input<Justify>('center');
  public valueLessThanMin = output<void>();

  private insideValue = signal<number>(this.initialValue());

  protected decreaseShouldBeDisabled = computed(() => {
    return this.disabled() || this.readonly() || this.insideValue() <= this.min();
  });

  protected increaseShouldBeDisabled = computed(() => {
    return this.disabled() || this.readonly() || (this.max() && this.insideValue() >= this.max()!);
  });

  private inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  constructor() {
    effect(() => {
      const value = this.insideValue();
      const inputEl = this.inputEl();

      if (!inputEl) return;

      untracked(() => this.inputEl()!.nativeElement.value = value.toString());
    });

    effect(() => {
      const newInitialValue = this.initialValue();
      
      untracked(() => {
        if (this.insideValue() !== newInitialValue) {
          this.insideValue.set(newInitialValue);
        }
      });
    });
  }

  protected onInput(event: Event): void {
    let valueToEmit = (event.target as HTMLInputElement).valueAsNumber;

    if (!this.floatNumber()) {
      valueToEmit = Math.floor(valueToEmit);
    }

    if (isNaN(valueToEmit)) {

      valueToEmit = 0;

    } else if (valueToEmit < this.min()) {

      valueToEmit = this.min()!;

    } else if (this.max() && valueToEmit > this.max()!) {

      valueToEmit = this.max()!;
    }

    this.updateValue(valueToEmit);
  }

  protected onBlur(event: Event): void {
    let value = (event.target as HTMLInputElement).valueAsNumber;

    if (!this.floatNumber()) {
      value = Math.floor(value);
    }

    if (isNaN(value)) {

      value = 0;

    } else if (value < this.min()) {

      value = this.min()!;

    } else if (this.max() && value > this.max()!) {

      value = this.max()!;
    }

    if (value !== this.insideValue()) {
      this.updateValue(value);
    } else {
      this.inputEl()!.nativeElement.value = value.toString();
    }
  }

  protected decrease(): void {
    if (this.decreaseShouldBeDisabled()) return;

    let newValue = this.insideValue() - this.step();

    if (this.min() && newValue < this.min()!) {
      newValue = this.min()!;
    }

    this.inputFocusAnimation();

    if ('vibrate' in navigator) navigator.vibrate(20);

    this.updateValue(newValue);
  }

  protected increase(): void {
    if (this.increaseShouldBeDisabled()) return;

    let newValue = this.insideValue() + this.step();

    if (this.max() && newValue > this.max()!) {
      newValue = this.max()!;
    }

    this.inputFocusAnimation();

    if ('vibrate' in navigator) navigator.vibrate(20);

    this.updateValue(newValue);
  }

  private inputFocusAnimation(): void {
    const inputElement = this.inputEl()!.nativeElement;

    const animation = inputElement.animate([
      { borderColor: 'var(--border)', offset: 0 },
      { borderColor: 'var(--border)', offset: 0.4 },
      { borderColor: 'var(--border-very-light)', offset: 1 }
    ], {
      duration: 1000,
      easing: 'ease-in-out'
    });

    animation.play();
  }

  private updateValue(value: number): void {
    this.valueChange.emit(value);
    this.insideValue.set(value);
  }
}
