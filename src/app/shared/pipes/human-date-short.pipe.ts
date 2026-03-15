import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanDateShort'
})
export class HumanDateShortPipe implements PipeTransform {

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
    const timeElapsed = Math.abs(diff);

    const seconds = Math.floor(timeElapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    
    let timeString: string; 

    if (months > 0) {
        timeString = `${date.toLocaleDateString()}`;
    } else if (days > 0) {
        timeString = `${days}d`;
    } else if (hours > 0) {
        timeString = `${hours}h`;
    } else if (minutes > 0) {
        timeString = `${minutes}m`;
    } else if (seconds > 5) {
        timeString = `${seconds}s`;
    } else {
        timeString = 'ahora';
    }

    return timeString;
  }
}
