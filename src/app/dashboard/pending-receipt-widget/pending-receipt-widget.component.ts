import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dot-pending-receipt-widget',
  standalone: true,
  imports: [],
  templateUrl: './pending-receipt-widget.component.html',
  styleUrl: './pending-receipt-widget.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PendingReceiptWidgetComponent {
  protected pendingReceipt = 58;
}
