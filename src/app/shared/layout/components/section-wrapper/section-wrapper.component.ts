import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';
import { OnScrollToolbarComponent } from '@shared/layout/components/on-scroll-toolbar/on-scroll-toolbar.component';
import { NgStyle, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'dot-section-wrapper',
  imports: [
    OnScrollToolbarComponent,
    NgTemplateOutlet,
    NgStyle
  ],
  templateUrl: './section-wrapper.component.html',
  styleUrl: './section-wrapper.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionWrapperComponent {
  public withStickyToolbar = input<boolean>(false);
  public headerRef = input<TemplateRef<any> | null>(null);
  public paddingInline = input<number>(0);
  public paddingBlock = input<number>(0);
  public paddingBottom = input<number>(0);

  public columns = input<string>('1fr 1fr');
}
