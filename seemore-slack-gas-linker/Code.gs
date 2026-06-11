var APP_NAME = 'SEEMORE Slack車案件リンク管理';
var SPREADSHEET_NAME = 'SEEMORE_Slack車案件リンク管理';
var SPREADSHEET_ID_PROPERTY = 'SEEMORE_SLACK_LINKS_SPREADSHEET_ID';
var SLACK_TOKEN_PROPERTY = 'SLACK_BOT_TOKEN';
var MAX_SEARCH_PAGES = 10;

var DEFAULT_SETTINGS = {
  SLACK_BOT_TOKEN: '',
  TEAM_DOMAIN: '',
  PARENT_CHANNEL_NAME: '依頼_車案件',
  CHILD_CHANNEL_NAMES: 'carmore依頼,オールマシンサービス SEEMORE',
  LOOKBACK_DAYS: '60',
  DRY_RUN: 'true'
};

var SHEET_HEADERS = {
  settings: ['key', 'value', 'memo'],
  linked_threads: [
    'linked_at',
    'vin',
    'relation_type',
    'source_channel_name',
    'source_channel_id',
    'source_thread_ts',
    'source_url',
    'target_channel_name',
    'target_channel_id',
    'target_thread_ts',
    'target_url',
    'posted_text',
    'dry_run'
  ],
  run_logs: [
    'started_at',
    'finished_at',
    'dry_run',
    'parent_threads_checked',
    'vins_found',
    'child_matches_found',
    'posted_count',
    'duplicate_skipped_count',
    'expired_skipped_count',
    'error_count',
    'memo'
  ],
  errors: ['occurred_at', 'context', 'error_message', 'raw_response'],
  dry_run_logs: [
    'created_at',
    'vin',
    'action_type',
    'target_thread',
    'source_thread',
    'message_preview',
    'reason'
  ]
};

var CHANNEL_CACHE = null;

function setup() {
  var spreadsheet = createSheets();
  saveSettings();
  createDailyTrigger();
  Logger.log(APP_NAME + ' setup completed.');
  Logger.log('Spreadsheet: ' + spreadsheet.getUrl());
  Logger.log('settingsシートへSLACK_BOT_TOKENを入力してください。初期状態はDRY_RUN=trueです。');
}

function main() {
  var settings = getSettings();
  return runWithMode_(settings.dryRun, null);
}

function runDryRun() {
  return runWithMode_(true, null);
}

function runProduction() {
  var settings = getSettings();
  if (settings.dryRun) {
    throw new Error('本番投稿するにはsettingsシートのDRY_RUNをfalseに変更してください。');
  }
  return runWithMode_(false, null);
}

function createSheets() {
  var spreadsheet = getOrCreateSpreadsheet_();
  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    ensureHeader_(sheet, SHEET_HEADERS[sheetName]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, SHEET_HEADERS[sheetName].length);
  });
  seedDefaultSettings_(spreadsheet.getSheetByName('settings'));
  return spreadsheet;
}

function createDailyTrigger() {
  deleteTriggers();
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log('main()の毎日03:00トリガーを作成しました。');
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getSettings() {
  var spreadsheet = createSheets();
  var sheet = spreadsheet.getSheetByName('settings');
  var raw = readSettingsMap_(sheet);
  var properties = PropertiesService.getScriptProperties();
  var tokenFromSheet = stringValue_(raw.SLACK_BOT_TOKEN);
  var tokenFromProperties = stringValue_(properties.getProperty(SLACK_TOKEN_PROPERTY));
  var token = tokenFromSheet || tokenFromProperties;

  if (tokenFromSheet) {
    properties.setProperty(SLACK_TOKEN_PROPERTY, tokenFromSheet);
  }

  var childChannelNames = stringValue_(settingOrDefault_(raw, 'CHILD_CHANNEL_NAMES'))
    .split(',')
    .map(function(name) {
      return name.trim();
    })
    .filter(function(name) {
      return name;
    });

  return {
    slackBotToken: token,
    teamDomain: stringValue_(settingOrDefault_(raw, 'TEAM_DOMAIN')),
    parentChannelName: stringValue_(settingOrDefault_(raw, 'PARENT_CHANNEL_NAME')),
    childChannelNames: childChannelNames,
    lookbackDays: parsePositiveInteger_(settingOrDefault_(raw, 'LOOKBACK_DAYS'), 60),
    dryRun: parseBoolean_(settingOrDefault_(raw, 'DRY_RUN'))
  };
}

function saveSettings(settings) {
  var spreadsheet = createSheets();
  var sheet = spreadsheet.getSheetByName('settings');
  var existing = readSettingsMap_(sheet);
  var hasExplicitSettings = Boolean(settings);
  var next = settings || {};

  Object.keys(DEFAULT_SETTINGS).forEach(function(key) {
    var value;
    if (hasExplicitSettings && Object.prototype.hasOwnProperty.call(next, key)) {
      value = next[key];
    } else if (existing[key] !== undefined && existing[key] !== '') {
      value = existing[key];
    } else {
      value = DEFAULT_SETTINGS[key];
    }
    upsertSetting_(sheet, key, value, settingMemo_(key));
  });

  var token = stringValue_(readSettingsMap_(sheet).SLACK_BOT_TOKEN);
  if (token) {
    PropertiesService.getScriptProperties().setProperty(SLACK_TOKEN_PROPERTY, token);
  }
}

function slackApi(method, payload) {
  var settings = getSettings();
  if (!settings.slackBotToken) {
    throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
  }
  return slackApiWithToken_(settings.slackBotToken, method, payload || {});
}

function getChannelIdByName(name) {
  return getChannelByName_(name).id;
}

function getRecentThreads(channelId, lookbackDays) {
  return getRecentThreadsWithStats_(channelId, lookbackDays).threads;
}

function getThreadMessages(channelId, threadTs) {
  var messages = [];
  var cursor = '';
  do {
    var payload = {
      channel: channelId,
      ts: threadTs,
      limit: 200
    };
    if (cursor) {
      payload.cursor = cursor;
    }
    var response = slackApi('conversations.replies', payload);
    messages = messages.concat(response.messages || []);
    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
  } while (cursor);

  return messages.sort(function(a, b) {
    return slackTsNumber_(a.ts) - slackTsNumber_(b.ts);
  });
}

function extractVins(text) {
  var source = stringValue_(text);
  var vins = [];
  var seen = {};
  var pattern = /(?:車体番号|車台番号)\s*[:：]\s*([A-Za-z0-9Ａ-Ｚａ-ｚ０-９\-ｰ－ー―]+(?:[ \t　]*[A-Za-z0-9Ａ-Ｚａ-ｚ０-９\-ｰ－ー―]+)*)/g;
  var match;
  while ((match = pattern.exec(source)) !== null) {
    var vin = normalizeVin(match[1]);
    if (vin && !seen[vin]) {
      vins.push(vin);
      seen[vin] = true;
    }
  }
  return vins;
}

function normalizeVin(vin) {
  var value = stringValue_(vin);
  if (value.normalize) {
    value = value.normalize('NFKC');
  }
  value = value
    .replace(/[ \t　\r\n]+/g, '')
    .replace(/[、。，．.]+$/g, '')
    .toUpperCase();
  return value;
}

function searchVin(vin) {
  var normalizedVin = normalizeVin(vin);
  if (!normalizedVin) {
    return [];
  }

  var settings = getSettings();
  var channels = getConfiguredChannels_(settings);
  var matches = [];
  channels.forEach(function(channel) {
    var threads = getRecentThreads(channel.id, settings.lookbackDays);
    threads.forEach(function(thread) {
      if (thread.vins.indexOf(normalizedVin) !== -1) {
        thread.role = channel.role;
        thread.configuredChannelName = channel.name;
        matches.push(thread);
      }
    });
  });
  return matches;
}

function getPermalink(channelId, messageTs) {
  var response = slackApi('chat.getPermalink', {
    channel: channelId,
    message_ts: messageTs
  });
  if (!response.permalink) {
    throw new Error('chat.getPermalinkでURLを取得できませんでした。');
  }
  return response.permalink;
}

function postThreadMessage(channelId, threadTs, text) {
  return slackApi('chat.postMessage', {
    channel: channelId,
    thread_ts: threadTs,
    text: text,
    unfurl_links: false,
    unfurl_media: false
  });
}

function isAlreadyLinked(targetChannelId, targetThreadTs, sourceUrl) {
  var sheet = createSheets().getSheetByName('linked_threads');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }
  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    if (
      stringValue_(row[8]) === stringValue_(targetChannelId) &&
      stringValue_(row[9]) === stringValue_(targetThreadTs) &&
      stringValue_(row[6]) === stringValue_(sourceUrl)
    ) {
      return true;
    }
  }
  return false;
}

function threadAlreadyContainsUrl(channelId, threadTs, url) {
  var messages = getThreadMessages(channelId, threadTs);
  return messages.some(function(message) {
    return stringValue_(message.text).indexOf(url) !== -1;
  });
}

function saveLinkedThread(record) {
  var sheet = createSheets().getSheetByName('linked_threads');
  sheet.appendRow([
    record.linked_at || nowIso_(),
    record.vin || '',
    record.relation_type || '',
    record.source_channel_name || '',
    record.source_channel_id || '',
    record.source_thread_ts || '',
    record.source_url || '',
    record.target_channel_name || '',
    record.target_channel_id || '',
    record.target_thread_ts || '',
    record.target_url || '',
    record.posted_text || '',
    String(Boolean(record.dry_run))
  ]);
}

function saveRunLog(record) {
  var sheet = createSheets().getSheetByName('run_logs');
  sheet.appendRow([
    record.started_at || '',
    record.finished_at || nowIso_(),
    String(Boolean(record.dry_run)),
    record.parent_threads_checked || 0,
    record.vins_found || 0,
    record.child_matches_found || 0,
    record.posted_count || 0,
    record.duplicate_skipped_count || 0,
    record.expired_skipped_count || 0,
    record.error_count || 0,
    record.memo || ''
  ]);
}

function saveError(context, error) {
  var sheet = createSheets().getSheetByName('errors');
  var message = error && error.message ? error.message : String(error);
  var raw = error && error.rawResponse ? error.rawResponse : '';
  sheet.appendRow([nowIso_(), context || '', message, raw]);
}

function saveDryRunLog(record) {
  var sheet = createSheets().getSheetByName('dry_run_logs');
  sheet.appendRow([
    record.created_at || nowIso_(),
    record.vin || '',
    record.action_type || '',
    record.target_thread || '',
    record.source_thread || '',
    record.message_preview || '',
    record.reason || ''
  ]);
}

function resolveVinGroups(vin, searchResults) {
  var normalizedVin = normalizeVin(vin);
  var settings = getSettings();
  var parentChannelId = getChannelIdByName(settings.parentChannelName);
  var childChannels = settings.childChannelNames.map(function(name) {
    return {
      name: name,
      id: getChannelIdByName(name)
    };
  });

  var targetThreads = (searchResults || []).filter(function(thread) {
    return thread.vins && thread.vins.indexOf(normalizedVin) !== -1;
  });

  var parentThreads = targetThreads
    .filter(function(thread) {
      return thread.channelId === parentChannelId;
    })
    .sort(compareCreatedTs_);

  var childGroups = childChannels.map(function(channel) {
    var threads = targetThreads
      .filter(function(thread) {
        return thread.channelId === channel.id;
      })
      .sort(compareCreatedTs_);
    return {
      channelName: channel.name,
      channelId: channel.id,
      representative: threads.length ? threads[0] : null,
      duplicates: threads.slice(1),
      threads: threads
    };
  });

  return {
    vin: normalizedVin,
    parent: parentThreads.length ? parentThreads[0] : null,
    parentDuplicates: parentThreads.slice(1),
    childGroups: childGroups
  };
}

function processVin(vin) {
  var settings = getSettings();
  return runWithMode_(settings.dryRun, normalizeVin(vin));
}

function testExtractVins() {
  var text = [
    '車体番号: ZVW30-1234567',
    '車体番号：DA17V-987654、',
    '車台番号: NHP10-123456',
    '車台番号：MH34S-765432'
  ].join('\n');
  var vins = extractVins(text);
  var expected = ['ZVW30-1234567', 'DA17V-987654', 'NHP10-123456', 'MH34S-765432'];
  if (JSON.stringify(vins) !== JSON.stringify(expected)) {
    throw new Error('testExtractVins failed: ' + JSON.stringify(vins));
  }
  Logger.log('testExtractVins OK: ' + JSON.stringify(vins));
}

function testSlackAuth() {
  var response = slackApi('auth.test', {});
  Logger.log('testSlackAuth OK: team=' + response.team + ', user=' + response.user);
  return response;
}

function testFindChannels() {
  var settings = getSettings();
  var names = [settings.parentChannelName].concat(settings.childChannelNames);
  var result = names.map(function(name) {
    return {
      name: name,
      id: getChannelIdByName(name)
    };
  });
  Logger.log('testFindChannels OK: ' + JSON.stringify(result));
  return result;
}

function testDryRunOnce() {
  return runDryRun();
}

function runWithMode_(dryRun, onlyVin) {
  var startedAt = nowIso_();
  var stats = {
    started_at: startedAt,
    dry_run: Boolean(dryRun),
    parent_threads_checked: 0,
    vins_found: 0,
    child_matches_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    expired_skipped_count: 0,
    error_count: 0,
    plannedKeys: {}
  };

  try {
    createSheets();
    var settings = getSettings();
    if (!settings.slackBotToken) {
      throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
    }

    var channels = getConfiguredChannels_(settings);
    var allThreads = [];
    channels.forEach(function(channel) {
      try {
        var scan = getRecentThreadsWithStats_(channel.id, settings.lookbackDays);
        stats.expired_skipped_count += scan.expiredSkipped;
        scan.threads.forEach(function(thread) {
          thread.role = channel.role;
          thread.configuredChannelName = channel.name;
          allThreads.push(thread);
        });
      } catch (error) {
        stats.error_count += 1;
        saveError('getRecentThreads:' + channel.name, error);
      }
    });

    stats.parent_threads_checked = allThreads.filter(function(thread) {
      return thread.role === 'parent';
    }).length;

    var vins = collectVins_(allThreads);
    if (onlyVin) {
      vins = vins.filter(function(vin) {
        return vin === onlyVin;
      });
    }
    stats.vins_found = vins.length;

    vins.forEach(function(vin) {
      try {
        var groups = resolveVinGroups(vin, allThreads);
        stats.child_matches_found += groups.childGroups.reduce(function(count, group) {
          return count + group.threads.length;
        }, 0);
        processVinGroup_(groups, dryRun, stats);
      } catch (error) {
        stats.error_count += 1;
        saveError('processVin:' + vin, error);
      }
    });
  } catch (error) {
    stats.error_count += 1;
    saveError('main', error);
    throw error;
  } finally {
    saveRunLog({
      started_at: startedAt,
      finished_at: nowIso_(),
      dry_run: dryRun,
      parent_threads_checked: stats.parent_threads_checked,
      vins_found: stats.vins_found,
      child_matches_found: stats.child_matches_found,
      posted_count: stats.posted_count,
      duplicate_skipped_count: stats.duplicate_skipped_count,
      expired_skipped_count: stats.expired_skipped_count,
      error_count: stats.error_count,
      memo: dryRun ? 'dry_run planned_count=' + stats.planned_count : ''
    });
  }

  Logger.log('Completed: ' + JSON.stringify({
    dry_run: dryRun,
    vins_found: stats.vins_found,
    planned_count: stats.planned_count,
    posted_count: stats.posted_count,
    duplicate_skipped_count: stats.duplicate_skipped_count,
    expired_skipped_count: stats.expired_skipped_count,
    error_count: stats.error_count
  }));
  return stats;
}

function processVinGroup_(groups, dryRun, stats) {
  var parent = groups.parent;

  if (parent) {
    groups.parentDuplicates.forEach(function(duplicate) {
      executeLinkAction_({
        vin: groups.vin,
        relationType: 'parent_duplicate',
        source: duplicate,
        target: parent,
        text: sameChannelMessage_(ensureThreadUrl_(duplicate))
      }, dryRun, stats);
    });
  }

  groups.childGroups.forEach(function(group) {
    if (!group.representative) {
      return;
    }

    group.duplicates.forEach(function(duplicate) {
      executeLinkAction_({
        vin: groups.vin,
        relationType: 'same_channel_duplicate',
        source: duplicate,
        target: group.representative,
        text: sameChannelMessage_(ensureThreadUrl_(duplicate))
      }, dryRun, stats);
    });

    if (parent) {
      executeLinkAction_({
        vin: groups.vin,
        relationType: 'child_to_parent',
        source: group.representative,
        target: parent,
        text: childToParentMessage_(group.channelName, ensureThreadUrl_(group.representative))
      }, dryRun, stats);
    }
  });
}

function executeLinkAction_(action, dryRun, stats) {
  try {
    if (!action.source || !action.target) {
      return;
    }

    var sourceUrl = ensureThreadUrl_(action.source);
    var targetUrl = ensureThreadUrl_(action.target);
    if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) {
      return;
    }

    var key = [
      action.target.channelId,
      action.target.threadTs,
      sourceUrl
    ].join('|');
    if (stats.plannedKeys[key]) {
      stats.duplicate_skipped_count += 1;
      return;
    }
    stats.plannedKeys[key] = true;

    if (isAlreadyLinked(action.target.channelId, action.target.threadTs, sourceUrl)) {
      stats.duplicate_skipped_count += 1;
      return;
    }

    if (threadAlreadyContainsUrl(action.target.channelId, action.target.threadTs, sourceUrl)) {
      stats.duplicate_skipped_count += 1;
      return;
    }

    var record = {
      linked_at: nowIso_(),
      vin: action.vin,
      relation_type: action.relationType,
      source_channel_name: action.source.configuredChannelName || action.source.channelName,
      source_channel_id: action.source.channelId,
      source_thread_ts: action.source.threadTs,
      source_url: sourceUrl,
      target_channel_name: action.target.configuredChannelName || action.target.channelName,
      target_channel_id: action.target.channelId,
      target_thread_ts: action.target.threadTs,
      target_url: targetUrl,
      posted_text: action.text,
      dry_run: Boolean(dryRun)
    };

    if (dryRun) {
      saveDryRunLog({
        vin: action.vin,
        action_type: action.relationType,
        target_thread: targetUrl,
        source_thread: sourceUrl,
        message_preview: action.text,
        reason: 'DRY_RUN=trueのためSlackへ投稿しません。'
      });
      stats.planned_count += 1;
      return;
    }

    postThreadMessage(action.target.channelId, action.target.threadTs, action.text);
    saveLinkedThread(record);
    stats.posted_count += 1;
  } catch (error) {
    stats.error_count += 1;
    saveError('executeLinkAction:' + action.relationType + ':' + action.vin, error);
  }
}

function getRecentThreadsWithStats_(channelId, lookbackDays) {
  var cutoffTs = cutoffSlackTs_(lookbackDays);
  var threadTsMap = {};
  var expiredSkipped = 0;

  collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap);
  collectThreadCandidatesFromSearch_(channelId, threadTsMap);

  var threads = [];
  Object.keys(threadTsMap).forEach(function(threadTs) {
    try {
      var messages = getThreadMessages(channelId, threadTs);
      if (!messages.length) {
        return;
      }

      var root = messages[0];
      var lastTs = messages.reduce(function(maxTs, message) {
        return Math.max(maxTs, slackTsNumber_(message.ts));
      }, slackTsNumber_(root.ts));

      if (lastTs < Number(cutoffTs)) {
        expiredSkipped += 1;
        return;
      }

      var text = messages.map(function(message) {
        return stringValue_(message.text);
      }).join('\n');
      var vins = extractVins(text);
      if (!vins.length) {
        return;
      }

      var channel = getChannelById_(channelId);
      threads.push({
        channelId: channelId,
        channelName: channel ? channel.name : channelId,
        threadTs: root.thread_ts || root.ts,
        createdTs: root.ts,
        lastTs: String(lastTs),
        vins: vins,
        url: getPermalink(channelId, root.thread_ts || root.ts)
      });
    } catch (error) {
      saveError('buildThread:' + channelId + ':' + threadTs, error);
    }
  });

  return {
    threads: threads,
    expiredSkipped: expiredSkipped
  };
}

function collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap) {
  var cursor = '';
  do {
    var payload = {
      channel: channelId,
      limit: 200,
      oldest: cutoffTs,
      inclusive: true
    };
    if (cursor) {
      payload.cursor = cursor;
    }
    var response = slackApi('conversations.history', payload);
    (response.messages || []).forEach(function(message) {
      var threadTs = message.thread_ts || message.ts;
      if (threadTs) {
        threadTsMap[threadTs] = true;
      }
    });
    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
  } while (cursor);
}

function collectThreadCandidatesFromSearch_(channelId, threadTsMap) {
  ['車体番号', '車台番号'].forEach(function(keyword) {
    for (var page = 1; page <= MAX_SEARCH_PAGES; page += 1) {
      var response = slackApi('search.messages', {
        query: keyword,
        count: 100,
        page: page,
        sort: 'timestamp',
        sort_dir: 'desc'
      });
      var matches = response.messages && response.messages.matches ? response.messages.matches : [];
      matches.forEach(function(match) {
        if (!searchResultBelongsToChannel_(match, channelId)) {
          return;
        }
        var threadTs = threadTsFromSearchMatch_(match);
        if (threadTs) {
          threadTsMap[threadTs] = true;
        }
      });

      var paging = response.messages && response.messages.paging ? response.messages.paging : null;
      if (!paging || page >= Number(paging.pages || 1)) {
        break;
      }
    }
  });
}

function searchResultBelongsToChannel_(match, channelId) {
  if (match.channel && match.channel.id) {
    return match.channel.id === channelId;
  }
  if (match.channel_id) {
    return match.channel_id === channelId;
  }
  if (match.channel && match.channel.name) {
    var channel = getChannelById_(channelId);
    return channel && channelNameMatches_(channel, match.channel.name);
  }
  if (match.channel_name) {
    var channelByName = getChannelById_(channelId);
    return channelByName && channelNameMatches_(channelByName, match.channel_name);
  }
  return false;
}

function threadTsFromSearchMatch_(match) {
  if (match.thread_ts) {
    return match.thread_ts;
  }
  var permalink = stringValue_(match.permalink);
  var threadMatch = permalink.match(/[?&]thread_ts=([0-9.]+)/);
  if (threadMatch) {
    return decodeURIComponent(threadMatch[1]);
  }
  return match.ts || '';
}

function getConfiguredChannels_(settings) {
  var channels = [{
    role: 'parent',
    name: settings.parentChannelName,
    id: getChannelIdByName(settings.parentChannelName)
  }];

  settings.childChannelNames.forEach(function(name) {
    channels.push({
      role: 'child',
      name: name,
      id: getChannelIdByName(name)
    });
  });

  return channels;
}

function getOrCreateSpreadsheet_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty(SPREADSHEET_ID_PROPERTY);
  if (spreadsheetId) {
    try {
      return SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      properties.deleteProperty(SPREADSHEET_ID_PROPERTY);
    }
  }

  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    var existing = SpreadsheetApp.openById(files.next().getId());
    properties.setProperty(SPREADSHEET_ID_PROPERTY, existing.getId());
    return existing;
  }

  var spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
  properties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  return spreadsheet;
}

function ensureHeader_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  var current = range.getValues()[0];
  var needsHeader = current.every(function(cell) {
    return !cell;
  });
  if (!needsHeader) {
    needsHeader = headers.some(function(header, index) {
      return current[index] !== header;
    });
  }
  if (needsHeader) {
    range.setValues([headers]);
  }
}

function seedDefaultSettings_(sheet) {
  Object.keys(DEFAULT_SETTINGS).forEach(function(key) {
    if (!settingExists_(sheet, key)) {
      upsertSetting_(sheet, key, DEFAULT_SETTINGS[key], settingMemo_(key));
    }
  });
}

function readSettingsMap_(sheet) {
  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i += 1) {
    var key = stringValue_(values[i][0]);
    if (key) {
      map[key] = values[i][1];
    }
  }
  return map;
}

function upsertSetting_(sheet, key, value, memo) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow >= 2) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i += 1) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2, 1, 2).setValues([[value, memo || '']]);
        return;
      }
    }
  }
  sheet.appendRow([key, value, memo || '']);
}

function settingExists_(sheet, key) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i += 1) {
    if (values[i][0] === key) {
      return true;
    }
  }
  return false;
}

function settingMemo_(key) {
  var memos = {
    SLACK_BOT_TOKEN: 'xoxb-で始まるBot Token。Script Propertiesにも同期します。',
    TEAM_DOMAIN: '任意。Slackチームドメインの控えです。',
    PARENT_CHANNEL_NAME: '大親チャンネル名。',
    CHILD_CHANNEL_NAMES: '子チャンネル名をカンマ区切りで指定します。',
    LOOKBACK_DAYS: '最終更新日時がこの日数以内のスレッドだけ対象にします。',
    DRY_RUN: 'trueならSlackへ投稿せずdry_run_logsだけ保存します。'
  };
  return memos[key] || '';
}

function settingOrDefault_(settingsMap, key) {
  if (settingsMap[key] !== undefined && settingsMap[key] !== '') {
    return settingsMap[key];
  }
  return DEFAULT_SETTINGS[key];
}

function slackApiWithToken_(token, method, payload) {
  var response = UrlFetchApp.fetch('https://slack.com/api/' + method, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: encodeSlackPayload_(payload || {}),
    muteHttpExceptions: true
  });

  var body = response.getContentText();
  var parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    var parseError = new Error('Slack APIレスポンスをJSONとして読めませんでした: ' + method);
    parseError.rawResponse = body;
    throw parseError;
  }

  if (!parsed.ok) {
    var apiError = new Error('Slack API error on ' + method + ': ' + (parsed.error || 'unknown_error'));
    apiError.rawResponse = body;
    throw apiError;
  }
  return parsed;
}

function encodeSlackPayload_(payload) {
  var encoded = {};
  Object.keys(payload).forEach(function(key) {
    var value = payload[key];
    if (value === undefined || value === null) {
      return;
    }
    encoded[key] = typeof value === 'boolean' ? String(value) : value;
  });
  return encoded;
}

function getChannelByName_(name) {
  var normalizedName = stringValue_(name).trim();
  var channels = getAllChannels_();
  var found = channels.filter(function(channel) {
    return channelNameMatches_(channel, normalizedName);
  })[0];
  if (!found) {
    throw new Error('Slack channel not found or bot is not invited: ' + normalizedName);
  }
  return found;
}

function getChannelById_(channelId) {
  return getAllChannels_().filter(function(channel) {
    return channel.id === channelId;
  })[0] || null;
}

function getAllChannels_() {
  if (CHANNEL_CACHE) {
    return CHANNEL_CACHE;
  }

  var channels = [];
  var cursor = '';
  do {
    var payload = {
      exclude_archived: true,
      limit: 1000,
      types: 'public_channel,private_channel'
    };
    if (cursor) {
      payload.cursor = cursor;
    }
    var response = slackApi('conversations.list', payload);
    channels = channels.concat(response.channels || []);
    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
  } while (cursor);

  CHANNEL_CACHE = channels;
  return channels;
}

function channelNameMatches_(channel, requestedName) {
  var candidates = [
    stringValue_(channel.name),
    stringValue_(channel.name_normalized)
  ].filter(function(value, index, values) {
    return value && values.indexOf(value) === index;
  });
  var requestedVariants = channelNameVariants_(requestedName);
  return candidates.some(function(candidate) {
    var candidateVariants = channelNameVariants_(candidate);
    return candidateVariants.some(function(candidateVariant) {
      return requestedVariants.indexOf(candidateVariant) !== -1;
    });
  });
}

function channelNameVariants_(name) {
  var base = stringValue_(name).trim();
  var lower = base.toLowerCase();
  var hyphenated = lower.replace(/[ \t　]+/g, '-');
  var compact = lower.replace(/[ \t　_-]+/g, '');
  return [lower, hyphenated, compact].filter(function(value, index, values) {
    return value && values.indexOf(value) === index;
  });
}

function collectVins_(threads) {
  var seen = {};
  var vins = [];
  threads.forEach(function(thread) {
    (thread.vins || []).forEach(function(vin) {
      if (!seen[vin]) {
        seen[vin] = true;
        vins.push(vin);
      }
    });
  });
  return vins.sort();
}

function ensureThreadUrl_(thread) {
  if (!thread.url) {
    thread.url = getPermalink(thread.channelId, thread.threadTs);
  }
  return thread.url;
}

function childToParentMessage_(channelName, url) {
  return '関連依頼スレ：\n\n【' + channelName + '】\n' + url;
}

function sameChannelMessage_(url) {
  return '同一車体番号の関連スレ：\n\n' + url;
}

function compareCreatedTs_(a, b) {
  return slackTsNumber_(a.createdTs) - slackTsNumber_(b.createdTs);
}

function cutoffSlackTs_(lookbackDays) {
  return String(Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000));
}

function slackTsNumber_(ts) {
  return parseFloat(ts || '0') || 0;
}

function parseBoolean_(value) {
  var normalized = stringValue_(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parsePositiveInteger_(value, fallback) {
  var parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
}

function stringValue_(value) {
  return value === null || value === undefined ? '' : String(value);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}
