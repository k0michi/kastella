import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as contentType from 'content-type';
import charset from 'charset';
import { FetchedFile, FetchedMeta } from '../common/fetch';
import '@js-joda/locale';
import { DateTimeFormatter, LocalDateTime, ZonedDateTime } from '@js-joda/core';

const USER_AGENT = 'WhatsApp/2';

export async function fetchMeta(url: string): Promise<FetchedMeta> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  const cType = contentType.parse(response.headers.get('content-type')!);
  const type = cType.type;
  const responseURL = response.url;
  const headerModified = response.headers.get('last-modified');
  let modified: string | undefined;

  if (modified == undefined && headerModified != undefined) {
    modified = rfc1123ToISO8601(headerModified);
  }

  if (type == 'text/html' || type == 'application/xhtml+xml') {
    const responseBuffer = await response.buffer();
    const encoding = charset(response.headers.get('content-type')!, responseBuffer) ?? 'utf8';
    const decoded = decode(responseBuffer, encoding);
    const dom = new JSDOM(decoded);
    const htmlMeta = extractHTMLMeta(dom.window.document);

    if (modified == undefined && htmlMeta.modified != undefined) {
      modified = htmlMeta.modified;
    }

    return {
      url: responseURL,
      type,
      title: htmlMeta.title,
      description: htmlMeta.description,
      imageURL: htmlMeta.imageURL,
      modified
    };
  } else if (type == 'application/xml' || type == 'text/xml') {
    const responseBuffer = await response.buffer();
    const encoding = charset(response.headers.get('content-type')!, responseBuffer) ?? 'utf8';
    const decoded = decode(responseBuffer, encoding);
    const dom = new JSDOM(decoded);

    // Treat as XHTML
    if (dom.window.document.documentElement.tagName.toLowerCase() == 'html') {
      const htmlMeta = extractHTMLMeta(dom.window.document);

      if (modified == undefined && htmlMeta.modified != undefined) {
        modified = htmlMeta.modified;
      }

      return {
        url: responseURL,
        type,
        title: htmlMeta.title,
        description: htmlMeta.description,
        imageURL: htmlMeta.imageURL,
        modified
      };
    } else {
      return {
        url: responseURL,
        type,
        modified
      };
    }
  } else {
    return {
      url: responseURL,
      type,
      modified
    };
  }
}

export async function fetchFile(url: string): Promise<FetchedFile> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  const cType = contentType.parse(response.headers.get('content-type')!);
  const type = cType.type;
  const responseURL = response.url;
  const headerModified = response.headers.get('last-modified');
  let modified: string | undefined;

  if (modified == undefined && headerModified != undefined) {
    modified = rfc1123ToISO8601(headerModified);
  }

  const buffer = await response.arrayBuffer();
  return { data: new Uint8Array(buffer), url: responseURL, type, modified };
}

function extractHTMLMeta(document: Document) {
  let title = longest(document.title, getMetaProperty(document, 'og:title'));
  title = title?.trim();

  let description = longest(getMetaName(document, 'description'), getMetaProperty(document, 'og:description'));
  description = description?.trim();

  let imageURL = getMetaProperty(document, 'og:image') ??
    getMetaProperty(document, 'og:image:secure_url') ??
    getMetaProperty(document, 'og:image:url');

  let modified = getMetaProperty(document, 'article:modified_time');

  return { title, description, imageURL, modified };
}

function getMetaProperty(document: Document, property: string) {
  const meta = document.querySelector(`meta[property="${property}"]`);
  return meta?.getAttribute('content') ?? undefined;
}

function getMetaName(document: Document, property: string) {
  const meta = document.querySelector(`meta[name="${property}"]`);
  return meta?.getAttribute('content') ?? undefined;
}

// Returns the longest string in a string array
function longest(...strings: (string | null | undefined)[]) {
  let longest: string | undefined;

  for (const string of strings) {
    if (string != undefined && (longest == undefined || string.length > longest.length)) {
      longest = string;
    }
  }

  return longest;
}

function rfc1123ToISO8601(dateTime: string) {
  // DateTimeFormatter.RFC_1123_DATE_TIME sometimes fails to parse
  const parsed = ZonedDateTime.parse((new Date(dateTime)).toISOString());
  return parsed.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
}

function decode(buffer: Buffer, encoding: string) {
  const textDecoder = new TextDecoder(encoding);
  return textDecoder.decode(buffer)
}