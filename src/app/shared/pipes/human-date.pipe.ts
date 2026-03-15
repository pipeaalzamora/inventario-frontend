import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanDate'
})
export class HumanDatePipe implements PipeTransform {

  transform(date : Date | string) : string {        
    if( typeof date == 'string' ){
        date = date.trim();

        if( date == '' )
            return date;

        let _d = new Date( date )
        

        if( _d instanceof Date && isFinite(+_d) ){
            date = _d;
        }else{
            return date;
        }
    }

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const isFuture = diff > 0;
    const timeElapsed = Math.abs(diff);

    const seconds = Math.floor(timeElapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);
    
    let timeString: string;

    if (years > 0) {
        timeString = `${years} ${years === 1 ? 'año' : 'años'}`;
    } else if (months > 0) {
        timeString = `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else if (days > 0) {
        timeString = `${days} ${days === 1 ? 'día' : 'días'}`;
    } else if (hours > 0) {
        timeString = `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (minutes > 0) {
        timeString = `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (seconds > 5) {
        timeString = `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
    } else {
        timeString = 'unos segundos';
    }

    return isFuture ? timeString : `hace ${timeString}`;
  }

}
