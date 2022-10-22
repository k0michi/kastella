import { format } from 'date-fns';

export function dateToString(date: Date) {
  return format(date, 'yyyy/MM/dd HH:mm:ss');
}