import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Loading {

  private loadingArray = signal<number[]>([]);

  public isLoading = computed<boolean>(() => {
    if (this.loadingArray().length > 0) {
      return true
    }

    return false
  })

  constructor() {}

  public On() {
    this.loadingArray.update((arr) => {
      return [...arr, 1]
    });
  }

  public Off() {
    this.loadingArray.update((arr) => {
      arr.pop();
      return [...arr];
    });
  }

  public clearAll() {
    this.loadingArray.set([]);
  }
}
