
# Smart Order

**Smart Order** front es una aplicación en desarrollo creada en Angular 20, diseñada para optimizar la gestión de inventario, usuarios, perfiles y notificaciones dentro de un ecosistema empresarial.


![Smart Order Logo](https://app.smartorders.inventario.dotsolutions.cl/assets/BoxLogo-Dar0SZ5Z.png)
## 🚀 Tecnologías principales

- **Framework:** Angular 20  
- **Features:** [ **Zoneless** (sin Zone.js), detección de cambios con **Signals**]
- **Librerías adicionales instaladas manualmente:**
  - [Angular Material](https://material.angular.io/) → Algunos componentes
  - [ngx-cookie-service](https://www.npmjs.com/package/ngx-cookie-service) → Manejo de cookies en el navegador.  

> ℹ️ Se intenta evitar instalar dependencias externas innecesarias para mantener el proyecto **ligero, seguro y estable**.
## ⚙️ Instalación y configuración

1. Clonar este repositorio:
   ```bash
   git clone https://github.com/tuusuario/smart-order.git
   cd smart-order

2. Instalar dependencias:
    ```bash
    npm install
3. Generar los entornos: 
    ```bash
    ng g environments
Esto creará los archivos necesarios para manejar variables de entorno (.env).

4. Ejecutar la aplicación en modo desarrollo:
    ```bash
    ng serve
## No tienes Angular 20?
Aprende a instalar el mejor framework para desarrollo web [Aquí](https://angular.dev/installation)
## Estructura recomendada
```bash
smart-order/
 ┣ public/
 ┣ src/
 ┃ ┣ app/
 ┃ ┃ ┣ [pages]       # Entidades relacionadas al negocio y funcionalidades principales
 ┃ ┃ ┣ shared/       # Componentes reutilizables, pipes, directivas, servicios, etc.
 ┃ ┃ ┣ app.routes.ts
 ┃ ┃ ┣ menu-items.ts # Archivo donde nuestro framework obtiene las rutas.
 ┃ ┣ environments/   # Configuración de entornos
 ┃ ┗ assets/         # Archivos generales de diseño
 ┣ angular.json
 ┣ package.json
 ┗ README.md