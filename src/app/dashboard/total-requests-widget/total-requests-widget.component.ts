import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dot-total-requests-widget',
  standalone: true,
  imports: [],
  templateUrl: './total-requests-widget.component.html',
  styleUrl: './total-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TotalRequestsWidgetComponent {
  protected totalRequests = 487;
}
