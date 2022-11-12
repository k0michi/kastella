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

export function round(value: number, digit: number) {
  return Math.round(value * 10 ** digit) / 10 ** digit;
}

export function findStringIgnoreCase(string: string | null | undefined, search: string) {
  if (string == undefined) {
    return false;
  }

  return string.toLowerCase().includes(search.toLowerCase());
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

  export const ISO_LOCAL_TIME_WITH_MICRO = new DateTimeFormatterBuilder()
    .appendValue(ChronoField.HOUR_OF_DAY, 2)
    .appendLiteral(':')
    .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
    .optionalStart()
    .appendLiteral(':')
    .appendValue(ChronoField.SECOND_OF_MINUTE, 2)
    .optionalStart()
    .appendFraction(ChronoField.NANO_OF_SECOND, 6, 6, true)
    .toFormatter(ResolverStyle.STRICT);

  export const ISO_LOCAL_DATE_TIME_WITH_MICRO = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(DateTimeFormatter.ISO_LOCAL_DATE)
    .appendLiteral('T')
    .append(ISO_LOCAL_TIME_WITH_MICRO)
    .toFormatter(ResolverStyle.STRICT);

  export const ISO_OFFSET_DATE_TIME_WITH_MICRO = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(ISO_LOCAL_DATE_TIME_WITH_MICRO)
    .appendOffsetId()
    .toFormatter(ResolverStyle.STRICT);

  export const ISO_LOCAL_TIME_WITH_MILLI = new DateTimeFormatterBuilder()
    .appendValue(ChronoField.HOUR_OF_DAY, 2)
    .appendLiteral(':')
    .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
    .optionalStart()
    .appendLiteral(':')
    .appendValue(ChronoField.SECOND_OF_MINUTE, 2)
    .optionalStart()
    .appendFraction(ChronoField.NANO_OF_SECOND, 3, 3, true)
    .toFormatter(ResolverStyle.STRICT);

  export const ISO_LOCAL_DATE_TIME_WITH_MILLI = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(DateTimeFormatter.ISO_LOCAL_DATE)
    .appendLiteral('T')
    .append(ISO_LOCAL_TIME_WITH_MILLI)
    .toFormatter(ResolverStyle.STRICT);

  export const ISO_OFFSET_DATE_TIME_WITH_MILLI = new DateTimeFormatterBuilder()
    .parseCaseInsensitive()
    .append(ISO_LOCAL_DATE_TIME_WITH_MILLI)
    .appendOffsetId()
    .toFormatter(ResolverStyle.STRICT);
}