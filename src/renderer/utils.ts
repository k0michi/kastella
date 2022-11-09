import { format } from 'date-fns';
import { ZoneId, ZonedDateTime, Instant, DateTimeFormatter } from '@js-joda/core';

export function dateToString(date: Date) {
  return format(date, 'yyyy/MM/dd HH:mm:ss');
}

export function nsToZonedDateTime(ns: bigint) {
  return ZonedDateTime.ofInstant(Instant.ofEpochMicro(Number(ns) / 1000), ZoneId.SYSTEM);
}

export async function now() {
  const nowNs = await bridge.now();
  return nsToZonedDateTime(nowNs);
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