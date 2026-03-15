import { AfterViewInit, Directive, ElementRef, inject, input, OnDestroy, Renderer2} from '@angular/core';

type Position = 'bottom' | 'top' | 'left' | 'right' | 'auto';

@Directive({
  selector: '[dotDropdown]'
})
export class  DropdownDirective implements AfterViewInit, OnDestroy {

  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  public position = input<Position>('auto');

  private dropDown: HTMLElement | null = null;
  private trigger: HTMLElement | null = null;
  private documentClickListener?: (e: Event) => void;
  private isDestroyed = false;

  constructor() {}

  ngAfterViewInit(): void {
    this.trigger = this.el.nativeElement.querySelector('button:first-child');

    this.dropDown = this.el.nativeElement.querySelector('.dot-dropdown-panel') as HTMLElement;

    if (!this.dropDown) return;

    const childs = this.dropDown.querySelectorAll('button') as NodeListOf<HTMLElement>;

    childs.forEach(child => {
      if (!child) return;
      
      this.renderer.listen(child, 'click', () => {
        this.hide();
      });
    });

    if (this.trigger) {
      this.renderer.listen(this.trigger, 'click', () => {
        this.show();
      });
    }

    this.renderer.addClass(this.dropDown, 'shadow');

    if (!this.el.nativeElement.classList.contains('dot-dropdown')) {
      this.renderer.addClass(this.el.nativeElement, 'dot-dropdown');
    }

    this.setupDocumentListener();
  }

  private setupDocumentListener() {
    this.removeDocumentListener();
    
    this.documentClickListener = (event: Event) => {
      if (this.isDestroyed) return;
      
      const target = event.target as HTMLElement;
      
      if (!this.el.nativeElement.contains(target)) {
        this.hide();
      }
    };

    document.addEventListener('pointerdown', this.documentClickListener, true);
  }

  private show() {
    this.renderer.addClass(this.el.nativeElement, 'display');

    this.setPanelPosition(this.position());

    requestAnimationFrame(() => {
      this.renderer.addClass(this.el.nativeElement, 'show');
    })
  }

  private hide() {
    this.renderer.removeClass(this.el.nativeElement, 'show');

    setTimeout(() => {
      this.renderer.removeClass(this.el.nativeElement, 'display');
    }, 150);
  }

  private resetPosition() {
    ['top', 'bottom', 'left', 'right'].forEach(className => {
      this.renderer.setStyle(this.dropDown, className, 'unset');
    });
  }

  private removeDocumentListener() {
    if (this.documentClickListener) {
      document.removeEventListener('pointerdown', this.documentClickListener, true);
      this.documentClickListener = undefined;
    }
  }

  private setPanelPosition(position: Position): void {

    if (!this.dropDown || !this.trigger) return;

    this.resetPosition();

    const dropdownRect = this.dropDown!.getBoundingClientRect();
    const triggerRect = this.trigger!.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const spaceBelow = windowHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const dropdownHeight = dropdownRect.height;

    switch (position) {
      case 'bottom':
        this.renderer.setStyle(this.dropDown, 'top', `${triggerRect.bottom}px`);
        break;

      case 'top':
        this.renderer.setStyle(this.dropDown, 'bottom', `${windowHeight - triggerRect.top}px`);
        break;

      case 'left':
        this.renderer.setStyle(this.dropDown, 'right', `${windowWidth - triggerRect.right}px`);
        break;

      case 'right':
        this.renderer.setStyle(this.dropDown, 'left', `${triggerRect.left}px`);
        return;

      case 'auto':

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          this.renderer.setStyle(this.dropDown, 'bottom', `${windowHeight - triggerRect.top}px`);
        } else {
          this.renderer.setStyle(this.dropDown, 'top', `${triggerRect.bottom}px`);
        }

        const spaceRight = windowWidth - triggerRect.left;
        const spaceLeft = triggerRect.right;
        const dropdownWidth = dropdownRect.width;

        if (spaceRight < dropdownWidth && spaceLeft > spaceRight) {
          this.renderer.setStyle(this.dropDown, 'left', 'unset');
          this.renderer.setStyle(this.dropDown, 'right', `${windowWidth - triggerRect.right}px`);
        } else {
          this.renderer.setStyle(this.dropDown, 'right', 'unset');
          this.renderer.setStyle(this.dropDown, 'left', `${triggerRect.left}px`);
        }
      break;

      default:
        console.warn(`Unknown position: ${position}`);
    }
  }

  ngOnDestroy(): void {
    this.removeDocumentListener();
    this.isDestroyed = true;
  }
}
