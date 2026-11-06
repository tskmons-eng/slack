// ローカルで GAS の合成データのテスト（testResolveVinGroups・testRiceLogic）を動かすための土台。
// 実際の Slack・スプレッドシート・外部 API には一切つながない。
// 使い方: node local-tests/run-logic-tests.js
// clasp push の対象外（.claspignore で Code.gs・Rice.gs・appsscript.json だけを送る）。
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var root = path.resolve(__dirname, '..');

function toSignedBytes(buffer) {
  return Array.prototype.map.call(buffer, function(value) {
    return value > 127 ? value - 256 : value;
  });
}

function toBuffer(value) {
  if (Array.isArray(value)) {
    return Buffer.from(value.map(function(byte) { return byte < 0 ? byte + 256 : byte; }));
  }
  return Buffer.from(String(value), 'utf8');
}

function formatDate(date, timeZone, pattern) {
  // テストで使う書式だけを扱う簡易版（Asia/Tokyo 固定、+09:00）。
  var shifted = new Date(date.getTime() + 9 * 3600 * 1000);
  var pad = function(number, width) { return String(number).padStart(width || 2, '0'); };
  var map = {
    yyyy: String(shifted.getUTCFullYear()),
    MM: pad(shifted.getUTCMonth() + 1),
    dd: pad(shifted.getUTCDate()),
    HH: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
    ss: pad(shifted.getUTCSeconds()),
    XXX: '+09:00'
  };
  return String(pattern)
    .replace(/'T'/g, 'T')
    .replace(/yyyy|MM|dd|HH|mm|ss|XXX/g, function(token) { return map[token]; });
}

function makeProperties() {
  var store = {};
  return {
    getProperty: function(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setProperty: function(key, value) { store[key] = String(value); return this; },
    deleteProperty: function(key) { delete store[key]; return this; },
    getProperties: function() { return Object.assign({}, store); },
    getKeys: function() { return Object.keys(store); }
  };
}

var logs = [];
var scriptProperties = makeProperties();
var context = {
  console: console,
  Logger: { log: function(message) { logs.push(String(message)); } },
  Session: { getScriptTimeZone: function() { return 'Asia/Tokyo'; } },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeHmacSha256Signature: function(value, key) {
      return toSignedBytes(crypto.createHmac('sha256', toBuffer(key)).update(toBuffer(value)).digest());
    },
    computeDigest: function(algorithm, value) {
      return toSignedBytes(crypto.createHash('sha256').update(toBuffer(value)).digest());
    },
    getUuid: function() { return crypto.randomUUID(); },
    formatDate: formatDate,
    newBlob: function(value) { return { getBytes: function() { return toSignedBytes(toBuffer(value)); } }; },
    sleep: function() {}
  },
  PropertiesService: { getScriptProperties: function() { return scriptProperties; } },
  CacheService: {
    getScriptCache: function() {
      var cache = {};
      return {
        get: function(key) { return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null; },
        put: function(key, value) { cache[key] = String(value); },
        remove: function(key) { delete cache[key]; }
      };
    }
  },
  LockService: {
    getScriptLock: function() {
      return { waitLock: function() {}, tryLock: function() { return true; }, releaseLock: function() {} };
    },
    getUserLock: function() {
      return { waitLock: function() {}, tryLock: function() { return true; }, releaseLock: function() {} };
    }
  },
  UrlFetchApp: {
    fetch: function() { throw new Error('テスト中は外部へ送らない（UrlFetchApp.fetch が呼ばれた）'); }
  },
  // 入金期日のカレンダー（Rice.gs）のテストは偽物のカレンダーを渡す。本物の CalendarApp が呼ばれたら失敗にする
  CalendarApp: {
    getDefaultCalendar: function() { throw new Error('テスト中は本物のカレンダーに触らない（CalendarApp.getDefaultCalendar が呼ばれた）'); },
    getCalendarById: function() { throw new Error('テスト中は本物のカレンダーに触らない（CalendarApp.getCalendarById が呼ばれた）'); }
  }
};
vm.createContext(context);

['Code.gs', 'Rice.gs'].forEach(function(fileName) {
  var filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: fileName });
});

var suites = ['testResolveVinGroups', 'testRiceLogic'];
var failed = false;
suites.forEach(function(name) {
  if (typeof context[name] !== 'function') {
    console.log('[skip] ' + name + '（関数がない）');
    return;
  }
  try {
    var result = context[name]();
    console.log('[ok] ' + name + ': ' + JSON.stringify(result).slice(0, 400));
  } catch (error) {
    failed = true;
    console.log('[NG] ' + name + ': ' + (error && error.stack ? error.stack : error));
  }
});
process.exitCode = failed ? 1 : 0;
