import { format } from 'date-fns';

export function dateToString(date: Date) {
  return format(date, 'yyyy/MM/dd HH:mm:ss');
}

export function isHTTPURL(string: string) {
  let url;

  try {
    url = new URL(string);
  } catch (e) {
    return false;
  }

  return url.protocol == 'http:' || url.protocol == 'https:';
}

export function round(value: number, digit: number) {
  return Math.round(value * 10 ** digit) / 10 ** digit;
}

export function findStringIgnoreCase(string: string | null | undefined, search: string) {
  if (string == undefined) {
    return false;
  }

  return string.toLowerCase().includes(search.toLowerCase());
}