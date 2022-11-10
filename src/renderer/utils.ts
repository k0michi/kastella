import { format } from 'date-fns';
import { ZoneId, ZonedDateTime, Instant, DateTimeFormatter, DateTimeFormatterBuilder, ChronoField, ResolverStyle } from '@js-joda/core';

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

// https://github.com/js-joda/js-joda/blob/main/packages/core/src/format/DateTimeFormatter.js
export namespace Formatter {
  export const ISO_LOCAL_TIME_WITH_NANO = new DateTimeFormatterBuilder()
    .appendValue(ChronoField.HOUR_OF_DAY, 2)
    .appendLiteral(':')
    .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
    .optionalStart()
    .appendLiteral(':')
    .appendValue(ChronoField.SECOND_OF_MINUTE, 2)
    .optionalStart()
    .appendFraction(ChronoField.NANO_OF_SECOND, 9, 9, true)
    .toFormatter(ResolverStyle.STRICT);

    export const ISO_LOCAL_DATE_TIME_WITH_NANO = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(DateTimeFormatter.ISO_LOCAL_DATE)
    .appendLiteral('T')
    .append(ISO_LOCAL_TIME_WITH_NANO)
    .toFormatter(ResolverStyle.STRICT);

    // This format emits sub-seconds with 9 digits
    export const ISO_OFFSET_DATE_TIME_WITH_NANO = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(ISO_LOCAL_DATE_TIME_WITH_NANO)
    .appendOffsetId()
    .toFormatter(ResolverStyle.STRICT);
}