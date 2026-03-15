import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SupplierResContainerComponent } from '@self-contained-pages/outside-supplier/components/supplier-res-container.component';

@Component({
  selector: 'dot-supplier-token-expired',
  imports: [
    SupplierResContainerComponent
],
  template: `
    <dot-supplier-res-container>
      <div class="supplier-content">
        <div class="supplier-content-header">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <h1>Token expirado</h1>
          <div class="supplier-content-header-text">
            <span>El enlace que utilizaste ha expirado y ya no es válido para procesar tu solicitud.</span>
          </div>
        </div>
        <div class="supplier-content-info shadow">
          <h4>¿Qué significa esto?</h4>
          <p>Por motivos de seguridad, los enlaces de gestión tienen un tiempo de validez limitado. Este enlace ya no está disponible para gestionar la orden de compra.</p>
        </div>
        <div class="supplier-content-main shadow-inset">
          <div class="supplier-content-main-item">
            <i class="fa-solid fa-envelope shadow"></i>
            <div class="supplier-content-main-value">
              <span>
                Correo electrónico
              </span>
              <span>
                  user&#64;dotsolutions.cl
              </span>
            </div>
          </div>
          <div class="supplier-content-main-item">
            <i class="fa-solid fa-phone shadow"></i>
            <div class="supplier-content-main-value">
              <span>
                Teléfono
              </span>
              <span>
                +56 9 9999 9999
              </span>
            </div>
          </div>
        </div>
        <div class="supplier-content-footer">
          <span>Nuestro equipo te ayudará a procesar tu solicitud</span>
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
          color: var(--caution);
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

      .supplier-content-info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background-color: var(--caution-light);
        border-radius: var(--default-rounded);
        border: 1px solid var(--caution-border);

        h4, p { color: var(--caution-dark); }
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
          justify-content: flex-start;
          align-items: center;
          gap: 1rem;

          i {
            background-color: var(--background-1);
            padding: 1rem;
            border-radius: 12px;
            color: var(--text);
          }

          .supplier-content-main-value {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items:center;
            gap: .1rem;
            width: 100%;

            & > span:first-child {
              font-weight: 500;
              color: var(--text-light);
            }

            & > span:last-child {
              font-weight: 600;
              color: var(--text);
              font-size: 1.15rem;
              letter-spacing: 1px;
            }
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
export class TokenExpiredComponent {

}
