import { Pipe, PipeTransform } from '@angular/core';
import { formatTelephone } from '../../core/utils/telephone';

/** +221771234567 → « +221 77 123 45 67 ». */
@Pipe({ name: 'telephone' })
export class TelephonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatTelephone(value);
  }
}
