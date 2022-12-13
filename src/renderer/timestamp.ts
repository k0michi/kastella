import { Instant, ZonedDateTime, ZoneId, DateTimeFormatter, DateTimeFormatterBuilder, ChronoField, ResolverStyle } from "@js-joda/core";

// Immutable class to store a date string
export default class Timestamp {
  private _timeStamp: string;

  // Store date.toISOString()
  constructor(date: Date);
  // Store zonedDateTime.format(Formatter.ISO_OFFSET_DATE_TIME_WITH_NANO)
  constructor(zonedDateTime: ZonedDateTime);
  // Store dateString if it is a valid date string
  constructor(dateString: string);
  constructor(...args: any[]) {
    if (args.length == 1 && args[0] instanceof Date) {
      const date = args[0] as Date;
      this._timeStamp = date.toISOString();
    } else if (args.length == 1 && args[0] instanceof ZonedDateTime) {
      const zonedDateTime = args[0] as ZonedDateTime;
      this._timeStamp = zonedDateTime.format(Formatter.ISO_OFFSET_DATE_TIME_WITH_NANO);
    } else if (args.length == 1 && typeof args[0] == 'string') {
      const string = args[0];

      if (isNaN(Date.parse(string))) {
        throw new Error('args[0] is not a valid date string');
      }

      this._timeStamp = string;
    } else {
      throw new Error('ArgumentError ' + args);
    }
  }

  asString() {
    return this._timeStamp;
  }

  asZonedDateTime() {
    return ZonedDateTime.parse(this._timeStamp);
  }

  asDate() {
    return new Date(this._timeStamp);
  }

  toJSON() {
    return this._timeStamp;
  }

  // Construct from nanoseconds from the UNIX Epoch
  static fromNs(ns: bigint) {
    let t = ZonedDateTime.ofInstant(Instant.ofEpochSecond(Number(ns / 1_000_000_000n)), ZoneId.SYSTEM);
    t = t.plusNanos(Number(ns % 1_000_000_000n));
    return new Timestamp(t);
  }
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