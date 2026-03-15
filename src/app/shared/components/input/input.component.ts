import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, Renderer2, untracked, viewChild } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'dot-input',
  imports: [
    Field,
    MatTooltipModule,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'dot-label input',
    '[class.has-value]': 'hasValue()',
    '[class.has-error]': 'showErrors()',
    '[class.compact]': 'compact()',
    '[class.readonly]': 'isReadonly()',
    '[class.disabled]': 'isDisabled()',
    '[class.reveal-on-hover]': 'revealOnHover()',
    '[class.success]': 'success()',
    '(click)': 'focusInput()'
  }
})
export class InputComponent {

  private renderer = inject(Renderer2);

  private inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  private prefixRef = viewChild<ElementRef<HTMLDivElement>>('prefixEl');

  // Con signal Form, utilizar el campo del form
  field = input<FieldTree<string | number>>();

  // Sin un signal Form
  standalone = input<boolean>(false);
  
  value = model<string | number>('');
  touched = model<boolean>(false);
  manualDisabled = input<boolean>(false);
  manualReadonly = input<boolean>(false);
  manualInvalid = input<boolean>(false);
  manualRequired = input<boolean>(false);

  valueChange = output<string | number>();

  onfocus = output<string | number>();
  onblur = output<string | number>();

  // Configuración del componente
  label = input<string>('');
  revealOnHover = input<boolean>(false);
  placeholder = input<string>('');
  type = input<'text' | 'email' | 'password' | 'number' | 'tel'>('text');
  icon = input<string>('');
  prefix = input<string>('');
  compact = input<boolean>(false);
  success = input<boolean>(false);

  protected hasValue = computed(() => {
    const fieldValue = this.field;

    if (fieldValue()) {
      const val = fieldValue()!().value();
      return val && String(val).trim() !== '';
    }

    const val = this.value();

    return val && String(val).trim() !== '';
  });

  protected showErrors = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().touched() && fieldValue().invalid();
    }
    return this.touched() && this.manualInvalid();
  });

  protected fieldErrors = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().errors();
    }
    return [];
  });

  protected isRequired = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().required();
    }
    return this.manualRequired();
  });

  protected isDisabled = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().disabled();
    }
    return this.manualDisabled();
  });

  protected isReadonly = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().readonly();
    }
    return this.manualReadonly();
  });

  protected isHidden = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().hidden();
    }
    return false;
  });

  protected isNumericField = computed(() => {
    const fieldValue = this.field();
    if (!fieldValue) return false;
    const val = fieldValue().value();
    return typeof val === 'number';
  });

  protected fieldString = computed(() => this.field() as unknown as FieldTree<string>);
  protected fieldNumber = computed(() => this.field() as unknown as FieldTree<number>);

  protected fieldValue = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().value();
    }
    return this.value();
  });

  constructor() {
    effect(() => {
      const prefixEl = this.prefixRef()?.nativeElement;
      const inputEl = this.inputRef()?.nativeElement;
      
      if (!prefixEl || !inputEl) return;

      const prefixWidth = prefixEl.offsetWidth;

      if (prefixWidth > 0) {
        untracked(() => this.renderer.setStyle(inputEl, 'paddingLeft', `${prefixWidth - 2}px`));
      }
    });
  }

  protected onInput(event: Event): void {
    let value: string | number = (event.target as HTMLInputElement).value;
    
    // Convertir a número si el tipo es 'number'
    if (this.type() === 'number' && value !== '') {
      value = Number(value);
    }
    
    // Si no es standalone, actualizar el field signal form
    if (!this.standalone()) {
      const fieldValue = this.field();
      if (fieldValue) {
        fieldValue().value.set(value as any);
      }
    } else {
      this.value.set(value);
      this.valueChange.emit(value);
    }
  }

  protected onBlur(): void {
    if (!this.standalone()) {
      const fieldValue = this.field();
      if (fieldValue) {
        fieldValue().markAsTouched();
      }
    } else {
      this.touched.set(true);
    }

    this.onblur.emit(this.fieldValue());
  }

  protected onFocus(): void {
    this.onfocus.emit(this.fieldValue());
  }

  public focusInput(): void {
    this.inputRef()?.nativeElement.focus();
  }

  public setValue(value: string | number): void {
    if (!this.standalone()) {
      const fieldValue = this.field();
      if (fieldValue) {
        fieldValue().value.set(value as any);
      }
    } else {
      this.value.set(value);
    }

    if (this.inputRef()?.nativeElement) {
      this.inputRef()!.nativeElement.value = String(value);
    }
  }

  protected getErrorsTooltip(): string {

    if (!this.showErrors()) return '';
    
    const errors = this.fieldErrors();

    let tooltip = '';

    for (const error of errors) {
      tooltip += `- ${error.message}.\n`;
    }

    return tooltip.trim();
  }
}