import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, Renderer2, signal } from '@angular/core';

export type MobileCreateOption = {
  label: string;
  icon?: string;
  action: () => void;
};

@Component({
  selector: 'dot-mobile-create',
  imports: [],
  templateUrl: './mobile-create.component.html',
  styleUrl: './mobile-create.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileCreateComponent {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  public options = input<MobileCreateOption[]>()

  protected isActive = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    const actionContainer = this.el.nativeElement.querySelector('.floating-action-container') as HTMLElement;
    const buttonToggler = this.el.nativeElement.querySelector('.dot-btn.create') as HTMLButtonElement;

    if (!actionContainer?.contains(event.target as Node) && !buttonToggler?.contains(event.target as Node)) {
      this.toggleActionMenu(false);
    }
  }

  constructor() {}

  protected toggleActionMenu(show: boolean): void {
    this.isActive.set(show);
    const actionContainer = this.el.nativeElement.querySelector('.floating-action-container') as HTMLElement;
    const buttonToggler = this.el.nativeElement.querySelector('.dot-btn.create') as HTMLButtonElement;
    const backdrop = this.el.nativeElement.querySelector('.floating-action-backdrop') as HTMLElement;

    if (!actionContainer || !backdrop || !buttonToggler) return;

    if (!show) {
      this.renderer.removeClass(actionContainer, 'active');
      this.renderer.removeClass(buttonToggler, 'active');
      this.renderer.removeClass(backdrop, 'show');
      return;
    }

    this.renderer.addClass(actionContainer, 'active');
    this.renderer.addClass(buttonToggler, 'active');
    this.renderer.addClass(backdrop, 'show');
  }
}
