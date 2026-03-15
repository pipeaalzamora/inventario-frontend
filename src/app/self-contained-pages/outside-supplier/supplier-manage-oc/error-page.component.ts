import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupplierResContainerComponent } from '@self-contained-pages/outside-supplier/components/supplier-res-container.component';

@Component({
  selector: 'dot-supplier-error-page',
  imports: [SupplierResContainerComponent, RouterLink],
  template: `
    <dot-supplier-res-container>
      <div class="error-page">
        <div class="error-icon">
          <i class="material-icons" style="font-size:96px;" [style.color]="code === 403 ? '#E53935' : '#FF7043'">
            {{ code === 403 ? 'lock' : 'warning_amber' }}
          </i>
        </div>
        <div class="error-code">{{ code }}</div>
        <div class="error-title">{{ title }}</div>
        <div class="error-desc">
          {{ description }}
        </div>

        <div class="actions">
          <a class="btn primary" routerLink="/">
            <i class="material-icons" aria-hidden="true" style="font-size:18px;">home</i>
            Ir al inicio
          </a>
        </div>
      </div>
    </dot-supplier-res-container>
  `,
  styles: `
    .error-page {
      min-height: 55vh;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .error-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.25rem;
    }



    .error-code {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1;
      color: var(--text);
    }

    .error-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text);
    }

    .error-desc {
      max-width: 28rem;
      color: var(--text-light);
      font-size: 0.98rem;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      padding: 0.6rem 1.25rem;
      border-radius: 12px;
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      color: var(--text);
      background: var(--background-1);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn.ghost {
      border-color: var(--border-very-light);
      background: var(--background-1);
    }

    .btn.primary {
      background: var(--text);
      color: var(--background-1);
      border-color: var(--text);
    }

    .btn:hover {
      opacity: 0.92;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPageComponent {
  private route = inject(ActivatedRoute);

  protected code: 403 | 404 = 404;

  constructor() {
    const code = Number(this.route.snapshot.queryParamMap.get('code'));
    this.code = code === 403 ? 403 : 404;
  }

  protected get title(): string {
    return this.code === 403 ? 'Acceso denegado' : 'Página no encontrada';
  }

  protected get description(): string {
    return this.code === 403
      ? 'No tienes los permisos necesarios para acceder a este recurso. Contacta al administrador si crees que esto es un error.'
      : 'La página que buscas no existe o el enlace no es válido. Verifica la URL o regresa al inicio.';
  }

}
