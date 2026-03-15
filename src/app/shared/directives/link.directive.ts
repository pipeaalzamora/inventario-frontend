import { Directive, ElementRef, HostListener, inject, input, Renderer2 } from '@angular/core';
import { NavigateService } from '@/shared/services/navigate.service';

@Directive({
  selector: '[link]',
  standalone: true
})
export class LinkDirective {

  private navigate = inject(NavigateService);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  
  link = input.required<string>();
  params = input<Record<string, string>>({});
  queryParams = input<Record<string, unknown>>();
  replace = input<boolean>(false);
 //clear = input<boolean>(false);

  constructor(){}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (typeof this.link() != 'string' ) return;
    event.preventDefault();
    this.handleNavigation(event);
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    if (typeof this.link() != 'string' ) return;
    this.setElementAttributes();
  }

  private setElementAttributes() {
    const element = this.el.nativeElement;
    if (element.tagName.toLowerCase() == 'a') {
      this.renderer.setAttribute(element, 'href', this.navigate.resolveFullUrl(this.link(), this.params()));
    } else {
      this.renderer.setAttribute(element, 'role', 'link');
      this.renderer.setAttribute(element, 'tabindex', '0');
    }
  }

  private handleNavigation(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.button === 1) {
      window.open(this.fullPath, '_blank');
    } else {
      if (this.replace()) {
        // Navegación temporal sin modificar historial
        this.navigate.replace(this.link(), this.params(), this.queryParams());
      } else {
        // Navegación normal que agrega al historial
        this.navigate.push(this.link(), this.params(), this.queryParams());
      }
    }
  }

  private get fullPath(): string {
    return this.navigate.resolveFullUrl(this.link(), this.params(), this.queryParams());
  }
}