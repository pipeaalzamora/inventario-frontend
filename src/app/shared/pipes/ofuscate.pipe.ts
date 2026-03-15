import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ofuscate'
})
export class OfuscatePipe implements PipeTransform {

  transform(value: string ) {
    let chars = 3
    let res = value.replace(
      /[a-z0-9\-_.]+@/ig, 
      (c) => c.substring(0, chars) + c.split('').slice(chars, -1).map(v => '*').join('') + '@')
    
    return res;
  }

}
