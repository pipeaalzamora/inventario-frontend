import { CanDeactivateFn } from '@angular/router';

export interface CanComponentDeactivate {
  canDeactivate: (nextRoute: string) => boolean | Promise<boolean>;
}

export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (component, _, __, nextRoute) => {
  
  return component.canDeactivate ? component.canDeactivate(nextRoute.url) : true;
};