import { LayoutService } from '@/shared/services/layout.service';
import { Toast, ToastService } from '@/shared/services/toast.service';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, OnDestroy, Renderer2, signal } from '@angular/core';

@Component({
  selector: 'dot-toast',
  imports: [
    NgTemplateOutlet
  ],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent implements OnDestroy {

  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);

  toast = input.required<Toast>();

  protected toastData = computed(() => this.toast());

  private isInitialized = signal(false);
  private timeoutId?: number;
  private clickListener?: () => void;

  private someModalOpen = computed(() => this.layoutService.someModalOpen());

  constructor() {
    effect(() => {

      const currentToast = this.toast();

      if (currentToast && !this.isInitialized()) {
        
        this.initializeToast(currentToast);

        this.isInitialized.set(true);
      }
    })
  }

  private initializeToast(toast: Toast) {

    const timer = this.el.nativeElement.querySelector('.timing-close');
    const toastEl = this.el.nativeElement.querySelector('.dot-alert');

    if (!toastEl) {
      return;
    }

    if (typeof toast.method == 'undefined') {
      this.clickListener = () => this.closeToast();

      this.renderer.listen(toastEl, 'click', () => {
        this.clickListener?.();
      });
    }

    if (this.someModalOpen()) {
      this.handleToastContainerPosition('bottom-center');
      this.handleToastFade(toast.position, toastEl);
    } else if (typeof toast.position != 'undefined') {
      this.handleToastContainerPosition(toast.position);
      this.handleToastFade(toast.position, toastEl);
    } else {
      this.handleToastContainerPosition('bottom-right');
      this.handleToastFade('bottom-right', toastEl);
    }

    if (typeof toast.type != 'undefined') {
      this.renderer.addClass(toastEl, toast.type!);
    }

    if (typeof toast.zIndex != 'undefined') {
      this.renderer.setStyle(toastEl, 'z-index', toast.zIndex);
    }

    if (typeof toast.duration != 'undefined') {
      this.renderer.setStyle(timer, 'animation-duration', `${toast.duration}ms`);
    } else {
      this.renderer.removeStyle(timer, 'animation');
    }

    this.renderer.setStyle(toastEl, 'z-index', toast.zIndex);
    

    setTimeout(() => {

      this.renderer.addClass(toastEl, 'show');
    }, 100);

    if (typeof toast.duration != 'undefined' && !toast.persistent) {
      this.timeoutId = window.setTimeout(() => {
        this.closeToast();
      }, toast.duration);
    }
  }

  private closeToast(): void {
    const toast = this.el.nativeElement.querySelector('.dot-alert');

    requestAnimationFrame(() => {
      this.renderer.removeClass(toast, 'show');
      this.renderer.addClass(toast, 'hide');
    });

    setTimeout(() => {

      try {
        this.renderer.removeChild(this.el.nativeElement.parentNode, this.el.nativeElement);
        this.toastService.clearToast(this.toast().id);
      } catch (error) {
        console.error(error);
        this.toastService.clearToast(this.toast().id);
      }
    }, 300);
  }

  private handleToastContainerPosition(position: Toast['position']): void {

    const toastContainer = this.el.nativeElement.parentNode as HTMLElement;

    this.resetToastContainerClasses(toastContainer);
    
    switch (position) {
      case 'top-left': this.renderer.addClass(toastContainer, 'top-left'); break;
      case 'top-right': this.renderer.addClass(toastContainer, 'top-right'); break;
      case 'top-center': this.renderer.addClass(toastContainer, 'top-center'); break;
      case 'bottom-left': this.renderer.addClass(toastContainer, 'bottom-left'); break;
      case 'bottom-right': this.renderer.addClass(toastContainer, 'bottom-right'); break;
      case 'bottom-center': this.renderer.addClass(toastContainer, 'bottom-center'); break;
    }
  }

  private resetToastContainerClasses(toastContainer: HTMLElement): void {
    this.renderer.removeClass(toastContainer, 'top-left');
    this.renderer.removeClass(toastContainer, 'top-right');
    this.renderer.removeClass(toastContainer, 'top-center');
    this.renderer.removeClass(toastContainer, 'bottom-left');
    this.renderer.removeClass(toastContainer, 'bottom-right');
    this.renderer.removeClass(toastContainer, 'bottom-center');
  }

  private handleToastFade(position: Toast['position'], toast: HTMLElement): void {

    if (position === 'top-left' || position === 'top-right' || position === 'top-center') {
      this.renderer.addClass(toast, 'top');
    } else {
      this.renderer.removeClass(toast, 'top');
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.clickListener) {
      this.clickListener = undefined;
    }
  }
}
