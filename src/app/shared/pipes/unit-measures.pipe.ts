import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'unitMeasures'
})
export class UnitMeasuresPipe implements PipeTransform {

  transform(value: string): string {

    const measures: Record<string, string> = {
      'unit': 'Unidad',
      'box': 'Caja',
      'pack': 'Paquete',
      'm': 'Metro',
      'cm': 'CM',
      'mm': 'MM',
      'kg': 'KG',
      'g': 'G',
      'l': 'LT',
      'ml': 'ML',
      'u': 'Unidad',
      'caja': 'Caja',
      'paquete': 'Paquete',
    }

    return measures[value] || value;
  }

}
