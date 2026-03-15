import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bytesFormat'
})
export class BytesFormatPipe implements PipeTransform {

  transform(size: number): string {
    if (size < 1024) return `${size} B`;
    else if (size >= 1024 && size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
    else if (size >= 1048576) return `${(size / 1048576).toFixed(1)} MB`;
    return '';
  }
}
