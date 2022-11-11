import { Instant, ZonedDateTime, ZoneId } from "@js-joda/core";
import { Formatter } from "./utils";

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
    return new Timestamp(ZonedDateTime.ofInstant(Instant.ofEpochMicro(Number(ns) / 1000), ZoneId.SYSTEM));
  }
}