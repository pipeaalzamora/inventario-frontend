import { ChangeDetectionStrategy, Component, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'dot-copy-clipboard-button',
  imports: [
    MatTooltipModule
  ],
  templateUrl: './copy-clipboard-button.component.html',
  styleUrl: './copy-clipboard-button.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CopyClipboardButtonComponent {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  public value = input<string | undefined>('');

  protected copyToClipboard(): void {
    if (typeof this.value() === 'undefined') return;

    navigator.clipboard.writeText(this.value()!);

    const button = this.el.nativeElement.querySelector('button.dot-btn');
    this.renderer.addClass(button, 'success');

    setTimeout(() => {
      this.renderer.removeClass(button, 'success');
    }, 500);
  }
}
