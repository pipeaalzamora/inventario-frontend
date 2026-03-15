import { ChangeDetectionStrategy, Component, ElementRef, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'dot-accordion',
  imports: [],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionComponent {
  protected isOpen = signal<boolean>(true);

  public opened = output<void>();
  public closed = output<void>();

  private accordionContentEl = viewChild<ElementRef<HTMLDivElement>>('accordionContent');

  public toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  public open(): void {
    if (this.isOpen()) return;

    this.isOpen.set(true);

    requestAnimationFrame(() => this.animateOpen());
  }

  public close(): void {
    if (!this.isOpen()) return;

    this.animateClose();
  }

  private animateOpen(): void {
    const containerEl = this.accordionContentEl()?.nativeElement;

    if (!containerEl) return;

    const animation = containerEl.animate(
      [
        { height: '0%', opacity: 0 },
        { height: '100%', opacity: 1 }
      ],
      {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )

    animation.finished.then(() => {
      this.opened.emit();
    }).catch(() => {
      this.opened.emit();
    })
  }

  private animateClose(): void {
    const containerEl = this.accordionContentEl()?.nativeElement;

    if (!containerEl) return;

    const currentHeight = containerEl.scrollHeight;

    const animation = containerEl.animate(
      [
        { height: `${currentHeight}px`, opacity: 1 },
        { height: '0px', opacity: 0 }
      ],
      {
        duration: 220,
        easing: 'ease-out',
        fill: 'forwards',
      }
    )

    animation.finished.then(() => {
      this.isOpen.set(false);
      this.closed.emit();
    }).catch(() => {
      this.isOpen.set(false);
      this.closed.emit();
    });
  }
}
