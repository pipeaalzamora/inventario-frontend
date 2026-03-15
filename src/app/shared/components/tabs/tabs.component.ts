import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal, TemplateRef } from '@angular/core';
import { MatTabsModule, MatTabHeaderPosition } from '@angular/material/tabs';

type Tab = {
  label?: TemplateRef<any>;
  content: TemplateRef<any>;
}

@Component({
  selector: 'dot-tabs',
  imports: [
    MatTabsModule,
    NgTemplateOutlet,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sticky-tab-header]': 'stickyTabHeader()',
  }
})
export class TabsComponent {

  public templates = input.required<Record<string, Tab>>();
  public align = input<'start' | 'center' | 'end'>('center');
  public stretchLabels = input<boolean>(false);
  public headerPosition = input<MatTabHeaderPosition>('above');
  public stickyTabHeader = input<boolean>(false);

  public tabChanged = output<Array<number>>();

  protected labels = computed(() => Object.keys(this.templates()));

  protected indexTabPrevented: number | null = null

  protected selectedIndexTab = signal<number>(0);

  constructor() {}

  protected evaluateActualIndex(index: number) {
    return this.selectedIndexTab() === index ? 'selected' : '';
  }

  protected switchTab(index: number) {
    this.tabChanged.emit([this.selectedIndexTab(),index]);
    
    this.selectedIndexTab.set(index);
  }
}
