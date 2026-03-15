import { effect, inject, Injectable, signal } from '@angular/core';

import { MenuItem, menuItems } from '@/menu-items';
import { Router } from '@angular/router';

type HistoryItem = {
  routeName: string;
  params?: Record<string, string>;
  queryParams?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class NavigateService {
  private router = inject(Router);
  private isNavigating = false;

  private pHistory = signal<HistoryItem[]>([]);
  private pCurrent = signal<HistoryItem | null>(null);

  readonly history = this.pHistory.asReadonly();
  readonly current = this.pCurrent.asReadonly();

  constructor() {

    effect(()=>{
      console.log(this.pHistory());
    })
    
    effect(() => {
      const current = this.pCurrent();
      if (!current) {
        return;
      }

      // Prevenir navegaciones concurrentes
      if (this.isNavigating) {
        return;
      }

      const url = this.#resolveUrl(current.routeName, current.params);

      this.isNavigating = true;
      const navigation = current.queryParams
        ? this.router.navigate([url], { queryParams: current.queryParams })
        : this.router.navigate([url]);
      
      navigation.finally(() => {
        this.isNavigating = false;
      });
    })
  }

  public push(
    routeName: string, 
    pathParams?: Record<string, string>, 
    queryParams?: Record<string, any>
  ) {
    const item = this.#createRouteItem(routeName, pathParams, queryParams);

    const current = this.pCurrent();
    if ( current && this.#isSame(current, item) ) {
      return;
    }

    this.pHistory.update(history => [...history, item]);
    this.pCurrent.set( item );

  }

  public pop(fallback: string = '/', pathParams?: Record<string, string>, queryParams?: Record<string, any>) {
    if (this.pHistory().length <= 1) {
      const url = this.resolveFullUrl(fallback, pathParams, queryParams);
      this.router.navigate([url]);
      return;
    }

    const history = this.pHistory();
    const penultItem = structuredClone(history[history.length - 2]);

    this.pHistory.update(h => {
      h.pop();
      return [...h];
    });

    this.pCurrent.set( penultItem );
  }

  public replace(
    routeName: string, 
    pathParams?: Record<string, string>, 
    queryParams?: Record<string, any>
  ) {
    let currentIndex = this.pHistory().length - 1;
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const item = this.#createRouteItem(routeName, pathParams, queryParams);
    const current = this.pCurrent();
    if ( current && this.#isSame(current, item) ) {
      return;
    }

    this.pHistory.update(history => {
      history[currentIndex] = item;
      return [...history];
    });

    this.pCurrent.set( item );
  }

  public resolveFullUrl(routeName : string, pathParams?: Record<string, string>, queryParams?: Record<string, any>) : string{       
    let url = this.#resolveUrl(routeName, pathParams);

    if (queryParams) {
      const queryString = new URLSearchParams(queryParams).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  #isSame(a: HistoryItem, b: HistoryItem) : boolean {
    if ( a.routeName != b.routeName ) {
      return false;
    }

    if ( JSON.stringify(a.params) != JSON.stringify(b.params) ) {
      return false;
    }

    if ( JSON.stringify(a.queryParams) != JSON.stringify(b.queryParams) ) {
      return false;
    }

    return true;
  }

  #resolveUrl(routeName : string, pathParams?: Record<string, string>) : string{       
    let url = this.#findRoute(routeName, menuItems);   
    if (!url) {
      return '';
    }

    url = this.#resolvePath(url, pathParams);

    return url;
  }

  #resolvePath(url: string, pathParams?: object | any): string {
    if (!pathParams) {
      return url;
    }

    Object.keys(pathParams).forEach(key => {
      const value = pathParams[key];
      url = url.replace(`:${key}`, value);
    });

    return url;
  }

  #findRoute(name: string = '', list: MenuItem[], currentPath: string = ''): string | null {
    if ( list.length == 0 )
      return null;

    for(let element of list) {
      const itemPath = `${currentPath}/${element.url}`.replace(/\/+/g, '/');

      if(element.name == name) {
        return itemPath;
      }

      if(element.menuList && element.menuList.length > 0) {
        const linkFinded = this.#findRoute(name, element.menuList, itemPath);

        if(linkFinded) {
          return linkFinded
        }
      }
    }

    return null;
  }

  #createRouteItem(
    routeName: string, 
    pathParams?: Record<string, string>, 
    queryParams?: Record<string, any>
  ) : HistoryItem {
    return {
      routeName: routeName.trim(),
      params: pathParams,
      queryParams: queryParams
    };
  }
}

