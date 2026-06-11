var APP_NAME = 'SEEMORE Slack車案件リンク管理';
var SPREADSHEET_NAME = 'SEEMORE_Slack車案件リンク管理';
var SPREADSHEET_ID_PROPERTY = 'SEEMORE_SLACK_LINKS_SPREADSHEET_ID';
var SLACK_TOKEN_PROPERTY = 'SLACK_BOT_TOKEN';

var DEFAULT_SETTINGS = {
  SLACK_BOT_TOKEN: '',
  TEAM_DOMAIN: '',
  PARENT_CHANNEL_NAME: '依頼_車案件',
  CHILD_CHANNEL_NAMES: 'carmore依頼,オールマシンサービス',
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

function doGet(event) {
  var action = event && event.parameter ? event.parameter.action : '';
  if (action === 'status') {
    return jsonOutput_(getSetupStatus_());
  }

  if (action === 'slack') {
    return HtmlService.createHtmlOutput(renderSlackSettingsPage_(null));
  }

  if (action === 'test_slack') {
    return runHtmlJsonAction_(function() {
      return {
        auth: testSlackAuth(),
        channels: testFindChannels()
      };
    });
  }

  if (action === 'test_logic') {
    return runHtmlJsonAction_(function() {
      return testResolveVinGroups();
    });
  }

  if (action === 'dryrun') {
    var lookbackDaysOverride = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var maxThreadsPerChannel = parsePositiveInteger_(event.parameter.max_threads_per_channel, 0);
    return runHtmlJsonAction_(function() {
      return runWithMode_(true, null, lookbackDaysOverride || null, maxThreadsPerChannel || null);
    });
  }

  if (action !== 'setup') {
    return HtmlService.createHtmlOutput(
      '<p>' + APP_NAME + '</p>' +
      '<p>セットアップを実行するにはURL末尾に <code>?action=setup</code> を付けて開いてください。</p>' +
      '<p>状態確認は <code>?action=status</code> です。</p>' +
      '<p>Slack設定は <code>?action=slack</code> です。</p>' +
      '<p>Slack疎通確認は <code>?action=test_slack</code>、ロジック確認は <code>?action=test_logic</code>、dry runは <code>?action=dryrun</code> です。</p>'
    );
  }

  var spreadsheet = createSheets();
  saveSettings();
  createDailyTrigger();
  var status = getSetupStatus_();
  var html = [
    '<h1>' + APP_NAME + '</h1>',
    '<p>setup() が完了しました。</p>',
    '<p><a target="_blank" href="' + spreadsheet.getUrl() + '">設定スプレッドシートを開く</a></p>',
    '<p>settingsシートへSLACK_BOT_TOKENを入力してください。初期状態はDRY_RUN=trueです。</p>',
    '<pre>' + JSON.stringify(status, null, 2).replace(/[<>&]/g, function(char) {
      return {'<': '&lt;', '>': '&gt;', '&': '&amp;'}[char];
    }) + '</pre>'
  ].join('');
  return HtmlService.createHtmlOutput(html);
}

function jsonOutput_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlJsonOutput_(value) {
  return HtmlService.createHtmlOutput(
    '<pre>' + escapeHtml_(JSON.stringify(value, null, 2)) + '</pre>'
  );
}

function runHtmlJsonAction_(callback) {
  try {
    return htmlJsonOutput_({
      ok: true,
      result: callback()
    });
  } catch (error) {
    return htmlJsonOutput_({
      ok: false,
      error: error.message,
      raw_response: error.rawResponse || ''
    });
  }
}

function doPost(event) {
  var action = event && event.parameter ? event.parameter.action : '';
  if (action !== 'save_slack_token') {
    return HtmlService.createHtmlOutput('<p>Unsupported action.</p>');
  }

  var token = stringValue_(event.parameter.SLACK_BOT_TOKEN).trim();
  var result = {
    saved: false,
    auth_ok: false,
    channels_ok: false,
    messages: []
  };

  if (!/^xoxb-[A-Za-z0-9-]+$/.test(token)) {
    result.messages.push('SLACK_BOT_TOKENはxoxb-で始まるBot Tokenを入力してください。');
    return HtmlService.createHtmlOutput(renderSlackSettingsPage_(result));
  }

  saveSlackBotToken_(token);
  result.saved = true;
  result.messages.push('SLACK_BOT_TOKENをsettingsシートとScript Propertiesへ保存しました。');

  try {
    var authResponse = testSlackAuth();
    result.auth_ok = true;
    result.messages.push('Slack API認証OK: team=' + authResponse.team + ', user=' + authResponse.user);
  } catch (error) {
    result.messages.push('Slack API認証NG: ' + error.message);
  }

  try {
    var channels = testFindChannels();
    result.channels_ok = true;
    result.messages.push('チャンネル確認OK: ' + channels.map(function(channel) {
      return channel.name + '=' + channel.id;
    }).join(', '));
  } catch (error) {
    result.messages.push('チャンネル確認NG: ' + error.message);
  }

  return HtmlService.createHtmlOutput(renderSlackSettingsPage_(result));
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

function getSetupStatus_() {
  var status = {
    checked_at: nowIso_(),
    spreadsheet_name: SPREADSHEET_NAME,
    spreadsheet_found: false,
    spreadsheet_id: '',
    spreadsheet_url: '',
    sheets: {},
    settings: {
      has_slack_bot_token: false,
      dry_run: '',
      parent_channel_name: '',
      child_channel_names: '',
      lookback_days: ''
    },
    main_daily_trigger_found: false,
    main_trigger_count: 0
  };

  var spreadsheet = findExistingSpreadsheet_();
  if (spreadsheet) {
    status.spreadsheet_found = true;
    status.spreadsheet_id = spreadsheet.getId();
    status.spreadsheet_url = spreadsheet.getUrl();
    Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);
      status.sheets[sheetName] = {
        exists: Boolean(sheet),
        header_ok: sheet ? headerMatches_(sheet, SHEET_HEADERS[sheetName]) : false
      };
    });

    var settingsSheet = spreadsheet.getSheetByName('settings');
    if (settingsSheet) {
      var settings = readSettingsMap_(settingsSheet);
      status.settings.has_slack_bot_token = Boolean(stringValue_(settings.SLACK_BOT_TOKEN));
      status.settings.dry_run = stringValue_(settingOrDefault_(settings, 'DRY_RUN'));
      status.settings.parent_channel_name = stringValue_(settingOrDefault_(settings, 'PARENT_CHANNEL_NAME'));
      status.settings.child_channel_names = stringValue_(settingOrDefault_(settings, 'CHILD_CHANNEL_NAMES'));
      status.settings.lookback_days = stringValue_(settingOrDefault_(settings, 'LOOKBACK_DAYS'));
    }
  }

  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === 'main';
  });
  status.main_trigger_count = triggers.length;
  status.main_daily_trigger_found = triggers.length > 0;

  return status;
}

function renderSlackSettingsPage_(result) {
  var actionUrl = ScriptApp.getService().getUrl();
  var status = getSetupStatus_();
  var messages = result && result.messages ? result.messages : [];
  var statusText = [
    'Spreadsheet: ' + (status.spreadsheet_found ? 'OK' : 'NG'),
    'SLACK_BOT_TOKEN: ' + (status.settings.has_slack_bot_token ? 'saved' : 'empty'),
    'DRY_RUN: ' + status.settings.dry_run,
    'Trigger: ' + (status.main_daily_trigger_found ? 'OK' : 'NG')
  ].join('\n');

  var messageHtml = messages.length
    ? '<ul>' + messages.map(function(message) {
      return '<li>' + escapeHtml_(message) + '</li>';
    }).join('') + '</ul>'
    : '';

  return [
    '<h1>' + escapeHtml_(APP_NAME) + '</h1>',
    '<h2>Slack Bot Token設定</h2>',
    '<p>Slack AppのBot User OAuth Tokenを入力してください。Tokenは画面へ再表示しません。</p>',
    messageHtml,
    '<form method="post" action="' + escapeHtml_(actionUrl) + '">',
    '<input type="hidden" name="action" value="save_slack_token">',
    '<p><input type="password" name="SLACK_BOT_TOKEN" placeholder="xoxb-..." style="width: 420px;"></p>',
    '<p><button type="submit">保存してSlack疎通確認</button></p>',
    '</form>',
    '<h2>現在状態</h2>',
    '<pre>' + escapeHtml_(statusText) + '</pre>',
    '<p><a href="' + escapeHtml_(actionUrl) + '?action=status" target="_blank">JSON状態確認</a></p>'
  ].join('');
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
    upsertSetting_(sheet, key, normalizeSettingValue_(key, value), settingMemo_(key));
  });

  var token = stringValue_(readSettingsMap_(sheet).SLACK_BOT_TOKEN);
  if (token) {
    PropertiesService.getScriptProperties().setProperty(SLACK_TOKEN_PROPERTY, token);
  }
}

function saveSlackBotToken_(token) {
  var spreadsheet = createSheets();
  var sheet = spreadsheet.getSheetByName('settings');
  upsertSetting_(sheet, 'SLACK_BOT_TOKEN', token, settingMemo_('SLACK_BOT_TOKEN'));
  PropertiesService.getScriptProperties().setProperty(SLACK_TOKEN_PROPERTY, token);
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
  var settings = getSettings();
  var parentChannelId = getChannelIdByName(settings.parentChannelName);
  var childChannels = settings.childChannelNames.map(function(name) {
    return {
      name: name,
      id: getChannelIdByName(name)
    };
  });

  return resolveVinGroupsFromChannels_(vin, searchResults, parentChannelId, childChannels);
}

function resolveVinGroupsFromChannels_(vin, searchResults, parentChannelId, childChannels) {
  var normalizedVin = normalizeVin(vin);
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

function testResolveVinGroups() {
  var parentChannelId = 'PARENT';
  var childChannels = [
    {name: 'carmore依頼', id: 'CHILD_CARMORE'},
    {name: 'オールマシンサービス', id: 'CHILD_ALLMACHINE'}
  ];
  var threads = [
    testThread_('PARENT', '依頼_車案件', '100.000001', ['ABC123'], 'https://slack.test/parent-old'),
    testThread_('PARENT', '依頼_車案件', '200.000001', ['ABC123'], 'https://slack.test/parent-new'),
    testThread_('CHILD_CARMORE', 'carmore依頼', '150.000001', ['ABC123'], 'https://slack.test/carmore-old'),
    testThread_('CHILD_CARMORE', 'carmore依頼', '250.000001', ['ABC123'], 'https://slack.test/carmore-new'),
    testThread_('CHILD_ALLMACHINE', 'オールマシンサービス', '175.000001', ['ABC123'], 'https://slack.test/allmachine-old'),
    testThread_('CHILD_CARMORE', 'carmore依頼', '300.000001', ['ABC1234'], 'https://slack.test/partial-match')
  ];

  var groups = resolveVinGroupsFromChannels_('abc123', threads, parentChannelId, childChannels);
  var actions = buildLinkActions_(groups);
  var actionSummary = actions.map(function(action) {
    return {
      relationType: action.relationType,
      sourceUrl: action.source.url,
      targetUrl: action.target.url
    };
  });

  assertTest_(groups.parent.url === 'https://slack.test/parent-old', 'oldest parent thread must be selected');
  assertTest_(groups.parentDuplicates.length === 1, 'newer parent duplicate must be separated');
  assertTest_(groups.childGroups[0].representative.url === 'https://slack.test/carmore-old', 'oldest carmore thread must be representative');
  assertTest_(groups.childGroups[0].duplicates.length === 1, 'newer carmore duplicate must be separated');
  assertTest_(groups.childGroups[1].representative.url === 'https://slack.test/allmachine-old', 'allmachine representative must be selected');
  assertTest_(actions.filter(function(action) { return action.relationType === 'parent_duplicate'; }).length === 1, 'parent duplicate action count');
  assertTest_(actions.filter(function(action) { return action.relationType === 'same_channel_duplicate'; }).length === 1, 'same channel duplicate action count');
  assertTest_(actions.filter(function(action) { return action.relationType === 'child_to_parent'; }).length === 2, 'child to parent action count');
  assertTest_(actions.every(function(action) { return action.source.url !== 'https://slack.test/partial-match'; }), 'partial VIN match must not be included');

  Logger.log('testResolveVinGroups OK: ' + JSON.stringify(actionSummary));
  return {
    ok: true,
    actions: actionSummary
  };
}

function testDryRunOnce() {
  return runDryRun();
}

function testThread_(channelId, channelName, createdTs, vins, url) {
  return {
    channelId: channelId,
    channelName: channelName,
    configuredChannelName: channelName,
    threadTs: createdTs,
    createdTs: createdTs,
    lastTs: createdTs,
    vins: vins,
    url: url
  };
}

function assertTest_(condition, message) {
  if (!condition) {
    throw new Error('testResolveVinGroups failed: ' + message);
  }
}

function runWithMode_(dryRun, onlyVin, lookbackDaysOverride, maxThreadsPerChannel) {
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
    var parentChannel = channels.filter(function(channel) {
      return channel.role === 'parent';
    })[0];
    var childChannels = channels
      .filter(function(channel) {
        return channel.role === 'child';
      })
      .map(function(channel) {
        return {
          name: channel.name,
          id: channel.id
        };
      });
    var allThreads = [];
    channels.forEach(function(channel) {
      try {
        var scan = getRecentThreadsWithStats_(channel.id, lookbackDaysOverride || settings.lookbackDays, maxThreadsPerChannel);
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
        var groups = resolveVinGroupsFromChannels_(vin, allThreads, parentChannel.id, childChannels);
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
  buildLinkActions_(groups).forEach(function(action) {
    executeLinkAction_(action, dryRun, stats);
  });
}

function buildLinkActions_(groups) {
  var actions = [];
  var parent = groups.parent;

  if (parent) {
    groups.parentDuplicates.forEach(function(duplicate) {
      actions.push({
        vin: groups.vin,
        relationType: 'parent_duplicate',
        source: duplicate,
        target: parent,
        text: sameChannelMessage_(ensureThreadUrl_(duplicate))
      });
    });
  }

  groups.childGroups.forEach(function(group) {
    if (!group.representative) {
      return;
    }

    group.duplicates.forEach(function(duplicate) {
      actions.push({
        vin: groups.vin,
        relationType: 'same_channel_duplicate',
        source: duplicate,
        target: group.representative,
        text: sameChannelMessage_(ensureThreadUrl_(duplicate))
      });
    });

    if (parent) {
      actions.push({
        vin: groups.vin,
        relationType: 'child_to_parent',
        source: group.representative,
        target: parent,
        text: childToParentMessage_(group.channelName, ensureThreadUrl_(group.representative))
      });
    }
  });

  return actions;
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

function getRecentThreadsWithStats_(channelId, lookbackDays, maxThreads) {
  var cutoffTs = cutoffSlackTs_(lookbackDays);
  var threadTsMap = {};
  var expiredSkipped = 0;

  collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap, maxThreads);
  // Bot tokens cannot call search.messages, so this GAS scans joined channel history.

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

function collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap, maxThreads) {
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
      if (maxThreads && Object.keys(threadTsMap).length >= maxThreads) {
        return;
      }
      var threadTs = message.thread_ts || message.ts;
      if (threadTs) {
        threadTsMap[threadTs] = true;
      }
    });
    if (maxThreads && Object.keys(threadTsMap).length >= maxThreads) {
      cursor = '';
      break;
    }
    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
  } while (cursor);
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

function findExistingSpreadsheet_() {
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
    var spreadsheet = SpreadsheetApp.openById(files.next().getId());
    properties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
    return spreadsheet;
  }

  return null;
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

function headerMatches_(sheet, headers) {
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  return headers.every(function(header, index) {
    return current[index] === header;
  });
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
  var value;
  if (settingsMap[key] !== undefined && settingsMap[key] !== '') {
    value = settingsMap[key];
  } else {
    value = DEFAULT_SETTINGS[key];
  }
  return normalizeSettingValue_(key, value);
}

function normalizeSettingValue_(key, value) {
  if (key === 'CHILD_CHANNEL_NAMES') {
    return stringValue_(value).replace(/オールマシンサービス\s+SEEMORE/g, 'オールマシンサービス');
  }
  return value;
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

function escapeHtml_(value) {
  return stringValue_(value).replace(/[<>&"']/g, function(char) {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}
