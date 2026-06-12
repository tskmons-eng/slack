var APP_NAME = 'SEEMORE Slack車案件リンク管理';
var SPREADSHEET_NAME = 'SEEMORE_Slack車案件リンク管理';
var SPREADSHEET_ID_PROPERTY = 'SEEMORE_SLACK_LINKS_SPREADSHEET_ID';
var SLACK_TOKEN_PROPERTY = 'SLACK_BOT_TOKEN';
var SCHEDULED_HANDLER_FUNCTION = 'scheduledMain';
var INVOICE_FORWARD_CONFIRM_TOKEN = 'RUN_INVOICE_FORWARD';

var DEFAULT_SETTINGS = {
  SLACK_BOT_TOKEN: '',
  TEAM_DOMAIN: '',
  PARENT_CHANNEL_NAME: '依頼_車案件',
  CHILD_CHANNEL_NAMES: 'carmore依頼,オールマシンサービス',
  LOOKBACK_DAYS: '60',
  DRY_RUN: 'true',
  MAIN_TRIGGER_HOURS: '3,13,20',
  INVOICE_FORWARD_ENABLED: 'true',
  INVOICE_SOURCE_CHANNEL_NAME: '依頼＿ALL',
  INVOICE_TARGET_CHANNEL_NAME: '依頼＿請求書',
  INVOICE_REACTION_NAME: 'rocket',
  INVOICE_LOOKBACK_DAYS: '7',
  INVOICE_HISTORY_LIMIT: '50',
  INVOICE_REPLY_THREAD_LIMIT: '10',
  INVOICE_FORWARD_DRY_RUN: 'false'
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
  ],
  invoice_reaction_posts: [
    'processed_at',
    'source_channel_name',
    'source_channel_id',
    'source_message_ts',
    'source_url',
    'file_id',
    'file_name',
    'reaction_name',
    'target_channel_name',
    'target_channel_id',
    'posted_ts',
    'posted_text',
    'dry_run'
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

  if (action === 'invoice_dryrun') {
    var invoiceDryRunLookbackDays = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var invoiceDryRunHistoryLimit = parsePositiveInteger_(event.parameter.history_limit, 0);
    return runHtmlJsonAction_(function() {
      return processInvoiceReactions_(true, invoiceDryRunLookbackDays || null, invoiceDryRunHistoryLimit || null);
    });
  }

  if (action === 'invoice_run') {
    var invoiceRunLookbackDays = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var invoiceRunHistoryLimit = parsePositiveInteger_(event.parameter.history_limit, 0);
    var invoiceConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      if (invoiceConfirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
        throw new Error('請求書転送の手動本番実行には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
      }
      return processInvoiceReactions_(false, invoiceRunLookbackDays || null, invoiceRunHistoryLimit || null);
    });
  }

  if (action === 'scan_labels') {
    var scanLookbackDays = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var scanMaxThreads = parsePositiveInteger_(event.parameter.max_threads_per_channel, 0);
    var scanRole = stringValue_(event.parameter.channel_role || 'parent');
    var scanChannelName = stringValue_(event.parameter.channel_name || '');
    return runHtmlJsonAction_(function() {
      return scanVinLabels_(scanRole, scanLookbackDays || null, scanMaxThreads || null, scanChannelName || null);
    });
  }

  if (action === 'link_threads') {
    var linkDryRunParam = stringValue_(event.parameter.dry_run);
    var linkDryRun = linkDryRunParam === '' ? true : parseBoolean_(linkDryRunParam);
    var sourceChannelName = stringValue_(event.parameter.source_channel_name || '');
    var sourceThreadTs = stringValue_(event.parameter.source_thread_ts || '');
    var targetThreadTs = stringValue_(event.parameter.target_thread_ts || '');
    var confirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      return linkKnownThreads_(sourceChannelName, sourceThreadTs, targetThreadTs, linkDryRun, confirm);
    });
  }

  if (action !== 'setup') {
    return HtmlService.createHtmlOutput(
      '<p>' + APP_NAME + '</p>' +
      '<p>セットアップを実行するにはURL末尾に <code>?action=setup</code> を付けて開いてください。</p>' +
      '<p>状態確認は <code>?action=status</code> です。</p>' +
      '<p>Slack設定は <code>?action=slack</code> です。</p>' +
      '<p>Slack疎通確認は <code>?action=test_slack</code>、ロジック確認は <code>?action=test_logic</code>、dry runは <code>?action=dryrun</code> です。</p>' +
      '<p>請求書転送の確認は <code>?action=invoice_dryrun</code>、手動本番は <code>?action=invoice_run&amp;confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + '</code> です。</p>'
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

function scheduledMain() {
  var result = {
    started_at: nowIso_(),
    vehicle_linking: null,
    invoice_forwarding: null,
    error_count: 0
  };
  var settings = getSettings();

  try {
    result.vehicle_linking = runWithMode_(settings.dryRun, null);
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:vehicle_linking', error);
  }

  try {
    result.invoice_forwarding = processInvoiceReactions_(settings.invoiceForwardDryRun);
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:invoice_forwarding', error);
  }

  result.finished_at = nowIso_();
  Logger.log('scheduledMain completed: ' + JSON.stringify(result));
  return result;
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
      lookback_days: '',
      main_trigger_hours: '',
      invoice_forward_enabled: '',
      invoice_forward_dry_run: '',
      invoice_source_channel_name: '',
      invoice_target_channel_name: '',
      invoice_reaction_name: '',
      invoice_lookback_days: '',
      invoice_history_limit: ''
    },
    scheduled_handler: SCHEDULED_HANDLER_FUNCTION,
    scheduled_trigger_count: 0,
    scheduled_trigger_found: false,
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
      status.settings.main_trigger_hours = stringValue_(settingOrDefault_(settings, 'MAIN_TRIGGER_HOURS'));
      status.settings.invoice_forward_enabled = stringValue_(settingOrDefault_(settings, 'INVOICE_FORWARD_ENABLED'));
      status.settings.invoice_forward_dry_run = stringValue_(settingOrDefault_(settings, 'INVOICE_FORWARD_DRY_RUN'));
      status.settings.invoice_source_channel_name = stringValue_(settingOrDefault_(settings, 'INVOICE_SOURCE_CHANNEL_NAME'));
      status.settings.invoice_target_channel_name = stringValue_(settingOrDefault_(settings, 'INVOICE_TARGET_CHANNEL_NAME'));
      status.settings.invoice_reaction_name = stringValue_(settingOrDefault_(settings, 'INVOICE_REACTION_NAME'));
      status.settings.invoice_lookback_days = stringValue_(settingOrDefault_(settings, 'INVOICE_LOOKBACK_DAYS'));
      status.settings.invoice_history_limit = stringValue_(settingOrDefault_(settings, 'INVOICE_HISTORY_LIMIT'));
      status.settings.invoice_reply_thread_limit = stringValue_(settingOrDefault_(settings, 'INVOICE_REPLY_THREAD_LIMIT'));
    }
  }

  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === SCHEDULED_HANDLER_FUNCTION;
  });
  status.scheduled_trigger_count = triggers.length;
  status.scheduled_trigger_found = triggers.length > 0;
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
    'Trigger: ' + (status.scheduled_trigger_found ? 'OK' : 'NG') + ' / ' + status.settings.main_trigger_hours
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
  var settings = getSettings();
  settings.mainTriggerHours.forEach(function(hour) {
    ScriptApp.newTrigger(SCHEDULED_HANDLER_FUNCTION)
      .timeBased()
      .everyDays(1)
      .atHour(hour)
      .nearMinute(0)
      .create();
  });
  Logger.log(SCHEDULED_HANDLER_FUNCTION + '()の毎日トリガーを作成しました: ' + settings.mainTriggerHours.join(','));
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main' || trigger.getHandlerFunction() === SCHEDULED_HANDLER_FUNCTION) {
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
    dryRun: parseBoolean_(settingOrDefault_(raw, 'DRY_RUN')),
    mainTriggerHours: parseTriggerHours_(settingOrDefault_(raw, 'MAIN_TRIGGER_HOURS')),
    invoiceForwardEnabled: parseBoolean_(settingOrDefault_(raw, 'INVOICE_FORWARD_ENABLED')),
    invoiceSourceChannelName: stringValue_(settingOrDefault_(raw, 'INVOICE_SOURCE_CHANNEL_NAME')),
    invoiceTargetChannelName: stringValue_(settingOrDefault_(raw, 'INVOICE_TARGET_CHANNEL_NAME')),
    invoiceReactionName: normalizeReactionName_(settingOrDefault_(raw, 'INVOICE_REACTION_NAME')),
    invoiceLookbackDays: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_LOOKBACK_DAYS'), 7),
    invoiceHistoryLimit: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_HISTORY_LIMIT'), 50),
    invoiceReplyThreadLimit: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_REPLY_THREAD_LIMIT'), 10),
    invoiceForwardDryRun: parseBoolean_(settingOrDefault_(raw, 'INVOICE_FORWARD_DRY_RUN'))
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

function extractLinkKeys(text) {
  var keys = [];
  var seen = {};

  extractVehicleLinkKeys_(text).concat(extractThreadIdLinkKeys_(text)).forEach(function(key) {
    var storageKey = linkKeyToStorageValue_(key);
    if (storageKey && !seen[storageKey]) {
      keys.push(key);
      seen[storageKey] = true;
    }
  });

  return keys;
}

function extractVehicleLinkKeys_(text) {
  var source = normalizeUnicode_(text);
  var keys = [];
  var pattern = /(?:車体番号|車台番号)\s*:\s*([A-Za-z0-9\-ｰ－ー―]+(?:[ \t　]*[A-Za-z0-9\-ｰ－ー―]+)*)/gi;
  var match;
  while ((match = pattern.exec(source)) !== null) {
    var value = normalizeLinkValue_(match[1]);
    if (value) {
      keys.push(makeLinkKey_('vin', value));
    }
  }
  return keys;
}

function extractThreadIdLinkKeys_(text) {
  var source = normalizeUnicode_(text);
  var keys = [];
  var pattern = /ス\s*レ\s*ID\s*:\s*([^\r\n]+)/gi;
  var match;
  while ((match = pattern.exec(source)) !== null) {
    var value = normalizeLinkValue_(match[1]);
    if (value) {
      keys.push(makeLinkKey_('thread_id', value));
    }
  }
  return keys;
}

function makeLinkKey_(type, value) {
  return {
    type: type,
    value: normalizeLinkValue_(value)
  };
}

function normalizeLinkKey_(key) {
  if (typeof key === 'string') {
    return makeLinkKey_('vin', key);
  }
  return makeLinkKey_(key && key.type ? key.type : 'vin', key && key.value ? key.value : '');
}

function normalizeLinkValue_(value) {
  var normalized = normalizeUnicode_(value);
  return normalized
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t　\r\n]+/g, '')
    .replace(/^[「『【［\[\(<＜]+/g, '')
    .replace(/[」』】］\]\)>＞、。，．.,;；]+$/g, '')
    .toUpperCase();
}

function normalizeUnicode_(value) {
  var normalized = stringValue_(value);
  if (normalized.normalize) {
    normalized = normalized.normalize('NFKC');
  }
  return normalized;
}

function linkKeyToStorageValue_(key) {
  var normalized = normalizeLinkKey_(key);
  if (!normalized.value) {
    return '';
  }
  return linkKeyTypeLabel_(normalized.type) + ':' + normalized.value;
}

function linkKeyTypeLabel_(type) {
  return type === 'thread_id' ? 'スレID' : '車体番号';
}

function linkKeysContain_(keys, targetKey) {
  var targetStorageKey = linkKeyToStorageValue_(targetKey);
  return (keys || []).some(function(key) {
    return linkKeyToStorageValue_(key) === targetStorageKey;
  });
}

function extractThreadIds(text) {
  return uniqueValues_(extractThreadIdLinkKeys_(text).map(function(key) {
    return key.value;
  }));
}

function extractVins(text) {
  return uniqueValues_(extractVehicleLinkKeys_(text).map(function(key) {
    return key.value;
  }));
}

function normalizeVin(vin) {
  return normalizeLinkValue_(vin);
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
  return formatSlackMessagePermalink_(response.permalink, channelId, messageTs);
}

function formatSlackMessagePermalink_(permalink, channelId, messageTs) {
  var value = stringValue_(permalink);
  var hashIndex = value.indexOf('#');
  var hash = hashIndex === -1 ? '' : value.slice(hashIndex);
  var withoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  var queryIndex = withoutHash.indexOf('?');
  var baseUrl = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  var rawQuery = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1);
  var params = [];

  if (rawQuery) {
    rawQuery.split('&').forEach(function(part) {
      var key = (part.split('=')[0] || '').replace(/^amp;/, '');
      if (!part || key === 'cid' || key === 'channel' || key === 'message_ts') {
        return;
      }
      params.push(part);
    });
  }

  params.push('channel=' + encodeURIComponent(channelId));
  params.push('message_ts=' + encodeURIComponent(messageTs));
  return baseUrl + '?' + params.join('&') + hash;
}

function postThreadMessage(channelId, threadTs, text) {
  return slackApi('chat.postMessage', {
    channel: channelId,
    thread_ts: threadTs,
    text: text,
    unfurl_links: true,
    unfurl_media: true
  });
}

function postChannelMessage(channelId, text) {
  return slackApi('chat.postMessage', {
    channel: channelId,
    text: text,
    unfurl_links: true,
    unfurl_media: true
  });
}

function processInvoiceReactions_(dryRunOverride, lookbackDaysOverride, historyLimitOverride) {
  var startedAt = nowIso_();
  var stats = {
    started_at: startedAt,
    dry_run: Boolean(dryRunOverride),
    enabled: false,
    source_channel_name: '',
    source_channel_id: '',
    target_channel_name: '',
    target_channel_id: '',
    reaction_name: '',
    lookback_days: 0,
    history_limit: 0,
    reply_thread_limit: 0,
    messages_checked: 0,
    reply_threads_checked: 0,
    reply_messages_checked: 0,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    history_next_cursor_found: false,
    message_samples: []
  };

  try {
    createSheets();
    var settings = getSettings();
    stats.enabled = Boolean(settings.invoiceForwardEnabled);
    stats.source_channel_name = settings.invoiceSourceChannelName;
    stats.target_channel_name = settings.invoiceTargetChannelName;
    stats.reaction_name = settings.invoiceReactionName;
    stats.lookback_days = lookbackDaysOverride || settings.invoiceLookbackDays;
    stats.history_limit = Math.min(historyLimitOverride || settings.invoiceHistoryLimit, 200);
    stats.reply_thread_limit = settings.invoiceReplyThreadLimit;

    if (!settings.invoiceForwardEnabled) {
      return stats;
    }
    if (!settings.slackBotToken) {
      throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
    }

    var sourceChannel = getChannelByName_(settings.invoiceSourceChannelName);
    var targetChannel = getChannelByName_(settings.invoiceTargetChannelName);
    stats.source_channel_id = sourceChannel.id;
    stats.target_channel_id = targetChannel.id;

    var response = slackApi('conversations.history', {
      channel: sourceChannel.id,
      limit: stats.history_limit,
      oldest: cutoffSlackTs_(stats.lookback_days),
      inclusive: true
    });
    var messages = response.messages || [];
    stats.messages_checked = messages.length;
    stats.history_next_cursor_found = Boolean(response.response_metadata && response.response_metadata.next_cursor);

    messages.forEach(function(message) {
      try {
        addInvoiceMessageSample_(stats, message, settings.invoiceReactionName, 'root', message.ts);
        processInvoiceMessageForForward_(message, sourceChannel, targetChannel, settings, stats, dryRunOverride);
      } catch (error) {
        stats.error_count += 1;
        saveError('processInvoiceReactionMessage:' + (message.ts || ''), error);
      }
      try {
        scanInvoiceThreadRepliesForForward_(message, sourceChannel, targetChannel, settings, stats, dryRunOverride);
      } catch (error) {
        stats.error_count += 1;
        saveError('processInvoiceReactionReplies:' + (message.ts || ''), error);
      }
    });
  } catch (error) {
    stats.error_count += 1;
    saveError('processInvoiceReactions', error);
    throw error;
  } finally {
    stats.finished_at = nowIso_();
    Logger.log('processInvoiceReactions completed: ' + JSON.stringify(stats));
  }

  return stats;
}

function scanInvoiceThreadRepliesForForward_(rootMessage, sourceChannel, targetChannel, settings, stats, dryRunOverride) {
  if (!rootMessage.reply_count || stats.reply_threads_checked >= settings.invoiceReplyThreadLimit) {
    return;
  }

  stats.reply_threads_checked += 1;
  getThreadMessages(sourceChannel.id, rootMessage.ts).forEach(function(reply) {
    if (normalizeSlackTsForCompare_(reply.ts) === normalizeSlackTsForCompare_(rootMessage.ts)) {
      return;
    }

    stats.reply_messages_checked += 1;
    try {
      addInvoiceMessageSample_(stats, reply, settings.invoiceReactionName, 'reply', rootMessage.ts);
      processInvoiceMessageForForward_(reply, sourceChannel, targetChannel, settings, stats, dryRunOverride);
    } catch (error) {
      stats.error_count += 1;
      saveError('processInvoiceReactionReply:' + (reply.ts || ''), error);
    }
  });
}

function processInvoiceMessageForForward_(message, sourceChannel, targetChannel, settings, stats, dryRunOverride) {
  if (!messageHasReaction_(message, settings.invoiceReactionName)) {
    return;
  }

  var pdfFile = findPdfFile_(message);
  if (!pdfFile) {
    stats.no_pdf_skipped_count += 1;
    return;
  }

  stats.candidates_found += 1;
  var sourceMessageTs = message.ts;
  var fileId = stringValue_(pdfFile.id || pdfFile.url_private || invoiceFileName_(pdfFile));
  if (isInvoiceAlreadyPosted_(sourceChannel.id, sourceMessageTs, fileId, settings.invoiceReactionName)) {
    stats.duplicate_skipped_count += 1;
    return;
  }

  var sourceUrl = getPermalink(sourceChannel.id, sourceMessageTs);
  var text = invoiceForwardMessage_(invoiceFileName_(pdfFile), sourceUrl);
  if (dryRunOverride) {
    stats.planned_count += 1;
    return;
  }

  var postResponse = postChannelMessage(targetChannel.id, text);
  saveInvoiceReactionPost_({
    processed_at: nowIso_(),
    source_channel_name: sourceChannel.name,
    source_channel_id: sourceChannel.id,
    source_message_ts: sourceMessageTs,
    source_url: sourceUrl,
    file_id: fileId,
    file_name: invoiceFileName_(pdfFile),
    reaction_name: normalizeReactionName_(settings.invoiceReactionName),
    target_channel_name: targetChannel.name,
    target_channel_id: targetChannel.id,
    posted_ts: postResponse.ts || '',
    posted_text: text,
    dry_run: false
  });
  stats.posted_count += 1;
}

function isAlreadyLinked(targetChannelId, targetThreadTs, sourceUrl, targetUrl) {
  var sheet = createSheets().getSheetByName('linked_threads');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }
  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var storedSourceUrl = normalizeSlackUrl_(row[6]);
    var storedTargetUrl = normalizeSlackUrl_(row[10]);
    var sameTargetByUrl = targetUrl && storedTargetUrl === normalizeSlackUrl_(targetUrl);
    var sameTargetByTs =
      stringValue_(row[8]) === stringValue_(targetChannelId) &&
      normalizeSlackTsForCompare_(row[9]) === normalizeSlackTsForCompare_(targetThreadTs);
    if (storedSourceUrl === normalizeSlackUrl_(sourceUrl) && (sameTargetByUrl || sameTargetByTs)) {
      return true;
    }
  }
  return false;
}

function threadAlreadyContainsUrl(channelId, threadTs, url) {
  var messages = getThreadMessages(channelId, threadTs);
  return messages.some(function(message) {
    return textContainsSlackUrl_(message.text, url);
  });
}

function saveLinkedThread(record) {
  var sheet = createSheets().getSheetByName('linked_threads');
  var row = [
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
  ].map(function(value) {
    return stringValue_(value);
  });
  var rowIndex = sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, row.length).setNumberFormat('@');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
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

function saveInvoiceReactionPost_(record) {
  var sheet = createSheets().getSheetByName('invoice_reaction_posts');
  var row = [
    record.processed_at || nowIso_(),
    record.source_channel_name || '',
    record.source_channel_id || '',
    record.source_message_ts || '',
    record.source_url || '',
    record.file_id || '',
    record.file_name || '',
    record.reaction_name || '',
    record.target_channel_name || '',
    record.target_channel_id || '',
    record.posted_ts || '',
    record.posted_text || '',
    String(Boolean(record.dry_run))
  ].map(function(value) {
    return stringValue_(value);
  });
  var rowIndex = sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, row.length).setNumberFormat('@');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function isInvoiceAlreadyPosted_(sourceChannelId, sourceMessageTs, fileId, reactionName) {
  var sheet = createSheets().getSheetByName('invoice_reaction_posts');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }
  var normalizedTs = normalizeSlackTsForCompare_(sourceMessageTs);
  var normalizedReaction = normalizeReactionName_(reactionName);
  var normalizedFileId = stringValue_(fileId);
  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var dryRun = parseBoolean_(row[12]);
    if (dryRun) {
      continue;
    }
    if (
      stringValue_(row[2]) === stringValue_(sourceChannelId) &&
      normalizeSlackTsForCompare_(row[3]) === normalizedTs &&
      stringValue_(row[5]) === normalizedFileId &&
      normalizeReactionName_(row[7]) === normalizedReaction
    ) {
      return true;
    }
  }
  return false;
}

function resolveVinGroups(vin, searchResults) {
  return resolveLinkKeyGroups(makeLinkKey_('vin', vin), searchResults);
}

function resolveLinkKeyGroups(linkKey, searchResults) {
  var settings = getSettings();
  var parentChannelId = getChannelIdByName(settings.parentChannelName);
  var childChannels = settings.childChannelNames.map(function(name) {
    return {
      name: name,
      id: getChannelIdByName(name)
    };
  });

  return resolveLinkKeyGroupsFromChannels_(linkKey, searchResults, parentChannelId, childChannels);
}

function resolveVinGroupsFromChannels_(vin, searchResults, parentChannelId, childChannels) {
  return resolveLinkKeyGroupsFromChannels_(makeLinkKey_('vin', vin), searchResults, parentChannelId, childChannels);
}

function resolveLinkKeyGroupsFromChannels_(linkKey, searchResults, parentChannelId, childChannels) {
  var normalizedKey = normalizeLinkKey_(linkKey);
  var storageKey = linkKeyToStorageValue_(normalizedKey);
  var targetThreads = (searchResults || []).filter(function(thread) {
    return linkKeysContain_(thread.linkKeys || linkKeysFromLegacyVins_(thread.vins), normalizedKey);
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
    vin: storageKey,
    linkKey: normalizedKey,
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
    '車台番号：MH34S-765432',
    '車体番号：ＡＢ １２３'
  ].join('\n');
  var vins = extractVins(text);
  var expected = ['ZVW30-1234567', 'DA17V-987654', 'NHP10-123456', 'MH34S-765432', 'AB123'];
  if (JSON.stringify(vins) !== JSON.stringify(expected)) {
    throw new Error('testExtractVins failed: ' + JSON.stringify(vins));
  }
  Logger.log('testExtractVins OK: ' + JSON.stringify(vins));
}

function testExtractLinkKeys() {
  var text = [
    '車体番号：ＡＢ １２３',
    'スレid： 案 件 ａｂｃ１２３。',
    'スレＩＤ:案件ABC123'
  ].join('\n');
  var keys = extractLinkKeys(text).map(linkKeyToStorageValue_);
  var expected = ['車体番号:AB123', 'スレID:案件ABC123'];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error('testExtractLinkKeys failed: ' + JSON.stringify(keys));
  }
  Logger.log('testExtractLinkKeys OK: ' + JSON.stringify(keys));
}

function testFormatSlackMessagePermalink_() {
  var formatted = formatSlackMessagePermalink_(
    'https://seemore-talk.slack.com/archives/C0APZAXLYGK/p1781197225625679?thread_ts=1781196779.540399&cid=C0APZAXLYGK',
    'C0APZAXLYGK',
    '1781197225.625679'
  );
  assertTest_(
    formatted === 'https://seemore-talk.slack.com/archives/C0APZAXLYGK/p1781197225625679?thread_ts=1781196779.540399&channel=C0APZAXLYGK&message_ts=1781197225.625679',
    'Slack permalink must use channel/message_ts query parameters'
  );
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
  testExtractVins();
  testExtractLinkKeys();
  testFormatSlackMessagePermalink_();
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
    testThread_('CHILD_CARMORE', 'carmore依頼', '300.000001', ['ABC1234'], 'https://slack.test/partial-match'),
    testThread_('PARENT', '依頼_車案件', '400.000001', [], 'https://slack.test/thread-id-parent', ['案件ABC123']),
    testThread_('CHILD_CARMORE', 'carmore依頼', '450.000001', [], 'https://slack.test/thread-id-child', ['案件 abc１２３'])
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

  var threadIdGroups = resolveLinkKeyGroupsFromChannels_(makeLinkKey_('thread_id', '案件ABC123'), threads, parentChannelId, childChannels);
  var threadIdActions = buildLinkActions_(threadIdGroups);
  assertTest_(threadIdGroups.parent.url === 'https://slack.test/thread-id-parent', 'thread ID parent must be selected');
  assertTest_(threadIdActions.length === 1, 'thread ID child to parent action count');
  assertTest_(threadIdActions[0].vin === 'スレID:案件ABC123', 'thread ID storage key');

  Logger.log('testResolveVinGroups OK: ' + JSON.stringify(actionSummary));
  return {
    ok: true,
    actions: actionSummary,
    thread_id_actions: threadIdActions.map(function(action) {
      return {
        relationType: action.relationType,
        sourceUrl: action.source.url,
        targetUrl: action.target.url,
        key: action.vin
      };
    })
  };
}

function testDryRunOnce() {
  return runDryRun();
}

function testThread_(channelId, channelName, createdTs, vins, url, threadIds) {
  var linkKeys = linkKeysFromLegacyVins_(vins);
  (threadIds || []).forEach(function(threadId) {
    linkKeys.push(makeLinkKey_('thread_id', threadId));
  });
  return {
    channelId: channelId,
    channelName: channelName,
    configuredChannelName: channelName,
    threadTs: createdTs,
    createdTs: createdTs,
    lastTs: createdTs,
    vins: (vins || []).map(normalizeVin),
    threadIds: (threadIds || []).map(normalizeLinkValue_),
    linkKeys: linkKeys,
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
    link_keys_found: 0,
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

    var linkKeys = collectLinkKeys_(allThreads);
    if (onlyVin) {
      var onlyKey = makeLinkKey_('vin', onlyVin);
      linkKeys = linkKeys.filter(function(linkKey) {
        return linkKeyToStorageValue_(linkKey) === linkKeyToStorageValue_(onlyKey);
      });
    }
    stats.vins_found = linkKeys.length;
    stats.link_keys_found = linkKeys.length;

    linkKeys.forEach(function(linkKey) {
      try {
        var groups = resolveLinkKeyGroupsFromChannels_(linkKey, allThreads, parentChannel.id, childChannels);
        stats.child_matches_found += groups.childGroups.reduce(function(count, group) {
          return count + group.threads.length;
        }, 0);
        processVinGroup_(groups, dryRun, stats);
      } catch (error) {
        stats.error_count += 1;
        saveError('processLinkKey:' + linkKeyToStorageValue_(linkKey), error);
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
    link_keys_found: stats.link_keys_found,
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

    if (isAlreadyLinked(action.target.channelId, action.target.threadTs, sourceUrl, targetUrl)) {
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
      var linkKeys = extractLinkKeys(text);
      var vins = extractVins(text);
      var threadIds = extractThreadIds(text);
      if (!linkKeys.length) {
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
        threadIds: threadIds,
        linkKeys: linkKeys,
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

function scanVinLabels_(channelRole, lookbackDaysOverride, maxThreadsPerChannel, channelNameFilter) {
  createSheets();
  var settings = getSettings();
  if (!settings.slackBotToken) {
    throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
  }

  var role = channelRole === 'all' ? 'all' : channelRole;
  var channels = getConfiguredChannels_(settings).filter(function(channel) {
    if (channelNameFilter && channel.name !== channelNameFilter) {
      return false;
    }
    return role === 'all' || channel.role === role;
  });
  var lookbackDays = lookbackDaysOverride || settings.lookbackDays;
  var result = {
    checked_at: nowIso_(),
    channel_role: role,
    lookback_days: lookbackDays,
    max_threads_per_channel: maxThreadsPerChannel || '',
    channels: [],
    total_threads_scanned: 0,
    total_label_threads: 0,
    total_vin_threads: 0,
    total_thread_id_threads: 0,
    total_link_key_threads: 0,
    vins: [],
    thread_ids: [],
    link_keys: []
  };
  var seenVins = {};
  var seenThreadIds = {};
  var seenLinkKeys = {};

  channels.forEach(function(channel) {
    var scan = scanChannelVinLabels_(channel, lookbackDays, maxThreadsPerChannel);
    result.channels.push(scan);
    result.total_threads_scanned += scan.threads_scanned;
    result.total_label_threads += scan.label_threads;
    result.total_vin_threads += scan.vin_threads;
    result.total_thread_id_threads += scan.thread_id_threads;
    result.total_link_key_threads += scan.link_key_threads;
    scan.samples.forEach(function(sample) {
      (sample.vins || []).forEach(function(vin) {
        if (!seenVins[vin]) {
          seenVins[vin] = true;
          result.vins.push(vin);
        }
      });
      (sample.thread_ids || []).forEach(function(threadId) {
        if (!seenThreadIds[threadId]) {
          seenThreadIds[threadId] = true;
          result.thread_ids.push(threadId);
        }
      });
      (sample.link_keys || []).forEach(function(linkKey) {
        if (!seenLinkKeys[linkKey]) {
          seenLinkKeys[linkKey] = true;
          result.link_keys.push(linkKey);
        }
      });
    });
  });

  result.vins.sort();
  result.thread_ids.sort();
  result.link_keys.sort();
  return result;
}

function scanChannelVinLabels_(channel, lookbackDays, maxThreads) {
  var cutoffTs = cutoffSlackTs_(lookbackDays);
  var threadTsMap = {};
  collectThreadCandidatesFromHistory_(channel.id, cutoffTs, threadTsMap, maxThreads);

  var summary = {
    channel_name: channel.name,
    channel_id: channel.id,
    role: channel.role,
    threads_scanned: 0,
    label_threads: 0,
    vin_threads: 0,
    thread_id_threads: 0,
    link_key_threads: 0,
    samples: []
  };

  Object.keys(threadTsMap).forEach(function(threadTs) {
    try {
      var messages = getThreadMessages(channel.id, threadTs);
      if (!messages.length) {
        return;
      }
      summary.threads_scanned += 1;
      var text = messages.map(function(message) {
        return stringValue_(message.text);
      }).join('\n');
      var normalizedText = normalizeUnicode_(text);
      var hasLabel = /(?:車体番号|車台番号)\s*:|ス\s*レ\s*ID\s*:/i.test(normalizedText);
      var vins = extractVins(text);
      var threadIds = extractThreadIds(text);
      var linkKeys = extractLinkKeys(text);
      if (hasLabel) {
        summary.label_threads += 1;
      }
      if (vins.length) {
        summary.vin_threads += 1;
      }
      if (threadIds.length) {
        summary.thread_id_threads += 1;
      }
      if (linkKeys.length) {
        summary.link_key_threads += 1;
      }
      if (hasLabel || linkKeys.length) {
        var root = messages[0];
        var lastTs = messages.reduce(function(maxTs, message) {
          return Math.max(maxTs, slackTsNumber_(message.ts));
        }, slackTsNumber_(root.ts));
        summary.samples.push({
          thread_ts: root.thread_ts || root.ts,
          created_ts: root.ts,
          last_ts: String(lastTs),
          has_label: hasLabel,
          vins: vins,
          thread_ids: threadIds,
          link_keys: linkKeys.map(linkKeyToStorageValue_)
        });
      }
    } catch (error) {
      saveError('scanVinLabels:' + channel.name + ':' + threadTs, error);
    }
  });

  return summary;
}

function linkKnownThreads_(sourceChannelName, sourceThreadTs, targetThreadTs, dryRun, confirm) {
  createSheets();
  var settings = getSettings();
  if (!settings.slackBotToken) {
    throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
  }
  if (!sourceChannelName || !sourceThreadTs || !targetThreadTs) {
    throw new Error('source_channel_name、source_thread_ts、target_thread_tsを指定してください。');
  }
  if (!dryRun && confirm !== 'RUN_PRODUCTION') {
    throw new Error('本番投稿にはconfirm=RUN_PRODUCTIONが必要です。');
  }

  var channels = getConfiguredChannels_(settings);
  var parentChannel = channels.filter(function(channel) {
    return channel.role === 'parent';
  })[0];
  var sourceChannel = channels.filter(function(channel) {
    return channel.name === sourceChannelName;
  })[0];
  if (!parentChannel) {
    throw new Error('親チャンネル設定が見つかりません。');
  }
  if (!sourceChannel) {
    throw new Error('source_channel_nameが設定済みチャンネルに一致しません: ' + sourceChannelName);
  }
  if (sourceChannel.role !== 'child') {
    throw new Error('source_channel_nameには子チャンネルを指定してください。');
  }

  var sourceThread = readThreadForLink_(sourceChannel, sourceThreadTs);
  var targetThread = readThreadForLink_(parentChannel, targetThreadTs);
  var sharedLinkKey = findSharedLinkKey_(sourceThread.linkKeys, targetThread.linkKeys);
  if (!sharedLinkKey) {
    throw new Error('指定された2スレッドに共通する車体番号またはスレIDが見つかりません。');
  }

  var stats = {
    started_at: nowIso_(),
    dry_run: Boolean(dryRun),
    parent_threads_checked: 1,
    vins_found: 1,
    child_matches_found: 1,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    expired_skipped_count: 0,
    error_count: 0,
    plannedKeys: {}
  };
  var action = {
    vin: linkKeyToStorageValue_(sharedLinkKey),
    relationType: 'child_to_parent',
    source: sourceThread,
    target: targetThread,
    text: childToParentMessage_(sourceChannel.name, ensureThreadUrl_(sourceThread))
  };
  executeLinkAction_(action, Boolean(dryRun), stats);
  saveRunLog({
    started_at: stats.started_at,
    finished_at: nowIso_(),
    dry_run: dryRun,
    parent_threads_checked: stats.parent_threads_checked,
    vins_found: stats.vins_found,
    child_matches_found: stats.child_matches_found,
    posted_count: stats.posted_count,
    duplicate_skipped_count: stats.duplicate_skipped_count,
    expired_skipped_count: stats.expired_skipped_count,
    error_count: stats.error_count,
    memo: dryRun ? 'targeted dry_run planned_count=' + stats.planned_count : 'targeted production run'
  });
  return stats;
}

function readThreadForLink_(channel, threadTs) {
  var messages = getThreadMessages(channel.id, threadTs);
  if (!messages.length) {
    throw new Error('指定スレッドを取得できませんでした: ' + channel.name + ' ' + threadTs);
  }
  var root = messages[0];
  var text = messages.map(function(message) {
    return stringValue_(message.text);
  }).join('\n');
  var linkKeys = extractLinkKeys(text);
  var vins = extractVins(text);
  var threadIds = extractThreadIds(text);
  if (!linkKeys.length) {
    throw new Error('指定スレッドから車体番号またはスレIDを抽出できませんでした: ' + channel.name + ' ' + threadTs);
  }
  var lastTs = messages.reduce(function(maxTs, message) {
    return Math.max(maxTs, slackTsNumber_(message.ts));
  }, slackTsNumber_(root.ts));
  return {
    channelId: channel.id,
    channelName: channel.name,
    configuredChannelName: channel.name,
    threadTs: root.thread_ts || root.ts,
    createdTs: root.ts,
    lastTs: String(lastTs),
    vins: vins,
    threadIds: threadIds,
    linkKeys: linkKeys,
    url: getPermalink(channel.id, root.thread_ts || root.ts)
  };
}

function findSharedVin_(sourceVins, targetVins) {
  var sharedKey = findSharedLinkKey_(linkKeysFromLegacyVins_(sourceVins), linkKeysFromLegacyVins_(targetVins));
  return sharedKey ? sharedKey.value : '';
}

function findSharedLinkKey_(sourceKeys, targetKeys) {
  var targetMap = {};
  (targetKeys || []).forEach(function(key) {
    targetMap[linkKeyToStorageValue_(key)] = normalizeLinkKey_(key);
  });
  for (var i = 0; i < (sourceKeys || []).length; i += 1) {
    var sourceKey = normalizeLinkKey_(sourceKeys[i]);
    if (targetMap[linkKeyToStorageValue_(sourceKey)]) {
      return sourceKey;
    }
  }
  return null;
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
    DRY_RUN: 'trueなら車案件の紐付けをSlackへ投稿せずdry_run_logsだけ保存します。',
    MAIN_TRIGGER_HOURS: 'scheduledMain()を毎日実行する時刻です。0-23時をカンマ区切りで指定します。例: 3,13,20',
    INVOICE_FORWARD_ENABLED: 'trueならロケットリアクション付きPDF投稿を請求書チャンネルへ転送します。',
    INVOICE_SOURCE_CHANNEL_NAME: 'ロケットリアクション付きPDF投稿を監視するチャンネル名です。',
    INVOICE_TARGET_CHANNEL_NAME: '請求書転送先チャンネル名です。',
    INVOICE_REACTION_NAME: '転送条件にするSlack絵文字名です。:rocket: の場合は rocket と指定します。',
    INVOICE_LOOKBACK_DAYS: '請求書転送で直近何日分の投稿を見るかを指定します。',
    INVOICE_HISTORY_LIMIT: '請求書転送で1回に確認する投稿数です。制限対策のため必要以上に増やさないでください。',
    INVOICE_REPLY_THREAD_LIMIT: '請求書転送で返信を確認するrootスレッド数の上限です。',
    INVOICE_FORWARD_DRY_RUN: 'trueなら請求書転送もSlackへ投稿せず候補数だけ確認します。'
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
  var base = normalizeUnicode_(name).trim();
  var lower = base.toLowerCase();
  var hyphenated = lower.replace(/[ \t　]+/g, '-');
  var compact = lower.replace(/[ \t　_-]+/g, '');
  return [lower, hyphenated, compact].filter(function(value, index, values) {
    return value && values.indexOf(value) === index;
  });
}

function collectVins_(threads) {
  return collectLinkKeys_(threads)
    .filter(function(linkKey) {
      return normalizeLinkKey_(linkKey).type === 'vin';
    })
    .map(function(linkKey) {
      return linkKey.value;
    });
}

function collectLinkKeys_(threads) {
  var seen = {};
  var linkKeys = [];
  (threads || []).forEach(function(thread) {
    (thread.linkKeys || linkKeysFromLegacyVins_(thread.vins)).forEach(function(linkKey) {
      var normalizedKey = normalizeLinkKey_(linkKey);
      var storageKey = linkKeyToStorageValue_(normalizedKey);
      if (storageKey && !seen[storageKey]) {
        seen[storageKey] = true;
        linkKeys.push(normalizedKey);
      }
    });
  });
  return linkKeys.sort(function(a, b) {
    return linkKeyToStorageValue_(a).localeCompare(linkKeyToStorageValue_(b), 'ja');
  });
}

function linkKeysFromLegacyVins_(vins) {
  return (vins || []).map(function(vin) {
    return makeLinkKey_('vin', vin);
  }).filter(function(linkKey) {
    return Boolean(linkKey.value);
  });
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

function normalizeSlackUrl_(url) {
  var value = stringValue_(url).trim();
  value = value.replace(/[<>]/g, '');
  if (value.indexOf('|') !== -1) {
    value = value.split('|')[0];
  }
  return value.replace(/\/+$/, '');
}

function textContainsSlackUrl_(text, url) {
  var value = stringValue_(text);
  var normalizedUrl = normalizeSlackUrl_(url);
  if (!normalizedUrl) {
    return false;
  }
  if (value.indexOf(normalizedUrl) !== -1) {
    return true;
  }
  if (value.indexOf(normalizedUrl.replace(/&/g, '&amp;')) !== -1) {
    return true;
  }
  var withoutProtocol = normalizedUrl.replace(/^https?:\/\//, '');
  return withoutProtocol !== normalizedUrl && value.indexOf(withoutProtocol) !== -1;
}

function normalizeSlackTsForCompare_(ts) {
  var value = stringValue_(ts).trim();
  if (!value) {
    return '';
  }
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    var parts = value.split('.');
    var fraction = parts[1] || '';
    return parts[0] + '.' + (fraction + '000000').slice(0, 6);
  }
  return value;
}

function cutoffSlackTs_(lookbackDays) {
  return String(Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000));
}

function slackTsNumber_(ts) {
  return parseFloat(ts || '0') || 0;
}

function messageHasReaction_(message, reactionName) {
  var expected = normalizeReactionName_(reactionName);
  return (message.reactions || []).some(function(reaction) {
    return normalizeReactionName_(reaction.name) === expected;
  });
}

function addInvoiceMessageSample_(stats, message, reactionName, scope, threadTs) {
  if (!stats.message_samples || stats.message_samples.length >= 10) {
    return;
  }
  stats.message_samples.push(invoiceMessageSample_(message, reactionName, scope, threadTs));
}

function invoiceMessageSample_(message, reactionName, scope, threadTs) {
  var files = message.files || [];
  return {
    scope: scope || 'root',
    ts: message.ts || '',
    thread_ts: message.thread_ts || threadTs || '',
    text_preview: stringValue_(message.text).slice(0, 120),
    reaction_names: (message.reactions || []).map(function(reaction) {
      return normalizeReactionName_(reaction.name);
    }),
    target_reaction_found: messageHasReaction_(message, reactionName),
    file_count: files.length,
    file_names: files.map(invoiceFileName_),
    pdf_file_names: files.filter(isPdfFile_).map(invoiceFileName_)
  };
}

function normalizeReactionName_(value) {
  return normalizeUnicode_(value).replace(/^:+|:+$/g, '').trim().toLowerCase();
}

function findPdfFile_(message) {
  return (message.files || []).filter(isPdfFile_)[0] || null;
}

function isPdfFile_(file) {
  var mimetype = stringValue_(file.mimetype).toLowerCase();
  var filetype = stringValue_(file.filetype).toLowerCase();
  var name = invoiceFileName_(file).toLowerCase();
  return mimetype === 'application/pdf' || filetype === 'pdf' || /\.pdf$/.test(name);
}

function invoiceFileName_(file) {
  return stringValue_(file.name || file.title || file.id || 'file.pdf');
}

function invoiceForwardMessage_(fileName, sourceUrl) {
  return '【' + fileName + ' ' + todayDateString_() + '】\n' + sourceUrl;
}

function todayDateString_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseBoolean_(value) {
  var normalized = stringValue_(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parseTriggerHours_(value) {
  var seen = {};
  var hours = stringValue_(value)
    .split(',')
    .map(function(part) {
      return parseInt(part, 10);
    })
    .filter(function(hour) {
      if (hour < 0 || hour > 23 || seen[hour]) {
        return false;
      }
      seen[hour] = true;
      return true;
    });
  if (hours.length) {
    return hours.sort(function(a, b) {
      return a - b;
    });
  }
  return DEFAULT_SETTINGS.MAIN_TRIGGER_HOURS.split(',').map(function(part) {
    return parseInt(part, 10);
  });
}

function parsePositiveInteger_(value, fallback) {
  var parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
}

function stringValue_(value) {
  return value === null || value === undefined ? '' : String(value);
}

function uniqueValues_(values) {
  var seen = {};
  return (values || []).filter(function(value) {
    var key = stringValue_(value);
    if (!key || seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
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
