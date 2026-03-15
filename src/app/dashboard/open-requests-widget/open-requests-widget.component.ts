import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dot-open-requests-widget',
  standalone: true,
  imports: [],
  templateUrl: './open-requests-widget.component.html',
  styleUrl: './open-requests-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpenRequestsWidgetComponent {
  protected openRequests = 142;
}
