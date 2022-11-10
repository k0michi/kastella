import { ZonedDateTime } from "@js-joda/core";
import { Formatter } from "./utils";

export default class TimeStamp {
  private _timeStamp: string;

  constructor(date: Date);
  constructor(zonedDateTime: ZonedDateTime);
  constructor(dateString: string);
  constructor(...args: any[]) {
    if (args.length == 1 && args[0] instanceof Date) {
      const date = args[0] as Date;
      this._timeStamp = date.toISOString();
    } else if (args.length == 1 && args[0] instanceof ZonedDateTime) {
      const zonedDateTime = args[0] as ZonedDateTime;
      // ZonedDateTime is stringified using ISO_OFFSET_DATE_TIME_WITH_NANO
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
}