import { Directive, ElementRef, HostListener, inject, input, Renderer2, signal, effect, OnDestroy, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[dot-input]'
})
export class InputDirective implements AfterViewInit, OnDestroy {
  
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private inputValue = signal<string>('');
  private mutationObserver: MutationObserver | null = null;
  public withValueConfirmation = input<boolean>(false);

  constructor() {
    effect(() => {
      const value = this.inputValue();
      this.checkInputValue(value);
    });
  }

  ngAfterViewInit(): void {
    this.tryFindInput();

    if (!this.inputElement) {
      this.setupMutationObserver();
    }
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      if (!this.inputElement) {
        this.tryFindInput();
        
        if (this.inputElement) {
          this.disconnectObserver();
        }
      }
    });

    this.mutationObserver.observe(this.el.nativeElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value']
    });
  }

  private disconnectObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private tryFindInput(): void {
    this.inputElement = this.el.nativeElement.querySelector('input') as HTMLInputElement ?? 
      this.el.nativeElement.querySelector('textarea') as HTMLTextAreaElement ??
      null;
    
    if (!this.inputElement) {
      return;
    }

    const initialValue = this.inputElement.value || '';
    this.inputValue.set(initialValue);

    this.checkInputValue(this.inputValue());
    this.checkForPrefix();
    this.checkForReadonly();

    this.observeInputValue();
  }

  //MAGIA DE LA IA (NO TOCAR)
  private observeInputValue(): void {
    if (!this.inputElement) return;

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(this.inputElement), 
      'value'
    );

    if (originalDescriptor && originalDescriptor.set) {
      const originalSet = originalDescriptor.set;
      const self = this;
      
      Object.defineProperty(this.inputElement, 'value', {
        get: function() {
          return originalDescriptor.get?.call(this);
        },
        set: function(val) {
          originalSet.call(this, val);
          self.inputValue.set(val || '');
        },
        configurable: true
      });
    }
  }

  @HostListener('focus')
  protected onFocus(): void {
    this.inputElement?.focus();
  }

  @HostListener('input')
  @HostListener('change')
  @HostListener('focus')
  @HostListener('blur')
  protected onInputChange(): void {
    
    if (!this.inputElement) {
      this.tryFindInput();
      return;
    }

    const currentValue = this.inputElement.value || '';
    if (this.inputValue() !== currentValue) {
      this.inputValue.set(currentValue);
    }

    if (this.inputElement instanceof HTMLTextAreaElement) {
      this.renderer.setStyle(this.inputElement, 'height', 'auto');
      this.renderer.setStyle(this.inputElement, 'height', `${this.inputElement.scrollHeight}px`);
    }
  }

  private checkInputValue(value: string): void {
    if (!this.inputElement) return;

    const hasValue = value && 
                    typeof value === 'string' && 
                    value.trim() !== '';

    if (hasValue) {
      this.renderer.addClass(this.el.nativeElement, 'has-value');

      if (this.withValueConfirmation()) {
        this.renderer.addClass(this.el.nativeElement, 'with-value-confirmation');
      }
    } else {
      this.renderer.removeClass(this.el.nativeElement, 'has-value');

      if (this.withValueConfirmation()) {
        this.renderer.removeClass(this.el.nativeElement, 'with-value-confirmation');
      }
    }
  }

  private checkForReadonly():void {
    if (!this.inputElement) return;

    if (this.inputElement.readOnly) {
      this.renderer.addClass(this.el.nativeElement, 'readonly');
    }
  }

  private checkForPrefix(): void {
    const prefixEl = this.el.nativeElement.querySelector('.dot-label-prefix') as HTMLDivElement;
    const inputEl = this.el.nativeElement.querySelector('input') as HTMLInputElement;
    const labelTextEl = this.el.nativeElement.querySelector('.dot-label-text') as HTMLDivElement;

    if (!prefixEl || !inputEl || !labelTextEl) return;

    const prefixWidth = prefixEl.offsetWidth;

    if (prefixWidth > 0) {
      this.renderer.setStyle(inputEl, 'padding-left', `${prefixWidth}px`);
      this.renderer.setStyle(labelTextEl, 'left', `${prefixWidth + 12}px`);
    }
  }
}