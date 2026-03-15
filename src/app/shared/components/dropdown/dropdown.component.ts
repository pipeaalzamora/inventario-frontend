import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, Renderer2, signal, TemplateRef, viewChild } from '@angular/core';

type Position = 'bottom' | 'top' | 'left' | 'right' | 'auto';

@Component({
  selector: 'dot-dropdown',
  imports: [
    NgTemplateOutlet,
  ],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownComponent {
  private renderer = inject(Renderer2);

  public dropdownTrigger = input<TemplateRef<any> | null>(null);
  public position = input<Position>('auto');
  public fullWidth = input<boolean>(false);
  public horizontal = input<boolean>(false);

  protected isPanelOpen = signal<boolean>(false);

  private dropdownItemsContainer = viewChild<ElementRef<HTMLElement>>('dropdownItemsContainer');
  private dropdownTriggerContainer = viewChild<ElementRef<HTMLElement>>('dropdownTriggerContainer');
  private dropdownContainer = viewChild<ElementRef<HTMLElement>>('dropdownContainer');

  constructor() {}

  @HostListener('document:click', ['$event']) 
  onClick(event: MouseEvent) {
    if (!this.isPanelOpen()) return;

    event.stopPropagation();

    const clickedInside = this.dropdownContainer()?.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.toggleDropdown(false);
    }
  }

  protected toggleDropdown(show: boolean): void {
    if (show) {
      this.showPanel();
      return;
    }

    this.hidePanel();
  }

  private showPanel(): void {
    this.isPanelOpen.set(true);

    requestAnimationFrame(() => {
      this.setPanelPosition(this.position());
  
      this.dropdownItemsContainer()?.nativeElement.animate([
        { opacity: 0, transform: 'translateY(-1rem) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], {
        duration: 180,
        easing: 'ease-out',
      });
    })

  }

  private hidePanel(): void {
    const animation = this.dropdownItemsContainer()?.nativeElement.animate([
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(-1rem) scale(.98)' }
    ], {
      duration: 180,
      easing: 'ease-in',
    });

    animation?.finished
      .then(() => this.isPanelOpen.set(false))
      .catch(() => this.isPanelOpen.set(false));
  }

  protected onPanelClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
  
    if (target.closest('button')) {
      this.toggleDropdown(false);
    }
  }

  private resetPosition() {
    ['top', 'bottom', 'left', 'right'].forEach(className => {
      this.renderer.setStyle(this.dropdownItemsContainer()?.nativeElement, className, 'unset');
    });
  }

  private setPanelPosition(position: Position): void {

    if (!this.dropdownItemsContainer() || !this.dropdownTriggerContainer()) return;

    this.resetPosition();

    const dropdown = this.dropdownItemsContainer()!.nativeElement as HTMLElement;
    const trigger = this.dropdownTriggerContainer()!.nativeElement as HTMLElement;

    const dropdownRect = dropdown.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const spaceBelow = windowHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const dropdownHeight = dropdownRect.height;

    switch (position) {
      case 'bottom':
        this.renderer.setStyle(dropdown, 'top', `${triggerRect.bottom}px`);
        break;

      case 'top':
        this.renderer.setStyle(dropdown, 'bottom', `${windowHeight - triggerRect.top}px`);
        break;

      case 'left':
        this.renderer.setStyle(dropdown, 'right', `${windowWidth - triggerRect.right}px`);
        break;

      case 'right':
        this.renderer.setStyle(dropdown, 'left', `${triggerRect.left}px`);
        return;

      case 'auto':

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          this.renderer.setStyle(dropdown, 'bottom', `${windowHeight - triggerRect.top}px`);
        } else {
          this.renderer.setStyle(dropdown, 'top', `${triggerRect.bottom}px`);
        }

        const spaceRight = windowWidth - triggerRect.left;
        const spaceLeft = triggerRect.right;
        const dropdownWidth = dropdownRect.width;

        if (spaceRight < dropdownWidth && spaceLeft > spaceRight) {
          this.renderer.setStyle(dropdown, 'left', 'unset');
          this.renderer.setStyle(dropdown, 'right', `${windowWidth - triggerRect.right}px`);
        } else {
          this.renderer.setStyle(dropdown, 'right', 'unset');
          this.renderer.setStyle(dropdown, 'left', `${triggerRect.left}px`);
        }
      break;

      default:
        console.warn(`Unknown position: ${position}`);
    }
  }

}
