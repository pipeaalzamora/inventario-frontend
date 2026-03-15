import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type PercentageBarMode = 'linear' | 'circle';

@Component({
  selector: 'dot-percentage-bar',
  imports: [
    NgStyle,
  ],
  templateUrl: './percentage-bar.component.html',
  styleUrl: './percentage-bar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PercentageBarComponent {
  public mode = input.required<PercentageBarMode>();
  public maxValue = input<number>(100);
  public currentValue = input<number>(0);
  public showValueLabel = input<boolean>(true);
  public disabled = input<boolean>(false);

  protected linearCalculatedWidthPercentage = computed(() => {
    return Math.floor((this.currentValue() / this.maxValue()) * 100);
  });

  protected circleCalculatedWidthPercentage = computed(() => {
    return Math.floor(252 - (252 * this.currentValue()) / this.maxValue());
  });
}
