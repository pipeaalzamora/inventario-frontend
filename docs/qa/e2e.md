# Pruebas E2E

## Requisitos

- Backend corriendo.
- Frontend corriendo.
- Usuario de prueba con permisos completos o permisos suficientes.
- Chromium de Playwright instalado.

## Instalacion

```bash
npm ci
npx playwright install chromium
```

## Ejecucion local

```bash
E2E_APP_URL=http://127.0.0.1:4200 \
E2E_API_URL=http://localhost:18080/api/v1 \
E2E_USER_EMAIL=admin@dotsolutions.cl \
E2E_USER_PASSWORD='Admin123!' \
npm run e2e
```

## Que valida

- Health del backend.
- Login API.
- Listado de empresas autenticado.
- Plantillas de branding.
- Login real desde navegador.
- Entrada al shell autenticado de la aplicacion.

## Reporte

Playwright deja reporte HTML en `playwright-report/` cuando falla o al terminar segun configuracion.
