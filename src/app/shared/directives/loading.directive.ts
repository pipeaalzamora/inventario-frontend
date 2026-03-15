import { computed, Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { Loading } from '@shared/services/loading.service';

@Directive({
  selector: '[loading]',
})
export class LoadingDirective {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private loadService = inject(Loading);
  private loading = computed(() => this.loadService.isLoading());

  private originalNodes: Node[] = [];
  private spinnerElement?: HTMLElement;

  public isSoft = input(false); //animación de opacidad
  public isHidden = input(false); //sin animación, solo previene evento
  public isSpinner = input(false); //animación de spinner

  constructor() {
    effect(() => {
      if (!this.loading()) {
        return this.removeWrap()
      }
  
      this.createWrap();
    })
  }

  private createWrap(): void {
    let nativeElement = this.el.nativeElement as HTMLElement;

    const wrapper = this.renderer.createElement('div')
    this.renderer.addClass(wrapper, 'wrp')

    this.renderer.addClass(
      nativeElement, 
      this.getClassByInput()
    )

    if (this.isSoft()) {
      this.renderer.setStyle(nativeElement, 'transition', 'opacity 150ms ease-in-out')
      this.renderer.setStyle(nativeElement, 'opacity', '0.6')
    }

    if (this.isSpinner()) this.replaceContentWithSpinner(nativeElement);

    this.renderer.appendChild(nativeElement, wrapper)

    this.renderer.listen(wrapper, 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    })
  }

  private removeWrap(): void {
    const nativeElement = this.el.nativeElement as HTMLElement;

    const divSkeleton = nativeElement.querySelector('.wrp')

    if (this.isSoft()) this.renderer.setStyle(nativeElement, 'opacity', '1');

    if (this.isSpinner()) this.restoreOriginalContent(nativeElement);
    
    divSkeleton?.remove()
    this.renderer.removeClass(
      nativeElement, 
      this.getClassByInput()
    )
  }

  private replaceContentWithSpinner(nativeElement: HTMLElement): void {
    this.originalNodes = [];
    
    for (let i = 0; i < nativeElement.childNodes.length; i++) {
      this.originalNodes.push(nativeElement.childNodes[i]);
      this.renderer.removeChild(nativeElement, nativeElement.childNodes[i]);
    }

    this.spinnerElement = this.renderer.createElement('div');
    this.spinnerElement!.innerHTML = '<i class="fa-solid fa-spinner"></i>';
    this.renderer.addClass(this.spinnerElement, 'spinner');
    this.renderer.appendChild(nativeElement, this.spinnerElement);
  }

  private restoreOriginalContent(nativeElement: HTMLElement): void {
    if (this.spinnerElement) {
      this.renderer.removeChild(nativeElement, this.spinnerElement);
      this.spinnerElement = undefined;
    }

    if (this.originalNodes.length > 0) {
      this.originalNodes.forEach(node => {
        this.renderer.appendChild(nativeElement, node);
      });
      this.originalNodes = [];
    }
  }

  private getClassByInput(): string {

    if (this.isSoft()) return 'soft-skeleton'
    if (this.isHidden()) return 'hide-event'
    if (this.isSpinner()) return 'skeleton-spinner'
    return 'skeleton'
    
  }
}
