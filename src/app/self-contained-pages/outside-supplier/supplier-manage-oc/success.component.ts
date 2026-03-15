import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SupplierResContainerComponent } from '@self-contained-pages/outside-supplier/components/supplier-res-container.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'dot-supplier-success',
  imports: [
    SupplierResContainerComponent,
    DatePipe
  ],
  template: `
    <dot-supplier-res-container>
      <div class="supplier-content">
        <div class="supplier-content-header">
          <i class="fa-solid fa-circle-check"></i>
          <h1>Solicitud Completada</h1>
          <div class="supplier-content-header-text">
            <span>Tu respuesta ha sido registrada exitosamente.</span>
            <span>Gracias por tu tiempo</span>
          </div>
        </div>
        <div class="supplier-content-main shadow-inset">
          <div class="supplier-content-main-item">
            <div class="supplier-content-main-label">
              Estado
            </div>
            <div class="supplier-content-main-value">
              <div class="dot-badge success">
                Aceptado
              </div>
            </div>
          </div>
          <div class="supplier-content-main-item">
            <div class="supplier-content-main-label">
              Fecha de procesamiento
            </div>
            <time class="supplier-content-main-value" datetime="DD/MM/YYYY">
              {{ date | date: 'dd/MM/yyyy' }}
            </time>

            <time class="supplier-content-main-value" datetime="HH:mm">
              {{ date | date: 'HH:mm' }}
            </time>
          </div>
        </div>
        <div class="supplier-content-footer">
          <span>Recibirás una confirmación por correo electrónico</span>
        </div>
      </div>
    </dot-supplier-res-container>
  `,
  styles: `
    .supplier-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2rem;

      .supplier-content-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        text-align: center;

        i {
          font-size: 5rem;
          color: var(--success);
        }

        .supplier-content-header-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: .2rem;

          span { color: var(--text-light) };
        }
      }

      .supplier-content-main {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background-color: var(--background-4);
        padding: 1rem;
        border-radius: var(--default-rounded);

        .supplier-content-main-item {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;

          .supplier-content-main-label {
            color: var(--text-light);
            font-weight: 600;
          }

          .supplier-content-main-value {
            font-weight: 500;
          }
        }
      }

      .supplier-content-footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        text-align: center;

        span { color: var(--text-light); }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuccessComponent {
  protected date = new Date();
}
