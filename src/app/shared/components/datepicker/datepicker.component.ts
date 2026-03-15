import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, Renderer2, untracked, viewChild } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInputEvent, MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';

@Component({
  selector: 'dot-datepicker',
  imports: [
    MatDatepickerModule,
  ],
  templateUrl: './datepicker.component.html',
  styleUrl: './datepicker.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()]
})
export class DatepickerComponent {
  private layoutService = inject(LayoutService);
  private renderer = inject(Renderer2);

  public label = input<string>('Fecha');
  public withRange = input<boolean>(false);
  public minDate = input<Date | null>(null);
  public maxDate = input<Date | null>(null);
  public selectedDate = model<Date | null>(null);
  public compact = input<boolean>(false);
  public dateChange = output<Date>();

  protected isMobile = computed(() => this.layoutService.isMobile());

  private labelText = viewChild<ElementRef<HTMLElement>>('labelText');
  protected singlePicker = viewChild<MatDatepicker<Date>>('picker');
  protected rangePicker = viewChild<MatDateRangePicker<Date>>('rangePicker');

  constructor() {
    effect(() => {
      const selectedDate = this.selectedDate();

      if (!selectedDate) {
        this.renderer.removeClass(this.labelText()?.nativeElement, 'floating');
        return;
      }

      if (!this.labelText()?.nativeElement.classList.contains('floating')) {
        this.renderer.addClass(this.labelText()?.nativeElement, 'floating');
      }
    })
  }

  protected onDateChange(event: MatDatepickerInputEvent<Date>) {
    if (!event.value) return;

    const selectedDate = new Date(event.value);

    const today = new Date();
    const isToday = selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();

    if (isToday) {
      selectedDate.setHours(today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds());
    }

    this.selectedDate.set(selectedDate);
    this.dateChange.emit(selectedDate);
  }

  protected openPicker(): void {
    if (this.withRange()) {
      this.rangePicker()?.open();
    } else {
      this.singlePicker()?.open();
    }
  }
}
