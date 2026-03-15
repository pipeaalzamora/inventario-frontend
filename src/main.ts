import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import appData from 'public/config';

document.title = appData.proyectName;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
