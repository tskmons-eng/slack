var APP_NAME = 'SEEMORE Slack車案件リンク管理';
var SPREADSHEET_NAME = 'SEEMORE_Slack車案件リンク管理';
var SPREADSHEET_ID_PROPERTY = 'SEEMORE_SLACK_LINKS_SPREADSHEET_ID';
var SLACK_TOKEN_PROPERTY = 'SLACK_BOT_TOKEN';
var SLACK_EVENT_REQUEST_TOKEN_PROPERTY = 'SLACK_EVENT_REQUEST_TOKEN';
var WEB_ADMIN_TOKEN_PROPERTY = 'WEB_ADMIN_TOKEN';
var SCHEDULED_HANDLER_FUNCTION = 'scheduledMain';
var SCHEDULED_RUN_CONFIRM_TOKEN = 'RUN_SCHEDULED_MAIN';
var SCHEDULED_MAX_RUNTIME_SECONDS = 300;
var SCHEDULED_INVOICE_BUDGET_SECONDS = 150;
var SCHEDULED_REACTION_BUDGET_SECONDS = 45;
var SCHEDULED_VEHICLE_MONITOR_BUDGET_SECONDS = 45;
var SCHEDULED_VEHICLE_LINK_MAX_THREADS_PER_CHANNEL = 20;
var INVOICE_FORWARD_CONFIRM_TOKEN = 'RUN_INVOICE_FORWARD';
var INVOICE_RUNTIME_SAFETY_SECONDS = 120;
var INVOICE_SOURCE_CHANNEL_UPDATE_CONFIRM_TOKEN = 'UPDATE_INVOICE_SOURCE_CHANNELS';
var INVOICE_FORWARD_ROUTE_UPDATE_CONFIRM_TOKEN = 'UPDATE_INVOICE_FORWARD_ROUTE';
var REACTION_FORWARD_CONFIRM_TOKEN = 'RUN_REACTION_FORWARD';
var SCHEDULE_UPDATE_CONFIRM_TOKEN = 'UPDATE_SCHEDULE';
var REACTION_FORWARD_RULE_UPDATE_CONFIRM_TOKEN = 'UPDATE_REACTION_FORWARD_RULE';
var ADMIN_TOKEN_PARAM = 'admin_token';
var SLACK_EVENT_TOKEN_PARAM = 'slack_event_token';
var REACTION_FORWARD_DEFAULT_HISTORY_LIMIT = 100;
var REACTION_FORWARD_DEFAULT_LOOKBACK_DAYS = 30;
var REACTION_FORWARD_MAX_TEXT_LENGTH = 39000;
var REACTION_FORWARD_MAX_BLOCK_COUNT = 50;
var REACTION_FORWARD_MAX_REPLY_COUNT = 20;

var DEFAULT_SETTINGS = {
  SLACK_BOT_TOKEN: '',
  TEAM_DOMAIN: '',
  SLACK_EVENT_VERIFICATION_TOKEN: '',
  SLACK_EVENT_REQUEST_TOKEN: '',
  WEB_ADMIN_TOKEN: '',
  PARENT_CHANNEL_NAME: '依頼_車案件',
  CHILD_CHANNEL_NAMES: 'carmore依頼,オールマシンサービス',
  LOOKBACK_DAYS: '60',
  DRY_RUN: 'true',
  MAIN_TRIGGER_HOURS: '3,10,13,16,20',
  MAIN_TRIGGER_INTERVAL_HOURS: '1',
  INVOICE_FORWARD_ENABLED: 'true',
  INVOICE_SOURCE_CHANNEL_NAME: '依頼＿ALL',
  INVOICE_SOURCE_CHANNEL_NAMES: 'carmore依頼,オールマシンサービス,依頼_all,依頼_車案件,依頼＿小売取引',
  INVOICE_TARGET_CHANNEL_NAME: '依頼＿請求書',
  INVOICE_REACTION_NAME: 'rocket',
  INVOICE_LOOKBACK_DAYS: '30',
  INVOICE_HISTORY_LIMIT: '100',
  INVOICE_HISTORY_PAGE_LIMIT: '3',
  INVOICE_REPLY_THREAD_LIMIT: '25',
  INVOICE_FORCE_RESCAN_HOURS: '1',
  INVOICE_MAX_RUNTIME_SECONDS: '300',
  INVOICE_FORWARD_DRY_RUN: 'false',
  VEHICLE_API_ENABLED: 'false',
  VEHICLE_API_URL: 'https://car.seemore-grp.com/api/v1/integrations/slack/events',
  VEHICLE_API_SECRET: '',
  VEHICLE_CHANNEL_ID: 'C0BGT2E75CJ'
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
  scheduled_run_logs: [
    'started_at',
    'finished_at',
    'elapsed_seconds',
    'completed',
    'deadline_reached',
    'error_count',
    'invoice_posted_count',
    'invoice_deferred_count',
    'reaction_posted_count',
    'vehicle_watch_synced_count',
    'vehicle_link_posted_count',
    'vehicle_link_deadline_reached',
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
  ],
  invoice_forward_routes: [
    'enabled',
    'route_name',
    'reaction_name',
    'target_channel_name'
  ],
  invoice_channel_scan_state: [
    'source_channel_name',
    'source_channel_id',
    'last_checked_at',
    'last_full_scan_at',
    'last_scanned_latest_ts',
    'last_seen_latest_ts',
    'messages_checked',
    'reply_threads_checked',
    'reply_messages_checked',
    'candidates_found',
    'posted_count',
    'planned_count',
    'duplicate_skipped_count',
    'skipped_unchanged',
    'last_error',
    'dry_run',
    'history_pages_scanned',
    'route_signature'
  ],
  reaction_forward_rules: [
    'enabled',
    'rule_name',
    'source_channel_name',
    'reaction_name',
    'target_channel_name',
    'post_mode',
    'include_source_link'
  ],
  reaction_forward_posts: [
    'processed_at',
    'rule_name',
    'source_channel_name',
    'source_channel_id',
    'source_message_ts',
    'source_url',
    'reaction_name',
    'target_channel_name',
    'target_channel_id',
    'posted_ts',
    'posted_text',
    'post_mode',
    'include_source_link',
    'dry_run',
    'source_reply_count',
    'posted_reply_count',
    'reply_error_count'
  ],
  slack_reaction_events: [
    'received_at',
    'event_type',
    'reaction_name',
    'item_type',
    'source_channel_id',
    'source_channel_name',
    'source_message_ts',
    'matching_rule_count',
    'should_check_invoice',
    'invoice_source_allowed',
    'reason',
    'candidates_found',
    'posted_count',
    'planned_count',
    'duplicate_skipped_count',
    'error_count',
    'last_error',
    'matching_invoice_route_count'
  ]
};

var CHANNEL_CACHE = null;
var MANAGED_SHEET_SCHEMA_READY = {};

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
  if (action) {
    requireWebAdmin_(event);
  }

  if (action === 'status') {
    return jsonOutput_(getSetupStatus_());
  }

  if (action === 'scheduled_run') {
    var scheduledRunConfirm = stringValue_(event.parameter.confirm || '');
    return jsonOutput_(runJsonAction_(function() {
      return runScheduledMainNow_(scheduledRunConfirm);
    }));
  }

  if (action === 'set_schedule') {
    var scheduleHours = stringValue_(event.parameter.hours || '');
    var scheduleConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      return updateMainTriggerHours_(scheduleHours, scheduleConfirm);
    });
  }

  if (action === 'set_invoice_source_channels') {
    var invoiceSourceChannelNames = stringValue_(event.parameter.channel_names || '');
    var invoiceSourceChannelConfirm = stringValue_(event.parameter.confirm || '');
    return jsonOutput_(runJsonAction_(function() {
      return updateInvoiceSourceChannels_(invoiceSourceChannelNames, invoiceSourceChannelConfirm);
    }));
  }

  if (action === 'slack') {
    return HtmlService.createHtmlOutput(renderSlackSettingsPage_(null, webAdminTokenFromEvent_(event)));
  }

  if (action === 'test_slack') {
    return runHtmlJsonAction_(function() {
      return {
        auth: testSlackAuth(),
        channels: testFindChannels(),
        joined_channels: listJoinedChannelsForInvoice_()
      };
    });
  }

  if (action === 'joined_channels') {
    return jsonOutput_(runJsonAction_(function() {
      return listJoinedChannelsForInvoice_();
    }));
  }

  if (action === 'diagnostics') {
    return runHtmlJsonAction_(function() {
      return getOperationalDiagnostics_();
    });
  }

  if (action === 'channel_reactions') {
    var reactionChannelName = stringValue_(event.parameter.channel_name || 'アシスタント');
    var reactionMessageLimit = parsePositiveInteger_(event.parameter.limit, 10);
    return jsonOutput_(runJsonAction_(function() {
      return inspectRecentChannelReactions_(reactionChannelName, reactionMessageLimit);
    }));
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
    var invoiceDryRunRouteName = stringValue_(event.parameter.route_name || '');
    return jsonOutput_(runJsonAction_(function() {
      return processInvoiceReactions_(
        true,
        invoiceDryRunLookbackDays || null,
        invoiceDryRunHistoryLimit || null,
        null,
        true,
        null,
        invoiceDryRunRouteName ? [invoiceDryRunRouteName] : null
      );
    }));
  }

  if (action === 'reaction_forward_dryrun') {
    return runHtmlJsonAction_(function() {
      return processReactionForwardRules_(true);
    });
  }

  if (action === 'reaction_forward_run') {
    var reactionForwardConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      if (reactionForwardConfirm !== REACTION_FORWARD_CONFIRM_TOKEN) {
        throw new Error('汎用リアクション転送の手動実行には confirm=' + REACTION_FORWARD_CONFIRM_TOKEN + ' が必要です。');
      }
      return processReactionForwardRules_(false);
    });
  }

  if (action === 'refresh_reaction_forward_posts') {
    var refreshReactionForwardConfirm = stringValue_(event.parameter.confirm || '');
    var refreshReactionForwardLimit = parsePositiveInteger_(event.parameter.limit, 0);
    return jsonOutput_(runJsonAction_(function() {
      return refreshReactionForwardPosts_(refreshReactionForwardConfirm, refreshReactionForwardLimit || null);
    }));
  }

  if (action === 'set_reaction_forward_rule') {
    var reactionRuleConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      if (reactionRuleConfirm !== REACTION_FORWARD_RULE_UPDATE_CONFIRM_TOKEN) {
        throw new Error('reaction_forward_rulesの更新には confirm=' + REACTION_FORWARD_RULE_UPDATE_CONFIRM_TOKEN + ' が必要です。');
      }
      return upsertReactionForwardRuleFromWeb_(event.parameter);
    });
  }

  if (action === 'set_invoice_forward_route') {
    var invoiceForwardRouteConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      if (invoiceForwardRouteConfirm !== INVOICE_FORWARD_ROUTE_UPDATE_CONFIRM_TOKEN) {
        throw new Error('invoice_forward_routes update requires confirm=' + INVOICE_FORWARD_ROUTE_UPDATE_CONFIRM_TOKEN);
      }
      return upsertInvoiceForwardRouteFromWeb_(event.parameter);
    });
  }

  if (action === 'invoice_run') {
    var invoiceRunLookbackDays = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var invoiceRunHistoryLimit = parsePositiveInteger_(event.parameter.history_limit, 0);
    var invoiceRunRouteName = stringValue_(event.parameter.route_name || '');
    var invoiceConfirm = stringValue_(event.parameter.confirm || '');
    return jsonOutput_(runJsonAction_(function() {
      if (invoiceConfirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
        throw new Error('請求書転送の手動本番実行には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
      }
      return processInvoiceReactions_(
        false,
        invoiceRunLookbackDays || null,
        invoiceRunHistoryLimit || null,
        null,
        null,
        null,
        invoiceRunRouteName ? [invoiceRunRouteName] : null
      );
    }));
  }

  if (action === 'invoice_run_channel') {
    var invoiceRunChannelName = stringValue_(event.parameter.channel_name || '');
    var invoiceRunChannelLookbackDays = parsePositiveInteger_(event.parameter.lookback_days, 0);
    var invoiceRunChannelHistoryLimit = parsePositiveInteger_(event.parameter.history_limit, 0);
    var invoiceRunChannelRouteName = stringValue_(event.parameter.route_name || '');
    var invoiceRunChannelConfirm = stringValue_(event.parameter.confirm || '');
    return jsonOutput_(runJsonAction_(function() {
      if (invoiceRunChannelConfirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
        throw new Error('請求書転送の手動本番実行には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
      }
      if (!invoiceRunChannelName) {
        throw new Error('invoice_run_channelにはchannel_nameが必要です。');
      }
      return processInvoiceReactions_(
        false,
        invoiceRunChannelLookbackDays || null,
        invoiceRunChannelHistoryLimit || null,
        [invoiceRunChannelName],
        true,
        null,
        invoiceRunChannelRouteName ? [invoiceRunChannelRouteName] : null
      );
    }));
  }

  if (action === 'invoice_run_message') {
    var invoiceRunMessageChannelName = stringValue_(event.parameter.channel_name || '');
    var invoiceRunMessageTs = stringValue_(event.parameter.message_ts || '');
    var invoiceRunMessageThreadTs = stringValue_(event.parameter.thread_ts || '');
    var invoiceRunMessageRouteName = stringValue_(event.parameter.route_name || '');
    var invoiceRunMessageConfirm = stringValue_(event.parameter.confirm || '');
    return jsonOutput_(runJsonAction_(function() {
      if (invoiceRunMessageConfirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
        throw new Error('請求書転送の手動本番実行には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
      }
      if (!invoiceRunMessageChannelName || !invoiceRunMessageTs) {
        throw new Error('invoice_run_messageにはchannel_nameとmessage_tsが必要です。');
      }
      return processInvoiceMessageByTs_(
        invoiceRunMessageChannelName,
        invoiceRunMessageTs,
        invoiceRunMessageThreadTs || invoiceRunMessageTs,
        invoiceRunMessageRouteName || 'invoice_rocket'
      );
    }));
  }

  if (action === 'refresh_invoice_previews') {
    var refreshConfirm = stringValue_(event.parameter.confirm || '');
    return runHtmlJsonAction_(function() {
      return refreshInvoicePostPreviews_(refreshConfirm);
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
      '<p>Slack Events endpoint is active.</p>'
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

function runJsonAction_(callback) {
  try {
    return {
      ok: true,
      result: callback()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      raw_response: error.rawResponse || ''
    };
  }
}

function requireWebAdmin_(event) {
  var settings = getSettings();
  var expected = stringValue_(settings.webAdminToken).trim();
  if (!expected) {
    throw new Error('WEB_ADMIN_TOKENが未設定です。setup()を実行してsettingsシートに管理トークンを作成してください。');
  }
  if (webAdminTokenFromEvent_(event) !== expected) {
    throw new Error('管理操作には正しい' + ADMIN_TOKEN_PARAM + 'が必要です。');
  }
}

function webAdminTokenFromEvent_(event) {
  return webParam_(event, ADMIN_TOKEN_PARAM);
}

function webParam_(event, name) {
  return stringValue_(event && event.parameter ? event.parameter[name] : '').trim();
}

function doPost(event) {
  var action = event && event.parameter ? event.parameter.action : '';
  if (action === 'save_vehicle_integration') {
    requireWebAdmin_(event);
    return jsonOutput_(saveVehicleIntegrationSettings_(event));
  }
  if (action === 'test_vehicle_integration') {
    requireWebAdmin_(event);
    var vehicleSettings = getSettings();
    return jsonOutput_(sendVehicleEventToCarManagement_({
      type: 'message_observed',
      channel_id: vehicleSettings.vehicleChannelId,
      summary: 'GASから車管理APIへの署名付き疎通確認です。'
    }, 'gas-connectivity-test-' + new Date().getTime(), vehicleSettings));
  }
  if (action === 'vehicle_integration_status') {
    requireWebAdmin_(event);
    var statusSettings = getSettings();
    return jsonOutput_({
      ok: true,
      enabled: statusSettings.vehicleApiEnabled,
      channel_id: statusSettings.vehicleChannelId,
      api_url: statusSettings.vehicleApiUrl,
      secret_fingerprint: bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, statusSettings.vehicleApiSecret))
    });
  }
  if (action === 'sync_vehicle_watches') {
    requireWebAdmin_(event);
    return jsonOutput_(syncVehicleActiveWatches_(getSettings()));
  }
  if (action !== 'save_slack_token') {
    var slackEventPayload = parseSlackEventPayload_(event);
    if (slackEventPayload) {
      if (slackEventPayload.type === 'url_verification') {
        return handleSlackUrlVerification_(event, slackEventPayload);
      }
      return handleSlackEventPayload_(event, slackEventPayload);
    }
    return HtmlService.createHtmlOutput('<p>Unsupported action.</p>');
  }
  requireWebAdmin_(event);

  var token = stringValue_(event.parameter.SLACK_BOT_TOKEN).trim();
  var result = {
    saved: false,
    auth_ok: false,
    channels_ok: false,
    messages: []
  };

  if (!/^xoxb-[A-Za-z0-9-]+$/.test(token)) {
    result.messages.push('SLACK_BOT_TOKENはxoxb-で始まるBot Tokenを入力してください。');
    return HtmlService.createHtmlOutput(renderSlackSettingsPage_(result, webAdminTokenFromEvent_(event)));
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

  return HtmlService.createHtmlOutput(renderSlackSettingsPage_(result, webAdminTokenFromEvent_(event)));
}

function parseSlackEventPayload_(event) {
  var contents = event && event.postData ? stringValue_(event.postData.contents) : '';
  if (!contents || contents.charAt(0) !== '{') {
    return null;
  }
  try {
    return JSON.parse(contents);
  } catch (error) {
    saveError('parseSlackEventPayload', error);
    return null;
  }
}

function handleSlackUrlVerification_(event, payload) {
  try {
    verifySlackEventRequestTokenFast_(event);
    return ContentService.createTextOutput(stringValue_(payload.challenge));
  } catch (error) {
    saveError('handleSlackUrlVerification', error);
    return jsonOutput_({ok: false, error: error.message});
  }
}

function verifySlackEventRequestTokenFast_(event) {
  var expected = stringValue_(PropertiesService.getScriptProperties().getProperty(SLACK_EVENT_REQUEST_TOKEN_PROPERTY)).trim();
  if (!expected) {
    expected = stringValue_(getSettings().slackEventRequestToken).trim();
  }
  if (!expected) {
    throw new Error('SLACK_EVENT_REQUEST_TOKENが未設定です。');
  }
  if (webParam_(event, SLACK_EVENT_TOKEN_PARAM) !== expected) {
    throw new Error('Slack Events request tokenが一致しません。');
  }
}

function handleSlackEventPayload_(event, payload) {
  try {
    var settings = getSettings();
    verifySlackEventRequest_(event, payload, settings);
    if (payload.type === 'url_verification') {
      return ContentService.createTextOutput(stringValue_(payload.challenge));
    }
    if (payload.type !== 'event_callback') {
      return jsonOutput_({ok: true, ignored: true, reason: 'unsupported_payload_type'});
    }
    var slackEvent = payload.event || {};
    if (slackEvent.type === 'message') {
      return jsonOutput_(processVehicleMessageEvent_(slackEvent, settings, payload.event_id || ''));
    }
    return jsonOutput_(processSlackReactionEvent_(slackEvent, settings));
  } catch (error) {
    saveError('handleSlackEventPayload', error);
    return jsonOutput_({ok: false, error: error.message});
  }
}

function saveVehicleIntegrationSettings_(event) {
  var apiUrl = stringValue_(event.parameter.VEHICLE_API_URL).trim();
  var secret = stringValue_(event.parameter.VEHICLE_API_SECRET).trim();
  var channelId = stringValue_(event.parameter.VEHICLE_CHANNEL_ID).trim();
  if (!/^https:\/\/car\.seemore-grp\.com\/api\/v1\/integrations\/slack\/events$/.test(apiUrl)) {
    throw new Error('車管理API URLが不正です。');
  }
  if (!/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('車管理API秘密鍵は64桁の16進数で指定してください。');
  }
  if (!/^C[A-Z0-9]+$/.test(channelId)) {
    throw new Error('車管理SlackチャンネルIDが不正です。');
  }
  var sheet = getManagedSheet_('settings');
  upsertSetting_(sheet, 'VEHICLE_API_URL', apiUrl, settingMemo_('VEHICLE_API_URL'));
  upsertSetting_(sheet, 'VEHICLE_API_SECRET', secret, settingMemo_('VEHICLE_API_SECRET'));
  upsertSetting_(sheet, 'VEHICLE_CHANNEL_ID', channelId, settingMemo_('VEHICLE_CHANNEL_ID'));
  upsertSetting_(sheet, 'VEHICLE_API_ENABLED', 'true', settingMemo_('VEHICLE_API_ENABLED'));
  return {ok: true, enabled: true, channel_id: channelId};
}

function processVehicleMessageEvent_(event, settings, eventId) {
  var result = {ok: true, ignored: true, reason: '', vehicle_integration: true};
  if (!settings.vehicleApiEnabled) {
    result.reason = 'vehicle_api_disabled';
    return result;
  }
  if (event.channel !== settings.vehicleChannelId) {
    result.reason = 'vehicle_channel_mismatch';
    return result;
  }
  if (event.bot_id || event.subtype) {
    result.reason = 'bot_or_subtype_message';
    return result;
  }
  var match = stringValue_(event.text).match(/(?:^|\s)SEEMORE_SHARE_ID[=:]([0-9A-HJKMNP-TV-Z]{26})(?:\s|$)/i);
  if (!match) {
    result.reason = 'share_id_not_found';
    return result;
  }
  var shareId = match[1].toUpperCase();
  var effectiveEventId = stringValue_(eventId).trim() || ['slack', event.channel, event.ts].join(':');
  var threadTs = event.thread_ts || event.ts;
  var permalink = '';
  try {
    permalink = slackApi('chat.getPermalink', {channel: event.channel, message_ts: threadTs}).permalink || '';
  } catch (permalinkError) {
    saveError('processVehicleMessageEvent_:permalink', permalinkError);
  }
  sendVehicleEventToCarManagement_({
    type: 'thread_registered',
    share_id: shareId,
    channel_id: event.channel,
    thread_ts: threadTs,
    permalink: permalink || undefined,
    summary: 'Slackへ共有案件が投稿されました。'
  }, effectiveEventId, settings);
  result.ignored = false;
  result.reason = 'vehicle_event_sent';
  result.share_id = shareId;
  return result;
}

function sendVehicleEventToCarManagement_(payload, eventId, settings) {
  return sendVehicleApiRequest_(settings.vehicleApiUrl, payload, eventId, settings);
}

function sendVehicleApiRequest_(url, payload, eventId, settings) {
  var body = JSON.stringify(payload).replace(/[^\x20-\x7E]/g, function(character) {
    return '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4);
  });
  var timestamp = String(Math.floor(Date.now() / 1000));
  var nonce = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var signatureInput = [timestamp, nonce, eventId, body].join('\n');
  var signatureBytes = Utilities.computeHmacSha256Signature(signatureInput, settings.vehicleApiSecret);
  var signature = bytesToHex_(signatureBytes);
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: Utilities.newBlob(body, 'application/json').getBytes(),
    headers: {
      'X-Seemore-Timestamp': timestamp,
      'X-Seemore-Nonce': nonce,
      'X-Seemore-Event-Id': eventId,
      'X-Seemore-Signature': signature
    },
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('車管理API送信失敗: HTTP ' + status + ' ' + response.getContentText().slice(0, 300));
  }
  return JSON.parse(response.getContentText());
}

function syncVehicleActiveWatches_(settings, runtimeDeadlineMs) {
  var result = {
    ok: true,
    enabled: settings.vehicleApiEnabled,
    watch_count: 0,
    synced: 0,
    acknowledged: 0,
    deferred_count: 0,
    deadline_reached: false
  };
  if (!settings.vehicleApiEnabled) {
    return result;
  }
  var activeUrl = settings.vehicleApiUrl.replace(/\/events$/, '/active-watches');
  var requestId = 'gas-active-watches-' + new Date().getTime();
  var response = sendVehicleApiRequest_(activeUrl, {}, requestId, settings);
  var watches = response.watches || [];
  result.watch_count = watches.length;
  var properties = PropertiesService.getScriptProperties();

  for (var watchIndex = 0; watchIndex < watches.length; watchIndex += 1) {
    if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
      result.deadline_reached = true;
      result.deferred_count = watches.length - watchIndex;
      break;
    }
    var watch = watches[watchIndex];
    if (!watch.thread_ts || !watch.channel_id) {
      continue;
    }
    var messages = getThreadMessages(watch.channel_id, watch.thread_ts, function() {
      return runtimeDeadlineReached_(runtimeDeadlineMs);
    });
    if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
      result.deadline_reached = true;
      result.deferred_count = watches.length - watchIndex;
      break;
    }
    var latest = messages.length ? messages[messages.length - 1] : null;
    var latestTs = latest ? stringValue_(latest.ts) : stringValue_(watch.thread_ts);
    var propertyKey = 'VEHICLE_WATCH_LAST_TS_' + watch.share_id;
    var previousTs = stringValue_(properties.getProperty(propertyKey));
    if (latestTs && latestTs !== previousTs) {
      var candidate = vehicleStatusCandidateFromMessages_(messages);
      sendVehicleEventToCarManagement_({
        type: candidate ? 'status_observed' : 'message_observed',
        share_id: watch.share_id,
        channel_id: watch.channel_id,
        thread_ts: watch.thread_ts,
        message_ts: latestTs,
        status_candidate: candidate || undefined,
        summary: candidate ? 'Slackスレッドから状態候補を検出しました。' : 'Slackスレッドに新しい投稿があります。'
      }, ['vehicle-watch', watch.share_id, latestTs].join(':'), settings);
      properties.setProperty(propertyKey, latestTs);
      result.synced += 1;
    }
    if (watch.state === 'closing') {
      sendVehicleEventToCarManagement_({
        type: 'close_acknowledged',
        share_id: watch.share_id,
        channel_id: watch.channel_id,
        thread_ts: watch.thread_ts
      }, ['vehicle-close-ack', watch.share_id, watch.closing_requested_at || latestTs].join(':'), settings);
      properties.deleteProperty(propertyKey);
      result.acknowledged += 1;
    }
  }
  return result;
}

function vehicleStatusCandidateFromMessages_(messages) {
  for (var i = messages.length - 1; i >= 0; i -= 1) {
    var text = normalizeUnicode_(stringValue_(messages[i].text));
    if (/(?:完了|終了|対応済み|作業済み)/.test(text)) {
      return 'completed';
    }
    if (/(?:停止|保留|部品待ち|確認待ち|進められない)/.test(text)) {
      return 'blocked';
    }
  }
  return '';
}

function bytesToHex_(bytes) {
  return bytes.map(function(value) {
    var unsigned = value < 0 ? value + 256 : value;
    return ('0' + unsigned.toString(16)).slice(-2);
  }).join('');
}

function verifySlackEventRequest_(event, payload, settings) {
  var expectedRequestToken = stringValue_(settings.slackEventRequestToken).trim();
  var expectedVerificationToken = stringValue_(settings.slackEventVerificationToken).trim();
  if (!expectedRequestToken && !expectedVerificationToken) {
    throw new Error('SLACK_EVENT_REQUEST_TOKENまたはSLACK_EVENT_VERIFICATION_TOKENが未設定です。Slack Events APIを使う場合はsettingsシートへ入力してください。');
  }
  if (expectedRequestToken && webParam_(event, SLACK_EVENT_TOKEN_PARAM) !== expectedRequestToken) {
    throw new Error('Slack Events request tokenが一致しません。');
  }
  if (expectedVerificationToken && stringValue_(payload.token) !== expectedVerificationToken) {
    throw new Error('Slack Events verification tokenが一致しません。');
  }
}

function processSlackReactionEvent_(event, settings) {
  var reactionName = normalizeReactionName_(event.reaction);
  var stats = {
    ok: true,
    ignored: false,
    reason: '',
    event_type: event.type || '',
    reaction_name: reactionName,
    item_type: '',
    source_channel_id: '',
    source_channel_name: '',
    source_message_ts: '',
    matching_rule_count: 0,
    matching_invoice_route_count: 0,
    should_check_invoice: false,
    invoice_source_allowed: false,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    empty_message_skipped_count: 0,
    truncated_count: 0,
    blocks_used_count: 0,
    blocks_fallback_count: 0,
    source_reply_count: 0,
    posted_reply_count: 0,
    reply_error_count: 0,
    error_count: 0,
    invoice_forwarding: null,
    reaction_forwarding: null
  };
  if (event.type !== 'reaction_added') {
    stats.ignored = true;
    stats.reason = 'not_reaction_added';
    return finishSlackReactionEvent_(stats);
  }

  var item = event.item || {};
  stats.item_type = item.type || '';
  stats.source_channel_id = item.channel || '';
  stats.source_message_ts = item.ts || '';
  if (item.type !== 'message' || !item.channel || !item.ts) {
    stats.ignored = true;
    stats.reason = 'unsupported_item';
    return finishSlackReactionEvent_(stats);
  }

  var sourceChannel = getChannelById_(item.channel) || {
    id: item.channel,
    name: item.channel,
    is_private: false,
    is_member: true
  };
  stats.source_channel_name = sourceChannel.name || '';

  var matchingReactionRules = findMatchingReactionForwardRules_(reactionName, sourceChannel);
  var matchingInvoiceRoutes = findMatchingInvoiceForwardRoutes_(settings, reactionName);
  var shouldCheckInvoice = matchingInvoiceRoutes.length > 0;
  stats.matching_rule_count = matchingReactionRules.length;
  stats.matching_invoice_route_count = matchingInvoiceRoutes.length;
  stats.should_check_invoice = shouldCheckInvoice;
  var invoiceRouteResolution = {
    contexts: [],
    unresolved: []
  };
  var invoiceSourceAllowed = false;
  if (shouldCheckInvoice) {
    invoiceRouteResolution = resolveInvoiceForwardRouteContexts_(matchingInvoiceRoutes);
    invoiceSourceAllowed = isInvoiceSourceChannelAllowed_(
      settings,
      sourceChannel,
      invoiceRouteResolution.contexts.map(function(context) {
        return context.targetChannel;
      })
    );
  }
  stats.invoice_source_allowed = invoiceSourceAllowed;

  if (shouldCheckInvoice && invoiceSourceAllowed) {
    stats.invoice_forwarding = makeInvoiceEventStats_(reactionName);
    recordUnresolvedInvoiceRoutes_(
      stats.invoice_forwarding,
      matchingInvoiceRoutes,
      invoiceRouteResolution.unresolved,
      'processSlackReactionEvent'
    );
  }

  var hasRunnableInvoiceRoute = invoiceSourceAllowed && invoiceRouteResolution.contexts.length > 0;
  if (!matchingReactionRules.length && !hasRunnableInvoiceRoute) {
    stats.ignored = true;
    stats.reason = shouldCheckInvoice
      ? (invoiceSourceAllowed ? 'invoice_route_target_unresolved' : 'source_channel_not_monitored')
      : 'no_matching_reaction_rule';
    if (stats.invoice_forwarding) {
      mergeInvoiceEventStats_(stats, stats.invoice_forwarding);
    }
    return finishSlackReactionEvent_(stats);
  }

  var message = getMessageFromReactionEvent_(item, reactionName);
  if (!message) {
    throw new Error('reaction_added対象メッセージを取得できませんでした: ' + item.channel + ':' + item.ts);
  }

  if (matchingReactionRules.length) {
    stats.reaction_forwarding = processReactionForwardEvent_(message, sourceChannel, matchingReactionRules, false);
    mergeReactionForwardStats_(stats, stats.reaction_forwarding);
  }

  if (shouldCheckInvoice && invoiceSourceAllowed) {
    if (hasRunnableInvoiceRoute) {
      processInvoiceMessageForRoutes_(
        message,
        sourceChannel,
        invoiceRouteResolution.contexts,
        settings,
        stats.invoice_forwarding,
        false
      );
    }
    mergeInvoiceEventStats_(stats, stats.invoice_forwarding);
  }

  if (!stats.candidates_found && !stats.duplicate_skipped_count && !stats.posted_count) {
    stats.ignored = true;
    stats.reason = 'no_matching_candidate';
  }
  return finishSlackReactionEvent_(stats);
}

function finishSlackReactionEvent_(stats) {
  saveSlackReactionEventLog_(stats);
  return stats;
}

function makeInvoiceEventStats_(reactionName) {
  return {
    reaction_name: reactionName,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    route_results: []
  };
}

function mergeInvoiceEventStats_(target, source) {
  [
    'candidates_found',
    'posted_count',
    'planned_count',
    'duplicate_skipped_count',
    'link_only_count',
    'no_pdf_skipped_count',
    'error_count'
  ].forEach(function(key) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  });
  mergeInvoiceRouteResults_(target, source.route_results);
}

function isInvoiceSourceChannelAllowed_(settings, sourceChannel, targetChannels) {
  var targets = Array.isArray(targetChannels)
    ? targetChannels
    : (targetChannels ? [targetChannels] : []);
  if (targets.some(function(targetChannel) {
    return targetChannel && sourceChannel.id === targetChannel.id;
  })) {
    return false;
  }
  if (settings.invoiceSourceAllJoinedChannels) {
    return true;
  }
  return (settings.invoiceSourceChannelNames || []).some(function(name) {
    return stringValue_(name).trim() === stringValue_(sourceChannel.id) ||
      channelNameMatches_(sourceChannel, name);
  });
}

function getMessageFromReactionEvent_(item, reactionName) {
  var response = slackApi('reactions.get', {
    channel: item.channel,
    timestamp: item.ts,
    full: true
  });
  var message = response.message || null;
  if (!message) {
    return null;
  }
  if (!message.ts) {
    message.ts = item.ts;
  }
  if (!messageHasReaction_(message, reactionName)) {
    message.reactions = message.reactions || [];
    message.reactions.push({name: normalizeReactionName_(reactionName), count: 1});
  }
  return message;
}

function main() {
  var settings = getSettings();
  return runWithMode_(settings.dryRun, null);
}

function scheduledMain() {
  var startedAtMs = Date.now();
  var hardDeadlineMs = startedAtMs + SCHEDULED_MAX_RUNTIME_SECONDS * 1000;
  var result = {
    started_at: nowIso_(),
    finished_at: '',
    elapsed_seconds: 0,
    completed: false,
    deadline_reached: false,
    max_runtime_seconds: SCHEDULED_MAX_RUNTIME_SECONDS,
    phase_order: 'invoice_forwarding,reaction_forwarding,vehicle_monitoring,vehicle_linking',
    vehicle_linking: null,
    vehicle_monitoring: null,
    invoice_forwarding: null,
    reaction_forwarding: null,
    error_count: 0
  };
  var settings = getSettings();
  ensureScheduledMainTrigger_(settings);

  try {
    if (runtimeDeadlineReached_(hardDeadlineMs)) {
      result.invoice_forwarding = scheduledSkippedResult_('global_deadline_reached');
    } else {
      result.invoice_forwarding = processInvoiceReactions_(
        settings.invoiceForwardDryRun,
        null,
        null,
        null,
        null,
        scheduledPhaseDeadline_(hardDeadlineMs, SCHEDULED_INVOICE_BUDGET_SECONDS)
      );
    }
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:invoice_forwarding', error);
  }

  try {
    if (runtimeDeadlineReached_(hardDeadlineMs)) {
      result.reaction_forwarding = scheduledSkippedResult_('global_deadline_reached');
    } else {
      result.reaction_forwarding = processReactionForwardRules_(
        false,
        scheduledPhaseDeadline_(hardDeadlineMs, SCHEDULED_REACTION_BUDGET_SECONDS)
      );
    }
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:reaction_forwarding', error);
  }

  try {
    if (runtimeDeadlineReached_(hardDeadlineMs)) {
      result.vehicle_monitoring = scheduledSkippedResult_('global_deadline_reached');
    } else {
      result.vehicle_monitoring = syncVehicleActiveWatches_(
        settings,
        scheduledPhaseDeadline_(hardDeadlineMs, SCHEDULED_VEHICLE_MONITOR_BUDGET_SECONDS)
      );
    }
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:vehicle_monitoring', error);
  }

  try {
    if (runtimeDeadlineReached_(hardDeadlineMs)) {
      result.vehicle_linking = scheduledSkippedResult_('global_deadline_reached');
    } else {
      result.vehicle_linking = runWithMode_(
        settings.dryRun,
        null,
        settings.lookbackDays,
        SCHEDULED_VEHICLE_LINK_MAX_THREADS_PER_CHANNEL,
        hardDeadlineMs
      );
    }
  } catch (error) {
    result.error_count += 1;
    saveError('scheduledMain:vehicle_linking', error);
  }

  [
    result.invoice_forwarding,
    result.reaction_forwarding,
    result.vehicle_monitoring,
    result.vehicle_linking
  ].forEach(function(phaseResult) {
    result.error_count += scheduledPhaseErrorCount_(phaseResult);
  });
  result.finished_at = nowIso_();
  result.elapsed_seconds = Math.round((Date.now() - startedAtMs) / 1000);
  result.deadline_reached = runtimeDeadlineReached_(hardDeadlineMs) ||
    Boolean(result.invoice_forwarding && result.invoice_forwarding.max_runtime_reached) ||
    Boolean(result.reaction_forwarding && result.reaction_forwarding.deadline_reached) ||
    Boolean(result.vehicle_monitoring && result.vehicle_monitoring.deadline_reached) ||
    Boolean(result.vehicle_linking && result.vehicle_linking.deadline_reached);
  result.completed = true;
  saveScheduledRunLog_(result);
  Logger.log('scheduledMain completed: ' + JSON.stringify(result));
  return result;
}

function runScheduledMainNow_(confirm) {
  if (confirm !== SCHEDULED_RUN_CONFIRM_TOKEN) {
    throw new Error('毎時処理の手動実行には confirm=' + SCHEDULED_RUN_CONFIRM_TOKEN + ' が必要です。');
  }
  return scheduledMain();
}

function scheduledPhaseDeadline_(hardDeadlineMs, budgetSeconds) {
  return Math.min(
    parsePositiveInteger_(hardDeadlineMs, Date.now()),
    Date.now() + parsePositiveInteger_(budgetSeconds, 1) * 1000
  );
}

function runtimeDeadlineReached_(deadlineMs, nowMs) {
  if (!deadlineMs) {
    return false;
  }
  return (nowMs === undefined ? Date.now() : nowMs) >= deadlineMs;
}

function scheduledSkippedResult_(reason) {
  return {
    skipped: true,
    reason: reason || 'runtime_budget_unavailable',
    deadline_reached: true
  };
}

function scheduledPhaseErrorCount_(phaseResult) {
  var parsed = parseInt(phaseResult && phaseResult.error_count, 10);
  return parsed > 0 ? parsed : 0;
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

function runInvoiceDryRunNow() {
  return processInvoiceReactions_(true, null, null);
}

function runReactionForwardDryRunNow() {
  return processReactionForwardRules_(true);
}

function runInvoiceForwardNow(confirm) {
  if (confirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
    throw new Error('請求書転送の手動本番実行には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
  }
  return processInvoiceReactions_(false, null, null);
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
      has_slack_event_verification_token: false,
      has_slack_event_request_token: false,
      has_web_admin_token: false,
      dry_run: '',
      parent_channel_name: '',
      child_channel_names: '',
      lookback_days: '',
      main_trigger_hours: '',
      main_trigger_interval_hours: '',
      invoice_forward_enabled: '',
      invoice_forward_dry_run: '',
      invoice_source_channel_name: '',
      invoice_source_channel_names: '',
      invoice_target_channel_name: '',
      invoice_reaction_name: '',
      invoice_lookback_days: '',
      invoice_history_limit: '',
      invoice_history_page_limit: '',
      invoice_reply_thread_limit: '',
      invoice_force_rescan_hours: '',
      invoice_max_runtime_seconds: ''
    },
    scheduled_handler: SCHEDULED_HANDLER_FUNCTION,
    scheduled_trigger_mode: '',
    scheduled_trigger_count: 0,
    scheduled_trigger_found: false,
    main_daily_trigger_found: false,
    main_trigger_count: 0,
    reaction_forward_rule_count: 0,
    reaction_forward_enabled_rule_count: 0,
    invoice_forward_route_count: 0,
    invoice_forward_enabled_route_count: 0,
    invoice_forward_routes: []
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
      status.settings.has_slack_event_verification_token = Boolean(stringValue_(settings.SLACK_EVENT_VERIFICATION_TOKEN));
      status.settings.has_slack_event_request_token = Boolean(stringValue_(settings.SLACK_EVENT_REQUEST_TOKEN));
      status.settings.has_web_admin_token = Boolean(stringValue_(settings.WEB_ADMIN_TOKEN));
      status.settings.dry_run = stringValue_(settingOrDefault_(settings, 'DRY_RUN'));
      status.settings.parent_channel_name = stringValue_(settingOrDefault_(settings, 'PARENT_CHANNEL_NAME'));
      status.settings.child_channel_names = stringValue_(settingOrDefault_(settings, 'CHILD_CHANNEL_NAMES'));
      status.settings.lookback_days = stringValue_(settingOrDefault_(settings, 'LOOKBACK_DAYS'));
      status.settings.main_trigger_hours = stringValue_(settingOrDefault_(settings, 'MAIN_TRIGGER_HOURS'));
      status.settings.main_trigger_interval_hours = stringValue_(settingOrDefault_(settings, 'MAIN_TRIGGER_INTERVAL_HOURS'));
      status.settings.invoice_forward_enabled = stringValue_(settingOrDefault_(settings, 'INVOICE_FORWARD_ENABLED'));
      status.settings.invoice_forward_dry_run = stringValue_(settingOrDefault_(settings, 'INVOICE_FORWARD_DRY_RUN'));
      status.settings.invoice_source_channel_name = stringValue_(settingOrDefault_(settings, 'INVOICE_SOURCE_CHANNEL_NAME'));
      status.settings.invoice_source_channel_names = stringValue_(settingOrDefault_(settings, 'INVOICE_SOURCE_CHANNEL_NAMES'));
      status.settings.invoice_target_channel_name = stringValue_(settingOrDefault_(settings, 'INVOICE_TARGET_CHANNEL_NAME'));
      status.settings.invoice_reaction_name = stringValue_(settingOrDefault_(settings, 'INVOICE_REACTION_NAME'));
      status.settings.invoice_lookback_days = stringValue_(settingOrDefault_(settings, 'INVOICE_LOOKBACK_DAYS'));
      status.settings.invoice_history_limit = stringValue_(settingOrDefault_(settings, 'INVOICE_HISTORY_LIMIT'));
      status.settings.invoice_history_page_limit = stringValue_(settingOrDefault_(settings, 'INVOICE_HISTORY_PAGE_LIMIT'));
      status.settings.invoice_reply_thread_limit = stringValue_(settingOrDefault_(settings, 'INVOICE_REPLY_THREAD_LIMIT'));
      status.settings.invoice_force_rescan_hours = stringValue_(settingOrDefault_(settings, 'INVOICE_FORCE_RESCAN_HOURS'));
      status.settings.invoice_max_runtime_seconds = stringValue_(settingOrDefault_(settings, 'INVOICE_MAX_RUNTIME_SECONDS'));
    }

    var reactionRulesSheet = spreadsheet.getSheetByName('reaction_forward_rules');
    if (reactionRulesSheet) {
      var reactionRules = readReactionForwardRulesFromValues_(reactionRulesSheet.getDataRange().getValues());
      status.reaction_forward_rule_count = reactionRules.length;
      status.reaction_forward_enabled_rule_count = reactionRules.filter(function(rule) {
        return rule.enabled;
      }).length;
    }

    var invoiceRoutesSheet = spreadsheet.getSheetByName('invoice_forward_routes');
    if (invoiceRoutesSheet) {
      var invoiceRoutes = readInvoiceForwardRoutesFromValues_(invoiceRoutesSheet.getDataRange().getValues());
      status.invoice_forward_route_count = invoiceRoutes.length;
      status.invoice_forward_enabled_route_count = invoiceRoutes.filter(invoiceForwardRouteIsRunnable_).length;
      status.invoice_forward_routes = invoiceRoutes.map(function(route) {
        return {
          enabled: route.enabled,
          route_name: route.routeName,
          reaction_name: route.reactionName,
          target_channel_name: route.targetChannelName,
          row_number: route.rowNumber || '',
          validation_error: route.validationError || ''
        };
      });
    }
  }

  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === SCHEDULED_HANDLER_FUNCTION;
  });
  status.scheduled_trigger_count = triggers.length;
  status.scheduled_trigger_found = triggers.length > 0;
  status.main_trigger_count = triggers.length;
  status.main_daily_trigger_found = triggers.length > 0;
  status.scheduled_trigger_mode = status.settings.main_trigger_interval_hours
    ? 'every_' + status.settings.main_trigger_interval_hours + '_hours'
    : 'daily_hours';

  return status;
}

function getOperationalDiagnostics_() {
  var status = getSetupStatus_();
  var joined = listJoinedChannelsForInvoice_();
  var targetChannelNames = [
    'アシスタント',
    '電話対応',
    status.settings.invoice_target_channel_name,
    '依頼_請求書',
    '依頼＿請求書'
  ].filter(function(name, index, names) {
    return name && names.indexOf(name) === index;
  });
  (joined.target_channels || []).forEach(function(channel) {
    if (channel.name && targetChannelNames.indexOf(channel.name) === -1) {
      targetChannelNames.push(channel.name);
    }
  });
  var channels = joined.channels || [];
  var pickedChannels = channels.filter(function(channel) {
    return targetChannelNames.some(function(name) {
      return channelNameMatches_(channel, name);
    });
  });

  return {
    checked_at: nowIso_(),
    status: {
      spreadsheet_found: status.spreadsheet_found,
      scheduled_trigger_count: status.scheduled_trigger_count,
      scheduled_trigger_mode: status.scheduled_trigger_mode,
      invoice_forward_enabled: status.settings.invoice_forward_enabled,
      invoice_forward_dry_run: status.settings.invoice_forward_dry_run,
      invoice_source_channel_names: status.settings.invoice_source_channel_names,
      invoice_target_channel_name: status.settings.invoice_target_channel_name,
      invoice_reaction_name: status.settings.invoice_reaction_name,
      invoice_forward_route_count: status.invoice_forward_route_count,
      invoice_forward_enabled_route_count: status.invoice_forward_enabled_route_count,
      reaction_forward_rule_count: status.reaction_forward_rule_count,
      reaction_forward_enabled_rule_count: status.reaction_forward_enabled_rule_count
    },
    joined_channel_count: joined.joined_count,
    invoice_source_count: joined.invoice_source_count,
    unresolved_sources: joined.unresolved_sources,
    unresolved_target_routes: joined.unresolved_target_routes,
    invoice_forward_routes: joined.invoice_forward_routes,
    invalid_invoice_forward_routes: joined.invalid_invoice_forward_routes,
    target_channels: joined.target_channels,
    picked_channels: pickedChannels.map(function(channel) {
      return {
        name: channel.name,
        id: channel.id,
        is_private: Boolean(channel.is_private),
        is_member: Boolean(channel.is_member)
      };
    }),
    reaction_forward_rules: readReactionForwardRules_().map(function(rule) {
      return {
        enabled: rule.enabled,
        rule_name: rule.ruleName,
        source_channel_name: rule.sourceChannelName,
        reaction_name: rule.reactionName,
        target_channel_name: rule.targetChannelName,
        post_mode: rule.postMode,
        include_source_link: rule.includeSourceLink
      };
    }),
    recent_reaction_events: readRecentSheetObjects_('slack_reaction_events', 20),
    recent_errors: readRecentSheetObjects_('errors', 10),
    recent_reaction_forward_posts: readRecentSheetObjects_('reaction_forward_posts', 10),
    invoice_channel_scan_state: readSheetObjects_('invoice_channel_scan_state').slice(-20)
  };
}

function readRecentSheetObjects_(sheetName, limit) {
  var rows = readSheetObjects_(sheetName);
  return rows.slice(Math.max(0, rows.length - limit));
}

function readSheetObjects_(sheetName) {
  var spreadsheet = createSheets();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
    return stringValue_(header);
  });
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return values.map(function(row) {
    var record = {};
    headers.forEach(function(header, index) {
      if (header) {
        record[header] = row[index];
      }
    });
    return record;
  });
}

function inspectRecentChannelReactions_(channelName, limit) {
  var safeLimit = Math.max(1, Math.min(parsePositiveInteger_(limit, 10), 20));
  var channel = getChannelByName_(channelName || 'アシスタント');
  var response = slackApi('conversations.history', {
    channel: channel.id,
    limit: safeLimit
  });
  var rootMessages = response.messages || [];
  var results = [];

  rootMessages.forEach(function(message) {
    results.push(reactionInspectionRecord_(channel, message, 'message', ''));
    if (message.reply_count) {
      try {
        var replies = getThreadMessages(channel.id, message.ts).slice(1, 11);
        replies.forEach(function(reply) {
          results.push(reactionInspectionRecord_(channel, reply, 'reply', message.ts));
        });
      } catch (error) {
        results.push({
          kind: 'reply_error',
          channel_name: channel.name,
          channel_id: channel.id,
          thread_ts: message.ts,
          error: error && error.message ? error.message : String(error)
        });
      }
    }
  });

  return {
    checked_at: nowIso_(),
    channel_name: channel.name,
    channel_id: channel.id,
    message_limit: safeLimit,
    records: results
  };
}

function reactionInspectionRecord_(channel, message, kind, threadTs) {
  var reactions = (message.reactions || []).map(function(reaction) {
    return {
      name: normalizeReactionName_(reaction.name),
      raw_name: reaction.name || '',
      count: reaction.count || 0,
      me: Boolean(reaction.me)
    };
  });
  return {
    kind: kind,
    channel_name: channel.name,
    channel_id: channel.id,
    ts: message.ts || '',
    thread_ts: threadTs || message.thread_ts || '',
    user: message.user || message.bot_id || message.username || '',
    subtype: message.subtype || '',
    reply_count: message.reply_count || 0,
    reaction_names: reactions.map(function(reaction) { return reaction.name; }),
    reactions: reactions,
    text_preview: normalizeCopiedSlackText_(message.text || '').slice(0, 120)
  };
}

function renderSlackSettingsPage_(result, adminToken) {
  var actionUrl = ScriptApp.getService().getUrl();
  var status = getSetupStatus_();
  var messages = result && result.messages ? result.messages : [];
  var statusText = [
    'Spreadsheet: ' + (status.spreadsheet_found ? 'OK' : 'NG'),
    'SLACK_BOT_TOKEN: ' + (status.settings.has_slack_bot_token ? 'saved' : 'empty'),
    'DRY_RUN: ' + status.settings.dry_run,
    'Trigger: ' + (status.scheduled_trigger_found ? 'OK' : 'NG') + ' / ' + status.scheduled_trigger_mode,
    'Invoice sources: ' + status.settings.invoice_source_channel_names,
    'Reaction forward enabled rules: ' + status.reaction_forward_enabled_rule_count
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
    '<input type="hidden" name="' + escapeHtml_(ADMIN_TOKEN_PARAM) + '" value="' + escapeHtml_(adminToken || '') + '">',
    '<p><input type="password" name="SLACK_BOT_TOKEN" placeholder="xoxb-..." style="width: 420px;"></p>',
    '<p><button type="submit">保存してSlack疎通確認</button></p>',
    '</form>',
    '<h2>現在状態</h2>',
    '<pre>' + escapeHtml_(statusText) + '</pre>',
    '<p><a href="' + escapeHtml_(actionUrl) + '?action=status&amp;' + escapeHtml_(ADMIN_TOKEN_PARAM) + '=' + encodeURIComponent(adminToken || '') + '" target="_blank">JSON状態確認</a></p>'
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
  var settingsSheet = spreadsheet.getSheetByName('settings');
  seedDefaultSettings_(settingsSheet);
  upgradeInvoiceSafetySettings_(settingsSheet);
  seedInvoiceForwardRoutes_(spreadsheet.getSheetByName('invoice_forward_routes'), settingsSheet);
  seedReactionForwardRuleTemplate_(spreadsheet.getSheetByName('reaction_forward_rules'));
  ensureGeneratedSecretSetting_(settingsSheet, 'SLACK_EVENT_REQUEST_TOKEN', 'slackevt_');
  ensureGeneratedSecretSetting_(settingsSheet, 'WEB_ADMIN_TOKEN', 'admin_');
  return spreadsheet;
}

function createDailyTrigger() {
  deleteTriggers();
  var settings = getSettings();
  if (settings.mainTriggerIntervalHours) {
    ScriptApp.newTrigger(SCHEDULED_HANDLER_FUNCTION)
      .timeBased()
      .everyHours(settings.mainTriggerIntervalHours)
      .create();
    Logger.log(SCHEDULED_HANDLER_FUNCTION + '()の' + settings.mainTriggerIntervalHours + '時間ごとトリガーを作成しました。');
    return;
  }

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

function updateMainTriggerHours_(hoursValue, confirm) {
  if (confirm !== SCHEDULE_UPDATE_CONFIRM_TOKEN) {
    throw new Error('スケジュール更新には confirm=' + SCHEDULE_UPDATE_CONFIRM_TOKEN + ' が必要です。');
  }

  var hours = parseTriggerHoursStrict_(hoursValue);
  var spreadsheet = createSheets();
  var settingsSheet = spreadsheet.getSheetByName('settings');
  upsertSetting_(settingsSheet, 'MAIN_TRIGGER_HOURS', hours.join(','), settingMemo_('MAIN_TRIGGER_HOURS'));
  upsertSetting_(settingsSheet, 'MAIN_TRIGGER_INTERVAL_HOURS', '', settingMemo_('MAIN_TRIGGER_INTERVAL_HOURS'));
  createDailyTrigger();

  var status = getSetupStatus_();
  status.updated_main_trigger_hours = hours.join(',');
  return status;
}

function updateInvoiceSourceChannels_(channelNamesValue, confirm) {
  if (confirm !== INVOICE_SOURCE_CHANNEL_UPDATE_CONFIRM_TOKEN) {
    throw new Error('依頼リアクション監視元の更新には confirm=' + INVOICE_SOURCE_CHANNEL_UPDATE_CONFIRM_TOKEN + ' が必要です。');
  }

  var names = parseCommaSeparatedSetting_(channelNamesValue);
  if (!names.length) {
    throw new Error('依頼リアクション監視元のchannel_namesを1件以上指定してください。');
  }
  if (names.some(function(name) {
    var normalized = normalizeUnicode_(name).trim().toLowerCase();
    return normalized === '*' || normalized === 'all' || normalized === 'all_joined';
  })) {
    throw new Error('依頼リアクション監視元は明示的なチャンネル名で指定してください。');
  }

  var settings = getSettings();
  var routeResolution = resolveInvoiceForwardRouteContexts_(selectInvoiceForwardRoutes_(settings));
  if (routeResolution.unresolved.length) {
    throw new Error(routeResolution.unresolved[0].error);
  }
  var targetChannels = routeResolution.contexts.map(function(context) {
    return context.targetChannel;
  });
  var sourceChannels = names.map(function(name) {
    var channel = getChannelByName_(name);
    if (channel.is_member === false) {
      throw new Error('Botが参加していないチャンネルです: ' + name);
    }
    if (targetChannels.some(function(targetChannel) {
      return channel.id === targetChannel.id;
    })) {
      throw new Error('依頼リアクションの転送先は監視元にできません: ' + name);
    }
    return channel;
  });

  var spreadsheet = createSheets();
  var settingsSheet = spreadsheet.getSheetByName('settings');
  upsertSetting_(
    settingsSheet,
    'INVOICE_SOURCE_CHANNEL_NAMES',
    names.join(','),
    settingMemo_('INVOICE_SOURCE_CHANNEL_NAMES')
  );

  return {
    updated_invoice_source_channel_names: names.join(','),
    source_channel_count: sourceChannels.length,
    target_channel_name: settings.invoiceTargetChannelName,
    target_channel_names: targetChannels.map(function(channel) {
      return channel.name;
    }).join(',')
  };
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main' || trigger.getHandlerFunction() === SCHEDULED_HANDLER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function ensureScheduledMainTrigger_(settings) {
  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === SCHEDULED_HANDLER_FUNCTION;
  });
  var expectedCount = settings.mainTriggerIntervalHours ? 1 : settings.mainTriggerHours.length;
  if (triggers.length !== expectedCount) {
    createDailyTrigger();
  }
}

function getSettings() {
  var sheet = getManagedSheet_('settings');
  var raw = readSettingsMap_(sheet);
  var properties = PropertiesService.getScriptProperties();
  var tokenFromSheet = stringValue_(raw.SLACK_BOT_TOKEN);
  var tokenFromProperties = stringValue_(properties.getProperty(SLACK_TOKEN_PROPERTY));
  var token = tokenFromSheet || tokenFromProperties;

  if (tokenFromSheet) {
    properties.setProperty(SLACK_TOKEN_PROPERTY, tokenFromSheet);
  }
  var slackEventRequestTokenFromSheet = stringValue_(settingOrDefault_(raw, 'SLACK_EVENT_REQUEST_TOKEN'));
  var slackEventRequestTokenFromProperties = stringValue_(properties.getProperty(SLACK_EVENT_REQUEST_TOKEN_PROPERTY));
  var slackEventRequestToken = slackEventRequestTokenFromSheet || slackEventRequestTokenFromProperties;
  if (slackEventRequestTokenFromSheet) {
    properties.setProperty(SLACK_EVENT_REQUEST_TOKEN_PROPERTY, slackEventRequestTokenFromSheet);
  }
  var webAdminTokenFromSheet = stringValue_(settingOrDefault_(raw, 'WEB_ADMIN_TOKEN'));
  var webAdminTokenFromProperties = stringValue_(properties.getProperty(WEB_ADMIN_TOKEN_PROPERTY));
  var webAdminToken = webAdminTokenFromSheet || webAdminTokenFromProperties;
  if (webAdminTokenFromSheet) {
    properties.setProperty(WEB_ADMIN_TOKEN_PROPERTY, webAdminTokenFromSheet);
  }

  var childChannelNames = parseCommaSeparatedSetting_(settingOrDefault_(raw, 'CHILD_CHANNEL_NAMES'));
  var invoiceSourceChannelNames = parseInvoiceSourceChannelNames_(raw);

  return {
    slackBotToken: token,
    teamDomain: stringValue_(settingOrDefault_(raw, 'TEAM_DOMAIN')),
    slackEventVerificationToken: stringValue_(settingOrDefault_(raw, 'SLACK_EVENT_VERIFICATION_TOKEN')),
    slackEventRequestToken: slackEventRequestToken,
    webAdminToken: webAdminToken,
    parentChannelName: stringValue_(settingOrDefault_(raw, 'PARENT_CHANNEL_NAME')),
    childChannelNames: childChannelNames,
    lookbackDays: parsePositiveInteger_(settingOrDefault_(raw, 'LOOKBACK_DAYS'), 60),
    dryRun: parseBoolean_(settingOrDefault_(raw, 'DRY_RUN')),
    mainTriggerHours: parseTriggerHours_(settingOrDefault_(raw, 'MAIN_TRIGGER_HOURS')),
    mainTriggerIntervalHours: parseTriggerIntervalHours_(settingOrDefault_(raw, 'MAIN_TRIGGER_INTERVAL_HOURS')),
    invoiceForwardEnabled: parseBoolean_(settingOrDefault_(raw, 'INVOICE_FORWARD_ENABLED')),
    invoiceSourceChannelName: stringValue_(settingOrDefault_(raw, 'INVOICE_SOURCE_CHANNEL_NAME')),
    invoiceSourceChannelNames: invoiceSourceChannelNames,
    invoiceSourceAllJoinedChannels: invoiceSourceChannelNames.some(function(name) {
      var normalized = normalizeUnicode_(name).trim().toLowerCase();
      return normalized === '*' || normalized === 'all' || normalized === 'all_joined';
    }),
    invoiceTargetChannelName: stringValue_(settingOrDefault_(raw, 'INVOICE_TARGET_CHANNEL_NAME')),
    invoiceReactionName: normalizeReactionName_(settingOrDefault_(raw, 'INVOICE_REACTION_NAME')),
    invoiceLookbackDays: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_LOOKBACK_DAYS'), 30),
    invoiceHistoryLimit: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_HISTORY_LIMIT'), 100),
    invoiceHistoryPageLimit: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_HISTORY_PAGE_LIMIT'), 3),
    invoiceReplyThreadLimit: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_REPLY_THREAD_LIMIT'), 25),
    invoiceForceRescanHours: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_FORCE_RESCAN_HOURS'), 1),
    invoiceMaxRuntimeSeconds: parsePositiveInteger_(settingOrDefault_(raw, 'INVOICE_MAX_RUNTIME_SECONDS'), 300),
    invoiceForwardDryRun: parseBoolean_(settingOrDefault_(raw, 'INVOICE_FORWARD_DRY_RUN')),
    vehicleApiEnabled: parseBoolean_(settingOrDefault_(raw, 'VEHICLE_API_ENABLED')),
    vehicleApiUrl: stringValue_(settingOrDefault_(raw, 'VEHICLE_API_URL')).trim(),
    vehicleApiSecret: stringValue_(settingOrDefault_(raw, 'VEHICLE_API_SECRET')).trim(),
    vehicleChannelId: stringValue_(settingOrDefault_(raw, 'VEHICLE_CHANNEL_ID')).trim()
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
    } else if (existing[key] !== undefined && (existing[key] !== '' || settingAllowsBlank_(key))) {
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

function ensureGeneratedSecretSetting_(sheet, key, prefix) {
  var settings = readSettingsMap_(sheet);
  if (stringValue_(settings[key]).trim()) {
    syncSecretSettingToProperty_(key, settings[key]);
    return;
  }
  var generated = prefix + generateSecretToken_();
  upsertSetting_(sheet, key, generated, settingMemo_(key));
  syncSecretSettingToProperty_(key, generated);
}

function generateSecretToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function syncSecretSettingToProperty_(key, value) {
  var propertyName = '';
  if (key === 'SLACK_EVENT_REQUEST_TOKEN') {
    propertyName = SLACK_EVENT_REQUEST_TOKEN_PROPERTY;
  } else if (key === 'WEB_ADMIN_TOKEN') {
    propertyName = WEB_ADMIN_TOKEN_PROPERTY;
  }
  if (propertyName && stringValue_(value).trim()) {
    PropertiesService.getScriptProperties().setProperty(propertyName, stringValue_(value).trim());
  }
}

function saveSlackBotToken_(token) {
  var spreadsheet = createSheets();
  var sheet = spreadsheet.getSheetByName('settings');
  upsertSetting_(sheet, 'SLACK_BOT_TOKEN', token, settingMemo_('SLACK_BOT_TOKEN'));
  PropertiesService.getScriptProperties().setProperty(SLACK_TOKEN_PROPERTY, token);
}

function slackApi(method, payload) {
  var token = stringValue_(PropertiesService.getScriptProperties().getProperty(SLACK_TOKEN_PROPERTY));
  if (!token) {
    token = getSettings().slackBotToken;
  }
  if (!token) {
    throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
  }
  return slackApiWithToken_(token, method, payload || {});
}

function getChannelIdByName(name) {
  return getChannelByName_(name).id;
}

function getRecentThreads(channelId, lookbackDays) {
  return getRecentThreadsWithStats_(channelId, lookbackDays).threads;
}

function getThreadMessages(channelId, threadTs, shouldStop) {
  var messages = [];
  var cursor = '';
  do {
    if (shouldStop && shouldStop()) {
      break;
    }
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

function postThreadMessage(channelId, threadTs, text, attachments, blocks) {
  var payload = {
    channel: channelId,
    thread_ts: threadTs,
    text: text,
    unfurl_links: true,
    unfurl_media: true
  };
  if (attachments && attachments.length) {
    payload.attachments = attachments;
  }
  if (blocks && blocks.length) {
    payload.blocks = blocks;
  }
  return slackApi('chat.postMessage', payload);
}

function postChannelMessage(channelId, text, attachments, blocks) {
  var payload = {
    channel: channelId,
    text: text,
    unfurl_links: true,
    unfurl_media: true
  };
  if (attachments && attachments.length) {
    payload.attachments = attachments;
  }
  if (blocks && blocks.length) {
    payload.blocks = blocks;
  }
  return slackApi('chat.postMessage', payload);
}

function updateChannelMessage(channelId, messageTs, text, attachments, blocks) {
  var payload = {
    channel: channelId,
    ts: messageTs,
    text: text,
    unfurl_links: true,
    unfurl_media: true
  };
  if (attachments && attachments.length) {
    payload.attachments = attachments;
  }
  if (blocks && blocks.length) {
    payload.blocks = blocks;
  }
  return slackApi('chat.update', payload);
}

function postReactionForwardPayload_(channelId, postPayload, context) {
  return sendReactionForwardPayloadWithFallback_(
    postPayload,
    context,
    function(blocks) {
      return postChannelMessage(channelId, postPayload.text, null, blocks);
    },
    function() {
      return postChannelMessage(channelId, postPayload.text);
    }
  );
}

function postReactionForwardThreadPayload_(channelId, threadTs, postPayload, context) {
  return sendReactionForwardPayloadWithFallback_(
    postPayload,
    context,
    function(blocks) {
      return postThreadMessage(channelId, threadTs, postPayload.text, null, blocks);
    },
    function() {
      return postThreadMessage(channelId, threadTs, postPayload.text);
    }
  );
}

function updateReactionForwardPayload_(channelId, messageTs, postPayload, context) {
  return sendReactionForwardPayloadWithFallback_(
    postPayload,
    context,
    function(blocks) {
      return updateChannelMessage(channelId, messageTs, postPayload.text, null, blocks);
    },
    function() {
      return updateChannelMessage(channelId, messageTs, postPayload.text);
    }
  );
}

function sendReactionForwardPayloadWithFallback_(postPayload, context, sendWithBlocks, sendTextOnly, saveErrorFn) {
  var errorSaver = saveErrorFn || saveError;
  if (postPayload.blocks && postPayload.blocks.length) {
    try {
      var responseWithBlocks = sendWithBlocks(postPayload.blocks);
      responseWithBlocks.reaction_forward_used_blocks = true;
      responseWithBlocks.reaction_forward_blocks_fallback = false;
      return responseWithBlocks;
    } catch (error) {
      if (!isSlackBlocksError_(error)) {
        throw error;
      }
      errorSaver(context + ':blocks_fallback', error);
      var fallbackResponse = sendTextOnly();
      fallbackResponse.reaction_forward_used_blocks = false;
      fallbackResponse.reaction_forward_blocks_fallback = true;
      return fallbackResponse;
    }
  }

  var response = sendTextOnly();
  response.reaction_forward_used_blocks = false;
  response.reaction_forward_blocks_fallback = false;
  return response;
}

function isSlackBlocksError_(error) {
  var detail = [
    error && error.message ? error.message : '',
    error && error.rawResponse ? error.rawResponse : ''
  ].join(' ');
  return /invalid_blocks|msg_blocks_too_long|block_kit/.test(detail);
}

function isSlackMessageNotFoundError_(error) {
  var detail = [
    error && error.message ? error.message : '',
    error && error.rawResponse ? error.rawResponse : ''
  ].join(' ');
  return /message_not_found/.test(detail);
}

function processInvoiceReactions_(dryRunOverride, lookbackDaysOverride, historyLimitOverride, sourceChannelNamesOverride, forceRescanOverride, runtimeDeadlineMs, routeNamesOverride) {
  var startedAt = nowIso_();
  var startedAtMs = Date.now();
  var stats = {
    started_at: startedAt,
    dry_run: Boolean(dryRunOverride),
    enabled: false,
    source_channel_name: '',
    source_channel_names: '',
    source_channel_id: '',
    source_channel_ids: '',
    source_channel_count: 0,
    configured_source_count: 0,
    unresolved_source_count: 0,
    unresolved_sources: [],
    target_channel_name: '',
    target_channel_id: '',
    reaction_name: '',
    enabled_route_count: 0,
    selected_route_count: 0,
    route_names: '',
    requested_route_names: '',
    route_signature: '',
    unresolved_route_count: 0,
    unresolved_routes: [],
    lookback_days: 0,
    history_limit: 0,
    history_page_limit: 0,
    reply_thread_limit: 0,
    force_rescan_hours: 0,
    max_runtime_seconds: 0,
    runtime_guard_seconds: 0,
    requested_source_channel_names: '',
    force_rescan_override: Boolean(forceRescanOverride),
    max_runtime_reached: false,
    channels_deferred: 0,
    channels_checked: 0,
    channels_scanned: 0,
    channels_skipped_unchanged: 0,
    messages_checked: 0,
    history_pages_scanned: 0,
    reply_threads_checked: 0,
    reply_messages_checked: 0,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    history_next_cursor_found: false,
    message_samples: [],
    channel_results: [],
    route_results: []
  };

  try {
    var settings = getSettings();
    stats.enabled = Boolean(settings.invoiceForwardEnabled);
    stats.lookback_days = lookbackDaysOverride || settings.invoiceLookbackDays;
    stats.history_limit = Math.min(historyLimitOverride || settings.invoiceHistoryLimit, 200);
    stats.history_page_limit = settings.invoiceHistoryPageLimit;
    stats.reply_thread_limit = settings.invoiceReplyThreadLimit;
    stats.force_rescan_hours = settings.invoiceForceRescanHours;
    stats.max_runtime_seconds = settings.invoiceMaxRuntimeSeconds;
    stats.runtime_guard_seconds = invoiceRuntimeGuardSeconds_(settings.invoiceMaxRuntimeSeconds);

    if (!settings.invoiceForwardEnabled) {
      return stats;
    }
    if (!settings.slackBotToken) {
      throw new Error('SLACK_BOT_TOKENが未設定です。settingsシートへBot Tokenを入力してください。');
    }

    var allRoutes = selectInvoiceForwardRoutes_(settings);
    var selectedRoutes = selectInvoiceForwardRoutes_(settings, routeNamesOverride);
    stats.enabled_route_count = allRoutes.length;
    stats.selected_route_count = selectedRoutes.length;
    stats.route_names = selectedRoutes.map(function(route) {
      return route.routeName;
    }).join(',');
    stats.requested_route_names = (routeNamesOverride || []).join(',');
    stats.reaction_name = selectedRoutes.map(function(route) {
      return route.reactionName;
    }).join(',');

    var routeResolution = resolveInvoiceForwardRouteContexts_(selectedRoutes);
    var routeContexts = routeResolution.contexts;
    stats.route_signature = invoiceForwardRouteSignature_(routeContexts.map(function(context) {
      return context.route;
    }));
    stats.unresolved_routes = routeResolution.unresolved;
    stats.unresolved_route_count = routeResolution.unresolved.length;
    routeContexts.forEach(function(context) {
      ensureInvoiceRouteStats_(stats, context.route, context.targetChannel);
    });
    recordUnresolvedInvoiceRoutes_(
      stats,
      selectedRoutes,
      routeResolution.unresolved,
      'processInvoiceReactions'
    );
    stats.target_channel_name = routeContexts.map(function(context) {
      return context.targetChannel.name;
    }).join(',');
    stats.target_channel_id = routeContexts.map(function(context) {
      return context.targetChannel.id;
    }).join(',');
    if (!routeContexts.length) {
      return stats;
    }

    var targetChannels = routeContexts.map(function(context) {
      return context.targetChannel;
    });
    var sourceResolution = resolveInvoiceSourceChannelsWithDiagnostics_(settings, targetChannels);
    var sourceChannels = sourceResolution.channels;
    stats.configured_source_count = settings.invoiceSourceAllJoinedChannels
      ? sourceChannels.length
      : settings.invoiceSourceChannelNames.length;
    stats.unresolved_sources = sourceResolution.unresolved;
    stats.unresolved_source_count = sourceResolution.unresolved.length;
    sourceResolution.unresolved.forEach(function(unresolvedSource) {
      stats.error_count += 1;
      saveError(
        'processInvoiceReactions:source:' + unresolvedSource.configured_name,
        new Error(unresolvedSource.reason)
      );
    });
    var requestedSourceChannelNames = (sourceChannelNamesOverride || []).filter(function(name) {
      return stringValue_(name).trim() !== '';
    });
    if (requestedSourceChannelNames.length) {
      sourceChannels = filterInvoiceSourceChannels_(sourceChannels, requestedSourceChannelNames);
      stats.requested_source_channel_names = requestedSourceChannelNames.join(',');
    }
    stats.source_channel_count = sourceChannels.length;
    stats.source_channel_names = sourceChannels.map(function(channel) {
      return channel.name;
    }).join(',');
    stats.source_channel_ids = sourceChannels.map(function(channel) {
      return channel.id;
    }).join(',');
    stats.source_channel_name = stats.source_channel_names;
    stats.source_channel_id = stats.source_channel_ids;

    var stateByChannelId = readInvoiceChannelScanState_();
    sourceChannels = sortInvoiceSourceChannelsForRun_(sourceChannels, stateByChannelId);
    for (var sourceIndex = 0; sourceIndex < sourceChannels.length; sourceIndex += 1) {
      if (shouldStopInvoiceRun_(startedAtMs, settings.invoiceMaxRuntimeSeconds, runtimeDeadlineMs)) {
        stats.max_runtime_reached = true;
        stats.channels_deferred = sourceChannels.length - sourceIndex;
        break;
      }
      var sourceChannel = sourceChannels[sourceIndex];
      var channelStats = makeInvoiceChannelStats_(sourceChannel, stats);
      stats.channel_results.push(channelStats);
      try {
        processInvoiceChannelReactions_(
          sourceChannel,
          routeContexts,
          settings,
          channelStats,
          dryRunOverride,
          stats.lookback_days,
          stats.history_limit,
          stats.history_page_limit,
          stateByChannelId[sourceChannel.id] || null,
          startedAtMs,
          forceRescanOverride,
          runtimeDeadlineMs,
          stats.route_signature
        );
      } catch (error) {
        channelStats.error_count += 1;
        channelStats.last_error = error && error.message ? error.message : String(error);
        saveError('processInvoiceReactions:' + sourceChannel.id, error);
      } finally {
        mergeInvoiceChannelStats_(stats, channelStats);
        if (!dryRunOverride) {
          saveInvoiceChannelScanState_(channelStats);
        }
      }
      if (channelStats.incomplete_scan) {
        stats.max_runtime_reached = true;
        stats.channels_deferred = sourceChannels.length - sourceIndex;
        break;
      }
    }
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

function filterInvoiceSourceChannels_(channels, requestedNames) {
  var requested = (requestedNames || []).map(function(name) {
    return stringValue_(name).trim();
  }).filter(function(name) {
    return Boolean(name);
  });
  var matched = (channels || []).filter(function(channel) {
    return requested.some(function(name) {
      return channelNameMatches_(channel, name);
    });
  });
  if (matched.length !== requested.length) {
    var matchedNames = matched.map(function(channel) { return channel.name; });
    var unknown = requested.filter(function(name) {
      return !matchedNames.some(function(matchedName) {
        return channelNameMatches_({name: matchedName}, name);
      });
    });
    throw new Error('依頼リアクション監視対象のチャンネルが見つかりません: ' + unknown.join(','));
  }
  return matched;
}

function processInvoiceMessageByTs_(sourceChannelName, sourceMessageTs, sourceThreadTs, routeName) {
  var settings = getSettings();
  if (!settings.invoiceForwardEnabled) {
    throw new Error('依頼リアクション転送が無効です。');
  }

  var route = selectInvoiceForwardRoutes_(settings, [routeName || 'invoice_rocket'])[0];
  var routeResolution = resolveInvoiceForwardRouteContexts_([route]);
  if (!routeResolution.contexts.length) {
    throw new Error(routeResolution.unresolved[0].error);
  }
  var routeContext = routeResolution.contexts[0];
  var targetChannel = routeContext.targetChannel;
  var sourceChannel = getChannelByName_(sourceChannelName);
  if (!isInvoiceSourceChannelAllowed_(settings, sourceChannel, [targetChannel])) {
    throw new Error('依頼リアクション監視対象外のチャンネルです: ' + sourceChannel.name);
  }

  var messages = getThreadMessages(sourceChannel.id, sourceThreadTs);
  var message = findSlackMessageByTs_(messages, sourceMessageTs);
  if (!message) {
    throw new Error('指定されたSlack投稿が見つかりませんでした: ' + sourceChannel.name + ':' + sourceMessageTs);
  }

  var stats = {
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    route_results: []
  };
  processInvoiceMessageForRoutes_(message, sourceChannel, [routeContext], settings, stats, false);

  return {
    source_channel_name: sourceChannel.name,
    source_channel_id: sourceChannel.id,
    source_message_ts: sourceMessageTs,
    source_thread_ts: sourceThreadTs,
    route_name: route.routeName,
    reaction_name: route.reactionName,
    target_channel_name: targetChannel.name,
    target_channel_id: targetChannel.id,
    message_has_reaction: messageHasReaction_(message, route.reactionName),
    candidates_found: stats.candidates_found,
    posted_count: stats.posted_count,
    duplicate_skipped_count: stats.duplicate_skipped_count,
    link_only_count: stats.link_only_count,
    no_pdf_skipped_count: stats.no_pdf_skipped_count,
    error_count: stats.error_count,
    route_results: stats.route_results
  };
}

function findSlackMessageByTs_(messages, messageTs) {
  var expectedTs = normalizeSlackTsForCompare_(messageTs);
  return (messages || []).filter(function(message) {
    return normalizeSlackTsForCompare_(message.ts) === expectedTs;
  })[0] || null;
}

function processInvoiceChannelReactions_(sourceChannel, routeContexts, settings, channelStats, dryRunOverride, lookbackDays, historyLimit, historyPageLimit, previousState, startedAtMs, forceRescanOverride, runtimeDeadlineMs, routeSignature) {
  channelStats.last_checked_at = nowIso_();
  var shouldStop = function() {
    return shouldStopInvoiceRun_(startedAtMs, settings.invoiceMaxRuntimeSeconds, runtimeDeadlineMs);
  };
  var latestResponse = slackApi('conversations.history', {
    channel: sourceChannel.id,
    limit: 1
  });
  var latestMessages = latestResponse.messages || [];
  var latestMessage = latestMessages[0] || null;
  var latestTs = latestMessage && latestMessage.ts ? latestMessage.ts : '';
  var previousLatestTs = previousState ? stringValue_(previousState.last_scanned_latest_ts) : '';

  channelStats.latest_messages_checked = latestMessages.length;
  channelStats.last_seen_latest_ts = latestTs;
  channelStats.last_scanned_latest_ts = previousLatestTs;

  if (!latestTs) {
    channelStats.scan_reason = 'empty_channel';
    return;
  }

  var hasNewMessages = slackTsNumber_(latestTs) > slackTsNumber_(previousLatestTs);
  var routeConfigurationChanged = invoiceRouteConfigurationChanged_(previousState, routeSignature);
  var forceRescan = Boolean(forceRescanOverride) ||
    routeConfigurationChanged ||
    shouldForceInvoiceChannelRescan_(previousState, settings.invoiceForceRescanHours);
  if (previousState && !hasNewMessages && !forceRescan) {
    channelStats.skipped_unchanged = true;
    channelStats.scan_reason = 'unchanged';
    channelStats.last_full_scan_at = previousState.last_full_scan_at || '';
    return;
  }

  channelStats.scan_reason = previousState
    ? (forceRescanOverride
      ? 'manual_forced_rescan'
      : (routeConfigurationChanged
        ? 'route_configuration_changed'
        : (hasNewMessages ? 'new_messages' : 'forced_rescan')))
    : 'first_scan';
  var scanFromLatestOnly = previousState && hasNewMessages && !forceRescan;
  channelStats.last_full_scan_at = invoiceLastFullScanAt_(
    previousState,
    scanFromLatestOnly,
    channelStats.last_checked_at
  );
  var history = collectInvoiceHistoryMessages_(
    sourceChannel.id,
    scanFromLatestOnly ? previousLatestTs : cutoffSlackTs_(lookbackDays),
    historyLimit,
    historyPageLimit,
    !scanFromLatestOnly,
    shouldStop
  );
  var messages = history.messages;
  channelStats.messages_checked = messages.length;
  channelStats.history_pages_scanned = history.pages_scanned;
  channelStats.history_next_cursor_found = history.next_cursor_found;
  channelStats.last_scanned_latest_ts = latestTs;

  if (history.incomplete) {
    markInvoiceChannelScanIncomplete_(channelStats, previousState);
    return;
  }

  for (var messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    if (shouldStop()) {
      markInvoiceChannelScanIncomplete_(channelStats, previousState);
      return;
    }
    var message = messages[messageIndex];
    try {
      addInvoiceRouteMessageSamples_(channelStats, message, routeContexts, 'root', message.ts);
      processInvoiceMessageForRoutes_(message, sourceChannel, routeContexts, settings, channelStats, dryRunOverride);
    } catch (error) {
      channelStats.error_count += 1;
      saveError('processInvoiceReactionMessage:' + sourceChannel.id + ':' + (message.ts || ''), error);
    }
    try {
      if (scanInvoiceThreadRepliesForForward_(message, sourceChannel, routeContexts, settings, channelStats, dryRunOverride, shouldStop)) {
        markInvoiceChannelScanIncomplete_(channelStats, previousState);
        return;
      }
    } catch (error) {
      channelStats.error_count += 1;
      saveError('processInvoiceReactionReplies:' + sourceChannel.id + ':' + (message.ts || ''), error);
    }
  }
}

function invoiceRouteConfigurationChanged_(previousState, routeSignature) {
  return Boolean(previousState) &&
    stringValue_(previousState.route_signature) !== stringValue_(routeSignature);
}

function invoiceLastFullScanAt_(previousState, scanFromLatestOnly, checkedAt) {
  if (scanFromLatestOnly) {
    return previousState ? stringValue_(previousState.last_full_scan_at) : '';
  }
  return stringValue_(checkedAt);
}

function markInvoiceChannelScanIncomplete_(channelStats, previousState) {
  channelStats.incomplete_scan = true;
  channelStats.last_full_scan_at = previousState ? stringValue_(previousState.last_full_scan_at) : '';
  channelStats.last_scanned_latest_ts = previousState ? stringValue_(previousState.last_scanned_latest_ts) : '';
  channelStats.route_signature = previousState ? stringValue_(previousState.route_signature) : '';
}

function makeInvoiceChannelStats_(sourceChannel, rootStats) {
  return {
    started_at: nowIso_(),
    dry_run: rootStats.dry_run,
    source_channel_name: sourceChannel.name,
    source_channel_id: sourceChannel.id,
    target_channel_name: rootStats.target_channel_name,
    target_channel_id: rootStats.target_channel_id,
    reaction_name: rootStats.reaction_name,
    lookback_days: rootStats.lookback_days,
    history_limit: rootStats.history_limit,
    history_page_limit: rootStats.history_page_limit,
    reply_thread_limit: rootStats.reply_thread_limit,
    latest_messages_checked: 0,
    messages_checked: 0,
    history_pages_scanned: 0,
    reply_threads_checked: 0,
    reply_messages_checked: 0,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    history_next_cursor_found: false,
    skipped_unchanged: false,
    scan_reason: '',
    last_checked_at: '',
    last_full_scan_at: '',
    last_scanned_latest_ts: '',
    last_seen_latest_ts: '',
    last_error: '',
    incomplete_scan: false,
    message_samples: [],
    route_signature: rootStats.route_signature,
    route_results: []
  };
}

function mergeInvoiceChannelStats_(stats, channelStats) {
  stats.channels_checked += 1;
  if (channelStats.skipped_unchanged) {
    stats.channels_skipped_unchanged += 1;
  } else if (
    channelStats.messages_checked > 0 ||
    channelStats.scan_reason === 'first_scan' ||
    channelStats.scan_reason === 'forced_rescan' ||
    channelStats.scan_reason === 'new_messages' ||
    channelStats.scan_reason === 'route_configuration_changed' ||
    channelStats.scan_reason === 'manual_forced_rescan'
  ) {
    stats.channels_scanned += 1;
  }
  stats.messages_checked += channelStats.messages_checked;
  stats.history_pages_scanned += channelStats.history_pages_scanned;
  stats.reply_threads_checked += channelStats.reply_threads_checked;
  stats.reply_messages_checked += channelStats.reply_messages_checked;
  stats.candidates_found += channelStats.candidates_found;
  stats.posted_count += channelStats.posted_count;
  stats.planned_count += channelStats.planned_count;
  stats.duplicate_skipped_count += channelStats.duplicate_skipped_count;
  stats.link_only_count += channelStats.link_only_count;
  stats.no_pdf_skipped_count += channelStats.no_pdf_skipped_count;
  stats.error_count += channelStats.error_count;
  stats.history_next_cursor_found = stats.history_next_cursor_found || channelStats.history_next_cursor_found;
  mergeInvoiceRouteResults_(stats, channelStats.route_results);
  (channelStats.message_samples || []).forEach(function(sample) {
    if (stats.message_samples.length < 10) {
      stats.message_samples.push(sample);
    }
  });
}

function shouldForceInvoiceChannelRescan_(previousState, forceRescanHours) {
  if (!previousState || !previousState.last_full_scan_at) {
    return true;
  }
  var parsed = Date.parse(previousState.last_full_scan_at);
  if (!parsed) {
    return true;
  }
  return Date.now() - parsed >= forceRescanHours * 60 * 60 * 1000;
}

function sortInvoiceSourceChannelsForRun_(channels, stateByChannelId) {
  return channels.slice().sort(function(a, b) {
    var stateA = stateByChannelId[a.id] || {};
    var stateB = stateByChannelId[b.id] || {};
    var checkedA = Date.parse(stateA.last_checked_at || '') || 0;
    var checkedB = Date.parse(stateB.last_checked_at || '') || 0;
    if (checkedA !== checkedB) {
      return checkedA - checkedB;
    }
    return a.name.localeCompare(b.name, 'ja');
  });
}

function invoiceRuntimeGuardSeconds_(maxRuntimeSeconds) {
  var maxSeconds = parsePositiveInteger_(maxRuntimeSeconds, 300);
  var safetySeconds = Math.min(
    INVOICE_RUNTIME_SAFETY_SECONDS,
    Math.max(10, Math.floor(maxSeconds * 0.5))
  );
  return Math.max(maxSeconds - safetySeconds, 10);
}

function shouldStopInvoiceRun_(startedAtMs, maxRuntimeSeconds, runtimeDeadlineMs) {
  return runtimeDeadlineReached_(runtimeDeadlineMs) ||
    Date.now() - startedAtMs >= invoiceRuntimeGuardSeconds_(maxRuntimeSeconds) * 1000;
}

function collectInvoiceHistoryMessages_(channelId, oldestTs, historyLimit, historyPageLimit, inclusive, shouldStop) {
  var messages = [];
  var cursor = '';
  var pagesScanned = 0;
  var nextCursorFound = false;
  var incomplete = false;
  do {
    if (shouldStop && shouldStop()) {
      incomplete = true;
      break;
    }
    var payload = {
      channel: channelId,
      limit: historyLimit,
      oldest: oldestTs,
      inclusive: Boolean(inclusive)
    };
    if (cursor) {
      payload.cursor = cursor;
    }
    var response = slackApi('conversations.history', payload);
    pagesScanned += 1;
    messages = messages.concat(response.messages || []);
    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
    nextCursorFound = Boolean(cursor);
  } while (cursor && pagesScanned < historyPageLimit);

  return {
    messages: messages,
    pages_scanned: pagesScanned,
    next_cursor_found: nextCursorFound,
    incomplete: incomplete
  };
}

function scanInvoiceThreadRepliesForForward_(rootMessage, sourceChannel, routeContexts, settings, stats, dryRunOverride, shouldStop, dependencies) {
  if (!rootMessage.reply_count || stats.reply_threads_checked >= settings.invoiceReplyThreadLimit) {
    return false;
  }
  if (shouldStop && shouldStop()) {
    return true;
  }

  stats.reply_threads_checked += 1;
  var replyDependencies = dependencies || {};
  var replies = replyDependencies.getThreadMessages
    ? replyDependencies.getThreadMessages(sourceChannel.id, rootMessage.ts, shouldStop)
    : getThreadMessages(sourceChannel.id, rootMessage.ts, shouldStop);
  for (var replyIndex = 0; replyIndex < replies.length; replyIndex += 1) {
    if (shouldStop && shouldStop()) {
      return true;
    }
    var reply = replies[replyIndex];
    if (normalizeSlackTsForCompare_(reply.ts) === normalizeSlackTsForCompare_(rootMessage.ts)) {
      continue;
    }

    stats.reply_messages_checked += 1;
    try {
      addInvoiceRouteMessageSamples_(stats, reply, routeContexts, 'reply', rootMessage.ts);
      if (replyDependencies.processMessage) {
        replyDependencies.processMessage(reply, sourceChannel, routeContexts, settings, stats, dryRunOverride);
      } else {
        processInvoiceMessageForRoutes_(reply, sourceChannel, routeContexts, settings, stats, dryRunOverride);
      }
    } catch (error) {
      stats.error_count += 1;
      saveError('processInvoiceReactionReply:' + (reply.ts || ''), error);
    }
  }
  return Boolean(shouldStop && shouldStop());
}

function processInvoiceMessageForRoutes_(message, sourceChannel, routeContexts, settings, stats, dryRunOverride) {
  (routeContexts || []).forEach(function(context) {
    var routeStats = ensureInvoiceRouteStats_(stats, context.route, context.targetChannel);
    try {
      processInvoiceMessageForForward_(
        message,
        sourceChannel,
        context.targetChannel,
        settings,
        stats,
        dryRunOverride,
        context.route,
        routeStats
      );
    } catch (error) {
      incrementInvoiceRouteCounter_(stats, routeStats, 'error_count');
      routeStats.last_error = error && error.message ? error.message : String(error);
      saveError(
        'processInvoiceMessageForRoutes:' + context.route.routeName + ':' + (message.ts || ''),
        error
      );
    }
  });
}

function processInvoiceMessageForForward_(message, sourceChannel, targetChannel, settings, stats, dryRunOverride, route, routeStats) {
  var effectiveRoute = route || legacyInvoiceForwardRoute_(settings);
  var effectiveRouteStats = routeStats || ensureInvoiceRouteStats_(stats, effectiveRoute, targetChannel);
  if (!messageHasReaction_(message, effectiveRoute.reactionName)) {
    return;
  }

  var pdfFile = findPdfFile_(message);
  if (!pdfFile) {
    incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'link_only_count');
  }
  incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'candidates_found');
  var sourceMessageTs = message.ts;
  var fileId = invoiceForwardDedupKey_(message, pdfFile);
  if (isInvoiceAlreadyPosted_(
    sourceChannel.id,
    sourceMessageTs,
    fileId,
    effectiveRoute.reactionName,
    targetChannel.id,
    targetChannel.name
  )) {
    incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'duplicate_skipped_count');
    return;
  }

  if (dryRunOverride) {
    incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'planned_count');
    return;
  }

  withInvoiceForwardPostLock_(function() {
    if (isInvoiceAlreadyPosted_(
      sourceChannel.id,
      sourceMessageTs,
      fileId,
      effectiveRoute.reactionName,
      targetChannel.id,
      targetChannel.name
    )) {
      incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'duplicate_skipped_count');
      return;
    }

    var sourceUrl = getPermalink(sourceChannel.id, sourceMessageTs);
    if (invoiceTargetChannelAlreadyContainsSourceUrl_(targetChannel.id, sourceUrl)) {
      incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'duplicate_skipped_count');
      return;
    }

    var text = invoiceForwardMessage_(pdfFile ? invoiceFileName_(pdfFile) : '', sourceUrl);
    var attachments = invoiceForwardAttachments_(
      message,
      sourceChannel.name,
      sourceUrl,
      pdfFile,
      effectiveRoute.reactionName
    );
    var postResponse = postChannelMessage(targetChannel.id, text, attachments);
    saveInvoiceReactionPost_({
      processed_at: nowIso_(),
      source_channel_name: sourceChannel.name,
      source_channel_id: sourceChannel.id,
      source_message_ts: sourceMessageTs,
      source_url: sourceUrl,
      file_id: fileId,
      file_name: pdfFile ? invoiceFileName_(pdfFile) : '',
      reaction_name: normalizeReactionName_(effectiveRoute.reactionName),
      target_channel_name: targetChannel.name,
      target_channel_id: targetChannel.id,
      posted_ts: postResponse.ts || '',
      posted_text: text,
      dry_run: false
    });
    incrementInvoiceRouteCounter_(stats, effectiveRouteStats, 'posted_count');
  });
}

function withInvoiceForwardPostLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function invoiceTargetChannelAlreadyContainsSourceUrl_(targetChannelId, sourceUrl) {
  var cursor = '';
  var pagesScanned = 0;
  do {
    var payload = {
      channel: targetChannelId,
      limit: 100
    };
    if (cursor) {
      payload.cursor = cursor;
    }

    var response = slackApi('conversations.history', payload);
    var messages = response.messages || [];
    if (messages.some(function(message) {
      return invoiceMessageContainsSourceUrl_(message, sourceUrl);
    })) {
      return true;
    }

    cursor = response.response_metadata && response.response_metadata.next_cursor
      ? response.response_metadata.next_cursor
      : '';
    pagesScanned += 1;
  } while (cursor && pagesScanned < 2);
  return false;
}

function invoiceMessageContainsSourceUrl_(message, sourceUrl) {
  if (textContainsSlackUrl_(message.text, sourceUrl)) {
    return true;
  }

  return (message.attachments || []).some(function(attachment) {
    return textContainsSlackUrl_(attachment.text, sourceUrl) ||
      textContainsSlackUrl_(attachment.title, sourceUrl) ||
      textContainsSlackUrl_(attachment.title_link, sourceUrl) ||
      textContainsSlackUrl_(attachment.from_url, sourceUrl) ||
      textContainsSlackUrl_(attachment.original_url, sourceUrl);
  });
}

function processReactionForwardRules_(dryRunOverride, runtimeDeadlineMs) {
  var stats = makeReactionForwardStats_(dryRunOverride);
  var rules = readReactionForwardRules_();
  stats.rule_count = rules.length;
  stats.enabled_rule_count = rules.filter(function(rule) {
    return rule.enabled;
  }).length;

  for (var ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
    if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
      stats.deadline_reached = true;
      break;
    }
    var rule = rules[ruleIndex];
    if (!rule.enabled) {
      continue;
    }
    var ruleStats = makeReactionForwardStats_(dryRunOverride);
    ruleStats.rule_name = rule.ruleName;
    try {
      processReactionForwardRuleHistory_(rule, ruleStats, dryRunOverride, runtimeDeadlineMs);
    } catch (error) {
      ruleStats.error_count += 1;
      ruleStats.last_error = error && error.message ? error.message : String(error);
      saveError('processReactionForwardRules:' + rule.ruleName, error);
    }
    stats.rule_results.push(ruleStats);
    mergeReactionForwardStats_(stats, ruleStats);
  }

  return stats;
}

function processReactionForwardRuleHistory_(rule, stats, dryRunOverride, runtimeDeadlineMs) {
  if (!reactionForwardRuleIsRunnable_(rule)) {
    stats.invalid_rule_count += 1;
    return;
  }
  var sourceChannel = getChannelByName_(rule.sourceChannelName);
  var targetChannel = getChannelByName_(rule.targetChannelName);
  if (sourceChannel.id === targetChannel.id) {
    throw new Error('reaction_forward_rulesのsource_channel_nameとtarget_channel_nameが同じです: ' + rule.ruleName);
  }

  var messages = getReactionForwardHistoryMessages_(sourceChannel.id);
  stats.messages_checked += messages.length;
  for (var messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
      stats.deadline_reached = true;
      break;
    }
    var message = messages[messageIndex];
    if (!messageHasReaction_(message, rule.reactionName)) {
      continue;
    }
    processReactionForwardMessage_(message, sourceChannel, targetChannel, rule, stats, dryRunOverride);
  }
}

function processReactionForwardEvent_(message, sourceChannel, rules, dryRunOverride) {
  var stats = makeReactionForwardStats_(dryRunOverride);
  stats.rule_count = rules.length;
  stats.enabled_rule_count = rules.length;
  rules.forEach(function(rule) {
    var ruleStats = makeReactionForwardStats_(dryRunOverride);
    ruleStats.rule_name = rule.ruleName;
    try {
      if (!reactionForwardRuleIsRunnable_(rule)) {
        ruleStats.invalid_rule_count += 1;
        return;
      }
      var targetChannel = getChannelByName_(rule.targetChannelName);
      if (sourceChannel.id === targetChannel.id) {
        throw new Error('reaction_forward_rulesのsource_channel_nameとtarget_channel_nameが同じです: ' + rule.ruleName);
      }
      processReactionForwardMessage_(message, sourceChannel, targetChannel, rule, ruleStats, dryRunOverride);
    } catch (error) {
      ruleStats.error_count += 1;
      ruleStats.last_error = error && error.message ? error.message : String(error);
      saveError('processReactionForwardEvent:' + rule.ruleName, error);
    } finally {
      stats.rule_results.push(ruleStats);
      mergeReactionForwardStats_(stats, ruleStats);
    }
  });
  return stats;
}

function processReactionForwardMessage_(message, sourceChannel, targetChannel, rule, stats, dryRunOverride) {
  if (!messageHasReaction_(message, rule.reactionName)) {
    return;
  }
  stats.candidates_found += 1;
  var sourceMessageTs = message.ts;
  if (isReactionForwardAlreadyPosted_(rule.ruleName, sourceChannel.id, sourceMessageTs, rule.reactionName, targetChannel.id)) {
    stats.duplicate_skipped_count += 1;
    return;
  }

  var sourceUrl = '';
  var postPayload = buildReactionForwardPostPayload_(message, rule, sourceUrl);
  if (!postPayload.text && rule.includeSourceLink) {
    sourceUrl = getPermalink(sourceChannel.id, sourceMessageTs);
    postPayload = buildReactionForwardPostPayload_(message, rule, sourceUrl);
  }
  if (!postPayload.text) {
    stats.empty_message_skipped_count += 1;
    return;
  }

  if (dryRunOverride) {
    if (postPayload.truncated) {
      stats.truncated_count += 1;
    }
    stats.planned_count += 1;
    return;
  }

  withReactionForwardPostLock_(function() {
    if (isReactionForwardAlreadyPosted_(rule.ruleName, sourceChannel.id, sourceMessageTs, rule.reactionName, targetChannel.id)) {
      stats.duplicate_skipped_count += 1;
      return;
    }

    if (!sourceUrl) {
      sourceUrl = getPermalink(sourceChannel.id, sourceMessageTs);
      if (rule.includeSourceLink) {
        postPayload = buildReactionForwardPostPayload_(message, rule, sourceUrl);
      }
      if (!postPayload.text) {
        stats.empty_message_skipped_count += 1;
        return;
      }
    }
    if (postPayload.truncated) {
      stats.truncated_count += 1;
    }

    var replyForwardResult = {
      source_reply_count: 0,
      posted_reply_count: 0,
      reply_error_count: 0
    };
    var postResponse = postReactionForwardPayload_(
      targetChannel.id,
      postPayload,
      'postReactionForwardMessage:' + rule.ruleName + ':' + sourceMessageTs
    );
    if (postResponse.ts && parsePositiveInteger_(message.reply_count, 0) > 0) {
      replyForwardResult = forwardReactionForwardReplies_(
        sourceChannel.id,
        sourceMessageTs,
        targetChannel.id,
        postResponse.ts,
        rule,
        stats,
        'postReactionForwardReplies:' + rule.ruleName + ':' + sourceMessageTs
      );
    }
    saveReactionForwardPost_({
      processed_at: nowIso_(),
      rule_name: rule.ruleName,
      source_channel_name: sourceChannel.name,
      source_channel_id: sourceChannel.id,
      source_message_ts: sourceMessageTs,
      source_url: sourceUrl,
      reaction_name: rule.reactionName,
      target_channel_name: targetChannel.name,
      target_channel_id: targetChannel.id,
      posted_ts: postResponse.ts || '',
      posted_text: postPayload.text,
      post_mode: rule.postMode,
      include_source_link: rule.includeSourceLink,
      dry_run: false,
      source_reply_count: replyForwardResult.source_reply_count,
      posted_reply_count: replyForwardResult.posted_reply_count,
      reply_error_count: replyForwardResult.reply_error_count
    });
    if (postResponse.reaction_forward_used_blocks) {
      stats.blocks_used_count += 1;
    }
    if (postResponse.reaction_forward_blocks_fallback) {
      stats.blocks_fallback_count += 1;
    }
    stats.posted_count += 1;
  });
}

function getReactionForwardHistoryMessages_(channelId) {
  var response = slackApi('conversations.history', {
    channel: channelId,
    limit: REACTION_FORWARD_DEFAULT_HISTORY_LIMIT,
    oldest: cutoffSlackTs_(REACTION_FORWARD_DEFAULT_LOOKBACK_DAYS),
    inclusive: true
  });
  return response.messages || [];
}

function getChannelMessageByTs_(channelId, messageTs) {
  var response = slackApi('conversations.history', {
    channel: channelId,
    latest: messageTs,
    inclusive: true,
    limit: 1
  });
  var messages = response.messages || [];
  for (var i = 0; i < messages.length; i += 1) {
    if (normalizeSlackTsForCompare_(messages[i].ts) === normalizeSlackTsForCompare_(messageTs)) {
      return messages[i];
    }
  }
  throw new Error('Slack message not found: ' + channelId + ':' + messageTs);
}

function forwardReactionForwardReplies_(sourceChannelId, sourceMessageTs, targetChannelId, targetThreadTs, rule, stats, context) {
  var threadMessages = getThreadMessages(sourceChannelId, sourceMessageTs);
  var replyMessages = reactionForwardReplyMessagesFromThread_(threadMessages, sourceMessageTs);
  return forwardReactionForwardReplyMessages_(
    replyMessages,
    targetChannelId,
    targetThreadTs,
    rule,
    stats,
    context,
    null
  );
}

function reactionForwardReplyMessagesFromThread_(threadMessages, rootMessageTs) {
  return (threadMessages || []).filter(function(message) {
    if (!message || !message.ts) {
      return false;
    }
    return normalizeSlackTsForCompare_(message.ts) !== normalizeSlackTsForCompare_(rootMessageTs);
  });
}

function forwardReactionForwardReplyMessages_(replyMessages, targetChannelId, targetThreadTs, rule, stats, context, poster) {
  var replies = replyMessages || [];
  var result = {
    source_reply_count: replies.length,
    posted_reply_count: 0,
    reply_error_count: 0,
    omitted_reply_count: Math.max(0, replies.length - REACTION_FORWARD_MAX_REPLY_COUNT)
  };
  var postReply = poster || function(postPayload, reply, replyIndex) {
    return postReactionForwardThreadPayload_(
      targetChannelId,
      targetThreadTs,
      postPayload,
      context + ':' + (reply && reply.ts ? reply.ts : replyIndex)
    );
  };

  replies.slice(0, REACTION_FORWARD_MAX_REPLY_COUNT).forEach(function(reply, index) {
    try {
      var postPayload = buildReactionForwardReplyPayload_(reply, rule);
      if (!postPayload.text) {
        return;
      }
      var postResponse = postReply(postPayload, reply, index);
      result.posted_reply_count += 1;
      if (postResponse && postResponse.reaction_forward_used_blocks) {
        stats.blocks_used_count = (stats.blocks_used_count || 0) + 1;
      }
      if (postResponse && postResponse.reaction_forward_blocks_fallback) {
        stats.blocks_fallback_count = (stats.blocks_fallback_count || 0) + 1;
      }
    } catch (error) {
      result.reply_error_count += 1;
      saveError(context + ':' + (reply && reply.ts ? reply.ts : index), error);
    }
  });

  if (result.omitted_reply_count > 0) {
    try {
      postReply(buildReactionForwardReplyOmittedPayload_(result.omitted_reply_count), null, 'omitted');
    } catch (error) {
      result.reply_error_count += 1;
      saveError(context + ':omitted_notice', error);
    }
  }

  stats.source_reply_count = (stats.source_reply_count || 0) + result.source_reply_count;
  stats.posted_reply_count = (stats.posted_reply_count || 0) + result.posted_reply_count;
  stats.reply_error_count = (stats.reply_error_count || 0) + result.reply_error_count;
  return result;
}

function buildReactionForwardReplyPayload_(reply, rule) {
  var replyRule = {
    ruleName: rule.ruleName,
    sourceChannelName: rule.sourceChannelName,
    reactionName: rule.reactionName,
    targetChannelName: rule.targetChannelName,
    postMode: rule.postMode,
    includeSourceLink: false
  };
  return buildReactionForwardPostPayload_(reply || {}, replyRule, '');
}

function buildReactionForwardReplyOmittedPayload_(omittedCount) {
  var text = '（コメントが' + REACTION_FORWARD_MAX_REPLY_COUNT + '件を超えたため、残り' + omittedCount + '件は省略）';
  return {
    text: text,
    blocks: [
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: text
          }
        ]
      }
    ],
    truncated: false
  };
}

function findMatchingReactionForwardRules_(reactionName, sourceChannel) {
  var normalizedReaction = normalizeReactionName_(reactionName);
  return readReactionForwardRules_().filter(function(rule) {
    return rule.enabled &&
      reactionForwardRuleIsRunnable_(rule) &&
      rule.reactionName === normalizedReaction &&
      reactionForwardSourceMatches_(rule, sourceChannel);
  });
}

function reactionForwardSourceMatches_(rule, sourceChannel) {
  if (stringValue_(sourceChannel.id) === stringValue_(rule.sourceChannelName)) {
    return true;
  }
  return channelNameMatches_(sourceChannel, rule.sourceChannelName);
}

function reactionForwardRuleIsRunnable_(rule) {
  return Boolean(
    rule &&
    rule.enabled &&
    rule.ruleName &&
    rule.sourceChannelName &&
    rule.reactionName &&
    rule.targetChannelName &&
    rule.postMode === 'copy_text'
  );
}

function makeReactionForwardStats_(dryRunOverride) {
  return {
    dry_run: Boolean(dryRunOverride),
    rule_count: 0,
    enabled_rule_count: 0,
    rule_name: '',
    messages_checked: 0,
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    empty_message_skipped_count: 0,
    truncated_count: 0,
    blocks_used_count: 0,
    blocks_fallback_count: 0,
    source_reply_count: 0,
    posted_reply_count: 0,
    reply_error_count: 0,
    invalid_rule_count: 0,
    deadline_reached: false,
    error_count: 0,
    last_error: '',
    rule_results: []
  };
}

function mergeReactionForwardStats_(target, source) {
  [
    'messages_checked',
    'candidates_found',
    'posted_count',
    'planned_count',
    'duplicate_skipped_count',
    'empty_message_skipped_count',
    'truncated_count',
    'blocks_used_count',
    'blocks_fallback_count',
    'source_reply_count',
    'posted_reply_count',
    'reply_error_count',
    'invalid_rule_count',
    'error_count'
  ].forEach(function(key) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  });
  target.deadline_reached = Boolean(target.deadline_reached || source.deadline_reached);
}

function legacyInvoiceForwardRoute_(settings) {
  return {
    enabled: Boolean(settings && settings.invoiceForwardEnabled),
    routeName: 'invoice_rocket',
    reactionName: normalizeReactionName_(settings && settings.invoiceReactionName),
    targetChannelName: stringValue_(settings && settings.invoiceTargetChannelName).trim(),
    legacy: true
  };
}

function readInvoiceForwardRoutes_() {
  var sheet = getManagedSheet_('invoice_forward_routes');
  return readInvoiceForwardRoutesFromValues_(sheet.getDataRange().getValues());
}

function readInvoiceForwardRoutesFromValues_(values) {
  var routes = [];
  var seenRouteNames = {};
  (values || []).slice(1).forEach(function(row, index) {
    if (!row || !row.some(function(cell) { return stringValue_(cell).trim(); })) {
      return;
    }
    var routeName = stringValue_(row[1]).trim();
    var validationError = '';
    if (!routeName) {
      validationError = 'route_name_required';
    } else if (seenRouteNames[routeName]) {
      validationError = 'duplicate_route_name';
    } else {
      seenRouteNames[routeName] = true;
    }
    routes.push({
      enabled: parseBoolean_(row[0]),
      routeName: routeName,
      reactionName: normalizeReactionName_(row[2]),
      targetChannelName: stringValue_(row[3]).trim(),
      legacy: false,
      rowNumber: index + 2,
      validationError: validationError
    });
  });
  return routes;
}

function getInvoiceForwardRouteDefinitions_(settings) {
  return addLegacyInvoiceForwardRoute_(
    readInvoiceForwardRoutes_(),
    settings
  );
}

function addLegacyInvoiceForwardRoute_(routes, settings) {
  var definitions = (routes || []).slice();
  var hasLegacyRoute = definitions.some(function(route) {
    return route.routeName === 'invoice_rocket';
  });
  if (!hasLegacyRoute) {
    definitions.unshift(legacyInvoiceForwardRoute_(settings));
  }
  return definitions;
}

function invoiceForwardRouteIsRunnable_(route) {
  return Boolean(
    route &&
    route.enabled &&
    !route.validationError &&
    route.routeName &&
    route.reactionName &&
    route.targetChannelName
  );
}

function selectInvoiceForwardRoutes_(settings, routeNamesOverride) {
  var routes = getInvoiceForwardRouteDefinitions_(settings).filter(invoiceForwardRouteIsRunnable_);
  var requestedNames = (routeNamesOverride || []).map(function(name) {
    return stringValue_(name).trim();
  }).filter(function(name, index, values) {
    return name && values.indexOf(name) === index;
  });
  if (!requestedNames.length) {
    return routes;
  }
  var selected = routes.filter(function(route) {
    return requestedNames.indexOf(route.routeName) !== -1;
  });
  if (selected.length !== requestedNames.length) {
    var selectedNames = selected.map(function(route) { return route.routeName; });
    var unknownNames = requestedNames.filter(function(name) {
      return selectedNames.indexOf(name) === -1;
    });
    throw new Error('Unknown or disabled invoice forward route: ' + unknownNames.join(','));
  }
  return selected;
}

function findMatchingInvoiceForwardRoutes_(settings, reactionName) {
  if (!settings.invoiceForwardEnabled) {
    return [];
  }
  return findMatchingInvoiceForwardRoutesFromRoutes_(
    selectInvoiceForwardRoutes_(settings),
    reactionName
  );
}

function findMatchingInvoiceForwardRoutesFromRoutes_(routes, reactionName) {
  var normalizedReaction = normalizeReactionName_(reactionName);
  return (routes || []).filter(invoiceForwardRouteIsRunnable_).filter(function(route) {
    return route.reactionName === normalizedReaction;
  });
}

function invoiceForwardRouteSignature_(routes) {
  return JSON.stringify((routes || []).filter(invoiceForwardRouteIsRunnable_).map(function(route) {
    return [
      route.routeName,
      normalizeReactionName_(route.reactionName),
      stringValue_(route.targetChannelName).trim()
    ].join('|');
  }).sort());
}

function resolveInvoiceForwardRouteContexts_(routes) {
  var contexts = [];
  var unresolved = [];
  (routes || []).forEach(function(route) {
    try {
      var targetChannel = getChannelByName_(route.targetChannelName);
      if (targetChannel.is_member === false) {
        throw new Error('Slack channel is not joined by bot: ' + route.targetChannelName);
      }
      contexts.push({
        route: route,
        targetChannel: targetChannel
      });
    } catch (error) {
      unresolved.push({
        route_name: route.routeName,
        reaction_name: route.reactionName,
        target_channel_name: route.targetChannelName,
        error: error && error.message ? error.message : String(error)
      });
    }
  });
  return {
    contexts: contexts,
    unresolved: unresolved
  };
}

function buildInvoiceForwardRouteRow_(input) {
  var enabledValue = input.enabled === undefined || stringValue_(input.enabled).trim() === ''
    ? true
    : parseBoolean_(input.enabled);
  var routeName = stringValue_(input.routeName).trim();
  var reactionName = normalizeReactionName_(input.reactionName);
  var targetChannelName = stringValue_(input.targetChannelName).trim();
  if (!routeName) {
    throw new Error('invoice_forward_routes route_name is required.');
  }
  if (!reactionName) {
    throw new Error('invoice_forward_routes reaction_name is required: ' + routeName);
  }
  if (!targetChannelName) {
    throw new Error('invoice_forward_routes target_channel_name is required: ' + routeName);
  }
  var route = {
    enabled: enabledValue,
    routeName: routeName,
    reactionName: reactionName,
    targetChannelName: targetChannelName,
    legacy: false
  };
  return {
    row: [
      enabledValue ? 'true' : 'false',
      routeName,
      reactionName,
      targetChannelName
    ],
    route: route
  };
}

function buildInvoiceForwardRouteWebInput_(params, existingRoutes) {
  var enabledText = params.enabled === undefined || stringValue_(params.enabled).trim() === ''
    ? 'true'
    : stringValue_(params.enabled);
  var enabled = parseBoolean_(enabledText);
  var routeName = stringValue_(params.route_name || '').trim();
  var existing = (existingRoutes || []).filter(function(route) {
    return route.routeName === routeName;
  })[0] || null;
  return {
    enabled: enabled,
    routeName: routeName,
    reactionName: stringValue_(params.reaction_name || (existing ? existing.reactionName : '')),
    targetChannelName: stringValue_(params.target_channel_name || (existing ? existing.targetChannelName : ''))
  };
}

function upsertInvoiceForwardRouteFromWeb_(params) {
  var settings = getSettings();
  var input = buildInvoiceForwardRouteWebInput_(
    params,
    getInvoiceForwardRouteDefinitions_(settings)
  );
  var built = buildInvoiceForwardRouteRow_(input);
  if (!built.route.enabled) {
    return upsertInvoiceForwardRoute_(input);
  }
  var targetChannel = getChannelByName_(built.route.targetChannelName);
  if (targetChannel.is_member === false) {
    throw new Error('Slack channel is not joined by bot: ' + built.route.targetChannelName);
  }
  if (!settings.invoiceSourceAllJoinedChannels &&
      isInvoiceSourceChannelAllowed_(settings, targetChannel, [])) {
    throw new Error('Invoice forward target cannot also be a monitored source: ' + targetChannel.name);
  }
  return upsertInvoiceForwardRoute_({
    enabled: built.route.enabled,
    routeName: built.route.routeName,
    reactionName: built.route.reactionName,
    targetChannelName: targetChannel.name
  });
}

function upsertInvoiceForwardRoute_(input) {
  var built = buildInvoiceForwardRouteRow_(input);
  var sheet = getManagedSheet_('invoice_forward_routes');
  var values = sheet.getDataRange().getValues();
  var rowIndex = 0;
  for (var i = 1; i < values.length; i += 1) {
    if (stringValue_(values[i][1]).trim() === built.route.routeName) {
      rowIndex = i + 1;
      break;
    }
  }
  var action = 'updated';
  if (!rowIndex) {
    rowIndex = Math.max(sheet.getLastRow() + 1, 2);
    action = 'inserted';
  }
  var range = sheet.getRange(rowIndex, 1, 1, built.row.length);
  range.setNumberFormat('@');
  range.setValues([built.row]);
  return {
    action: action,
    row_index: rowIndex,
    route: built.route
  };
}

function makeInvoiceRouteStats_(route, targetChannel) {
  return {
    route_name: route.routeName,
    reaction_name: route.reactionName,
    target_channel_name: targetChannel ? targetChannel.name : route.targetChannelName,
    target_channel_id: targetChannel ? targetChannel.id : '',
    candidates_found: 0,
    posted_count: 0,
    planned_count: 0,
    duplicate_skipped_count: 0,
    link_only_count: 0,
    no_pdf_skipped_count: 0,
    error_count: 0,
    last_error: ''
  };
}

function ensureInvoiceRouteStats_(stats, route, targetChannel) {
  stats.route_results = stats.route_results || [];
  var existing = stats.route_results.filter(function(result) {
    return result.route_name === route.routeName;
  })[0];
  if (existing) {
    if (targetChannel && !existing.target_channel_id) {
      existing.target_channel_name = targetChannel.name;
      existing.target_channel_id = targetChannel.id;
    }
    return existing;
  }
  var created = makeInvoiceRouteStats_(route, targetChannel);
  stats.route_results.push(created);
  return created;
}

function incrementInvoiceRouteCounter_(stats, routeStats, key, amount) {
  var increment = amount === undefined ? 1 : amount;
  stats[key] = (stats[key] || 0) + increment;
  if (routeStats) {
    routeStats[key] = (routeStats[key] || 0) + increment;
  }
}

function mergeInvoiceRouteResults_(targetStats, sourceResults) {
  (sourceResults || []).forEach(function(source) {
    var route = {
      routeName: source.route_name,
      reactionName: source.reaction_name,
      targetChannelName: source.target_channel_name
    };
    var target = ensureInvoiceRouteStats_(targetStats, route, source.target_channel_id ? {
      id: source.target_channel_id,
      name: source.target_channel_name
    } : null);
    [
      'candidates_found',
      'posted_count',
      'planned_count',
      'duplicate_skipped_count',
      'link_only_count',
      'no_pdf_skipped_count',
      'error_count'
    ].forEach(function(key) {
      target[key] = (target[key] || 0) + (source[key] || 0);
    });
    if (source.last_error) {
      target.last_error = source.last_error;
    }
  });
}

function recordUnresolvedInvoiceRoutes_(stats, routes, unresolvedRoutes, contextName) {
  (unresolvedRoutes || []).forEach(function(unresolved) {
    var route = (routes || []).filter(function(candidate) {
      return candidate.routeName === unresolved.route_name;
    })[0] || {
      routeName: unresolved.route_name,
      reactionName: unresolved.reaction_name,
      targetChannelName: unresolved.target_channel_name
    };
    var routeStats = ensureInvoiceRouteStats_(stats, route, null);
    incrementInvoiceRouteCounter_(stats, routeStats, 'error_count');
    routeStats.last_error = unresolved.error || 'target_channel_unresolved';
    saveError(
      (contextName || 'invoiceForwardRoute') + ':' + route.routeName,
      new Error(routeStats.last_error)
    );
  });
}

function readReactionForwardRules_() {
  var sheet = getManagedSheet_('reaction_forward_rules');
  return readReactionForwardRulesFromValues_(sheet.getDataRange().getValues());
}

function readReactionForwardRulesFromValues_(values) {
  var rules = [];
  (values || []).slice(1).forEach(function(row, index) {
    if (!row || !row.some(function(cell) { return stringValue_(cell).trim(); })) {
      return;
    }
    var ruleName = stringValue_(row[1]).trim() || 'reaction_forward_rule_' + (index + 2);
    rules.push({
      enabled: parseBoolean_(row[0]),
      ruleName: ruleName,
      sourceChannelName: stringValue_(row[2]).trim(),
      reactionName: normalizeReactionName_(row[3]),
      targetChannelName: stringValue_(row[4]).trim(),
      postMode: normalizeReactionForwardPostMode_(row[5]),
      includeSourceLink: parseBoolean_(row[6])
    });
  });
  return rules;
}

function upsertReactionForwardRuleFromWeb_(params) {
  return upsertReactionForwardRule_({
    enabled: stringValue_(params.enabled || 'true'),
    ruleName: stringValue_(params.rule_name || ''),
    sourceChannelName: stringValue_(params.source_channel_name || ''),
    reactionName: stringValue_(params.reaction_name || ''),
    targetChannelName: stringValue_(params.target_channel_name || ''),
    postMode: stringValue_(params.post_mode || 'copy_text'),
    includeSourceLink: stringValue_(params.include_source_link || 'false')
  });
}

function upsertReactionForwardRule_(input) {
  var built = buildReactionForwardRuleRow_(input);
  var sheet = getManagedSheet_('reaction_forward_rules');
  var values = sheet.getDataRange().getValues();
  var rowIndex = 0;

  for (var i = 1; i < values.length; i++) {
    if (stringValue_(values[i][1]).trim() === built.rule.ruleName) {
      rowIndex = i + 1;
      break;
    }
  }

  var action = 'updated';
  if (!rowIndex) {
    rowIndex = Math.max(sheet.getLastRow() + 1, 2);
    action = 'inserted';
  }

  var range = sheet.getRange(rowIndex, 1, 1, built.row.length);
  range.setNumberFormat('@');
  range.setValues([built.row]);

  return {
    action: action,
    row_index: rowIndex,
    rule: built.rule
  };
}

function buildReactionForwardRuleRow_(input) {
  var enabledValue = input.enabled === undefined || stringValue_(input.enabled).trim() === ''
    ? true
    : parseBoolean_(input.enabled);
  var ruleName = stringValue_(input.ruleName).trim();
  var sourceChannelName = stringValue_(input.sourceChannelName).trim();
  var reactionName = normalizeReactionName_(input.reactionName);
  var targetChannelName = stringValue_(input.targetChannelName).trim();
  var postMode = normalizeReactionForwardPostMode_(input.postMode || 'copy_text');
  var includeSourceLink = parseBoolean_(input.includeSourceLink);

  if (!ruleName) {
    throw new Error('reaction_forward_rulesのrule_nameが未設定です。');
  }
  if (!sourceChannelName) {
    throw new Error('reaction_forward_rulesのsource_channel_nameが未設定です: ' + ruleName);
  }
  if (!reactionName) {
    throw new Error('reaction_forward_rulesのreaction_nameが未設定です: ' + ruleName);
  }
  if (!targetChannelName) {
    throw new Error('reaction_forward_rulesのtarget_channel_nameが未設定です: ' + ruleName);
  }
  if (sourceChannelName === targetChannelName) {
    throw new Error('reaction_forward_rulesのsource_channel_nameとtarget_channel_nameが同じです: ' + ruleName);
  }
  if (postMode !== 'copy_text') {
    throw new Error('reaction_forward_rulesのpost_modeはcopy_textのみ対応しています: ' + ruleName);
  }

  var rule = {
    enabled: enabledValue,
    ruleName: ruleName,
    sourceChannelName: sourceChannelName,
    reactionName: reactionName,
    targetChannelName: targetChannelName,
    postMode: postMode,
    includeSourceLink: includeSourceLink
  };

  return {
    row: [
      enabledValue ? 'true' : 'false',
      ruleName,
      sourceChannelName,
      reactionName,
      targetChannelName,
      postMode,
      includeSourceLink ? 'true' : 'false'
    ],
    rule: rule
  };
}

function normalizeReactionForwardPostMode_(value) {
  var mode = normalizeUnicode_(value).trim().toLowerCase();
  return mode || 'copy_text';
}

function buildReactionForwardPostPayload_(message, rule, sourceUrl) {
  var textResult = buildReactionForwardPostText_(message, rule, sourceUrl);
  var blocks = buildReactionForwardPostBlocks_(message, rule, sourceUrl);
  var toc = buildReactionForwardSummaryToc_(textResult.text);
  if (toc.text) {
    textResult.text = insertReactionForwardSummaryTocText_(textResult.text, toc.text);
    blocks = insertReactionForwardSummaryTocBlocks_(blocks, toc.text);
  }
  return {
    text: textResult.text,
    blocks: blocks,
    truncated: textResult.truncated
  };
}

function buildReactionForwardPostText_(message, rule, sourceUrl) {
  var text = normalizeCopiedSlackText_(message.text);
  if (!text) {
    text = extractSlackBlockText_(message.blocks);
  }
  if (rule.includeSourceLink && sourceUrl) {
    text = normalizeCopiedSlackText_(text + '\n\n' + slackLinkText_(sourceUrl, '元投稿を開く'));
  }
  var truncated = false;
  if (text.length > REACTION_FORWARD_MAX_TEXT_LENGTH) {
    text = text.slice(0, REACTION_FORWARD_MAX_TEXT_LENGTH - 18).trim() + '\n\n（本文が長いため省略）';
    truncated = true;
  }
  return {
    text: text,
    truncated: truncated
  };
}

function buildReactionForwardPostBlocks_(message, rule, sourceUrl) {
  var blocks = sanitizeSlackBlocksForForward_(message && message.blocks);
  if (blocks.length && rule.includeSourceLink && sourceUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: slackLinkText_(sourceUrl, '元投稿を開く')
      }
    });
  }
  return blocks.slice(0, REACTION_FORWARD_MAX_BLOCK_COUNT);
}

function buildReactionForwardSummaryToc_(text) {
  var headings = extractReactionForwardTocHeadings_(text);
  if (headings.length < 2) {
    return {
      text: '',
      headings: []
    };
  }
  return {
    text: '*目次*\n' + headings.map(function(heading, index) {
      return (index + 1) + '. ' + heading;
    }).join('\n'),
    headings: headings
  };
}

function extractReactionForwardTocHeadings_(text) {
  var normalizedText = normalizeCopiedSlackText_(text);
  if (!normalizedText || hasReactionForwardToc_(normalizedText)) {
    return [];
  }
  var topLevelHeadings = extractReactionForwardTopLevelTocHeadings_(normalizedText);
  if (topLevelHeadings.length >= 2 && topLevelHeadings.indexOf('要約') !== -1) {
    return topLevelHeadings;
  }
  return extractReactionForwardSummarySubheadings_(normalizedText);
}

function extractReactionForwardTopLevelTocHeadings_(text) {
  var headings = [];
  text.split('\n').forEach(function(line) {
    addReactionForwardTocHeading_(headings, extractReactionForwardSectionHeadingFromLine_(line));
  });

  var knownSectionPattern = /(要約|概要|結論|ポイント|背景|影響|論点|次の対応|対応|決定事項|アクション|TODO|タスク|補足)\s*[:：]/g;
  var match;
  while ((match = knownSectionPattern.exec(text)) !== null) {
    addReactionForwardTocHeading_(headings, match[1]);
  }
  return headings.slice(0, 10);
}

function extractReactionForwardSummarySubheadings_(text) {
  var lines = text.split('\n');
  var summaryIndex = findReactionForwardSummaryLineIndex_(lines);
  if (summaryIndex === -1) {
    return [];
  }

  var headings = [];
  for (var i = summaryIndex + 1; i < lines.length; i += 1) {
    if (isReactionForwardSummaryEndLine_(lines[i])) {
      break;
    }
    addReactionForwardTocHeading_(headings, extractReactionForwardSectionHeadingFromLine_(lines[i]));
  }
  return headings.slice(0, 10);
}

function addReactionForwardTocHeading_(headings, value) {
  var heading = cleanReactionForwardTocHeading_(value);
  if (!heading || headings.indexOf(heading) !== -1) {
    return;
  }
  headings.push(heading);
}

function extractReactionForwardSectionHeadingFromLine_(line) {
  var text = stringValue_(line).trim();
  if (!text || hasReactionForwardToc_(text)) {
    return '';
  }

  var match = text.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/);
  if (match) {
    return match[1];
  }
  match = text.match(/^\s*(?:\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩])\s*(?:\*{1,2}|__)(.+?)(?:\*{1,2}|__)\s*[:：]?\s*$/);
  if (match) {
    return match[1];
  }
  match = text.match(/^\s*(?:[-・]\s*)?(?:\*{1,2}|__)([^*_]{2,80})(?:\*{1,2}|__)\s*[:：]?\s*$/);
  if (match) {
    return match[1];
  }
  match = text.match(/^\s*(?:\d+[.)]\s*)?【([^】]{2,80})】\s*$/);
  if (match) {
    return match[1];
  }
  match = text.match(/^\s*(?:■|◆|◇|●)\s*(.{2,80})\s*$/);
  if (match) {
    return match[1];
  }
  match = text.match(/^\s*(?:\d+[.)]\s*)?(.{2,40})\s*[:：]\s*$/);
  if (match) {
    return match[1];
  }
  return '';
}

function cleanReactionForwardTocHeading_(value) {
  var heading = stringValue_(value)
    .replace(/<[^|>]+\|([^>]+)>/g, '$1')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/^[#>\s]+/g, '')
    .replace(/^\d+[.)]\s*/g, '')
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/g, '')
    .replace(/^[・\-]\s*/g, '')
    .replace(/^【(.+)】$/g, '$1')
    .replace(/^(\*{1,2}|__)(.+)(\*{1,2}|__)$/g, '$2')
    .replace(/\*/g, '')
    .replace(/[:：]\s*$/g, '')
    .trim();
  if (!heading || heading.length < 2 || heading.length > 80) {
    return '';
  }
  if (/https?:\/\/|www\./i.test(heading)) {
    return '';
  }
  if (/[。！？!?]$/.test(heading) && heading.length > 30) {
    return '';
  }
  if (!reactionForwardTocHeadingAllowed_(heading)) {
    return '';
  }
  return heading;
}

function reactionForwardTocHeadingAllowed_(heading) {
  return !/^(リンク|URL|出典|参考|参照|録音|録画|再生|添付|ソース|元投稿を開く)$/.test(heading);
}

function insertReactionForwardSummaryTocText_(text, tocText) {
  if (!tocText || hasReactionForwardToc_(text)) {
    return text;
  }
  var lines = stringValue_(text).split('\n');
  var summaryIndex = findReactionForwardSummaryLineIndex_(lines);
  var insertIndex = summaryIndex === -1 ? 0 : summaryIndex;
  lines.splice(insertIndex, 0, tocText, '');
  return normalizeCopiedSlackText_(lines.join('\n'));
}

function insertReactionForwardSummaryTocBlocks_(blocks, tocText) {
  if (!tocText || !blocks || !blocks.length || hasReactionForwardToc_(extractSlackBlockText_(blocks))) {
    return blocks || [];
  }
  var insertIndex = findReactionForwardSummaryBlockIndex_(blocks);
  if (insertIndex === -1) {
    insertIndex = 0;
  }
  var nextBlocks = blocks.slice();
  nextBlocks.splice(insertIndex, 0, {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: tocText
    }
  });
  return nextBlocks.slice(0, REACTION_FORWARD_MAX_BLOCK_COUNT);
}

function findReactionForwardSummaryBlockIndex_(blocks) {
  for (var i = 0; i < (blocks || []).length; i += 1) {
    if (isReactionForwardSummaryText_(extractSlackBlockText_([blocks[i]]))) {
      return i;
    }
  }
  return -1;
}

function findReactionForwardSummaryLineIndex_(lines) {
  for (var i = 0; i < (lines || []).length; i += 1) {
    if (isReactionForwardSummaryText_(lines[i])) {
      return i;
    }
  }
  return -1;
}

function isReactionForwardSummaryText_(value) {
  var text = cleanReactionForwardTocHeading_(value);
  if (text === '要約' || text === '概要') {
    return true;
  }
  return /(?:^|[\s）)])要約\s*[:：]/.test(stringValue_(value)) ||
    /(?:^|[\s）)])概要\s*[:：]/.test(stringValue_(value));
}

function isReactionForwardSummaryEndLine_(line) {
  var heading = cleanReactionForwardTocHeading_(extractReactionForwardSectionHeadingFromLine_(line));
  return /^(次の対応|対応|決定事項|アクション|TODO|タスク|リンク|URL|出典|参考|参照|録音|録画|再生)$/.test(heading);
}

function hasReactionForwardToc_(text) {
  return /(^|\n)\s*(?:\*{1,2})?目次(?:\*{1,2})?\s*[:：]?\s*(\n|$)/.test(stringValue_(text));
}

function sanitizeSlackBlocksForForward_(blocks) {
  return (blocks || []).map(function(block) {
    return sanitizeSlackBlockForForward_(block);
  }).filter(Boolean);
}

function sanitizeSlackBlockForForward_(block) {
  if (!block || !block.type) {
    return null;
  }
  var allowedTypes = {
    section: true,
    header: true,
    context: true,
    divider: true,
    rich_text: true,
    image: true
  };
  if (!allowedTypes[block.type]) {
    return null;
  }
  var copied = cloneJson_(block);
  removeSlackBlockIds_(copied);
  if (copied.type === 'section' && copied.accessory && copied.accessory.type !== 'image') {
    delete copied.accessory;
  }
  return copied;
}

function removeSlackBlockIds_(value) {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(removeSlackBlockIds_);
    return;
  }
  delete value.block_id;
  Object.keys(value).forEach(function(key) {
    removeSlackBlockIds_(value[key]);
  });
}

function cloneJson_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeCopiedSlackText_(value) {
  return stringValue_(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(function(line) {
      return line.trim();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSlackBlockText_(blocks) {
  var lines = [];
  (blocks || []).forEach(function(block) {
    if (block.type === 'section') {
      lines.push(slackTextObjectText_(block.text));
      (block.fields || []).forEach(function(field) {
        lines.push(slackTextObjectText_(field));
      });
      return;
    }
    if (block.type === 'header') {
      lines.push(slackTextObjectText_(block.text));
      return;
    }
    if (block.type === 'context') {
      lines.push((block.elements || []).map(slackTextObjectText_).filter(Boolean).join(' '));
      return;
    }
    if (block.type === 'rich_text') {
      lines.push(extractSlackRichTextElements_(block.elements));
      return;
    }
    lines.push(slackTextObjectText_(block.text));
  });
  return normalizeCopiedSlackText_(lines.filter(function(line) {
    return normalizeCopiedSlackText_(line);
  }).join('\n\n'));
}

function slackTextObjectText_(textObject) {
  if (!textObject) {
    return '';
  }
  if (typeof textObject === 'string') {
    return textObject;
  }
  if (textObject.text !== undefined) {
    return stringValue_(textObject.text);
  }
  if (textObject.url !== undefined) {
    return stringValue_(textObject.url);
  }
  if (textObject.name !== undefined) {
    return ':' + stringValue_(textObject.name) + ':';
  }
  return '';
}

function extractSlackRichTextElements_(elements) {
  return (elements || []).map(extractSlackRichTextElement_).filter(Boolean).join('\n');
}

function extractSlackRichTextInlineElements_(elements) {
  return (elements || []).map(extractSlackRichTextElement_).filter(Boolean).join('');
}

function extractSlackRichTextElement_(element) {
  if (!element) {
    return '';
  }
  if (element.type === 'rich_text_section') {
    return extractSlackRichTextInlineElements_(element.elements);
  }
  if (element.type === 'text') {
    return stringValue_(element.text);
  }
  if (element.type === 'link') {
    return stringValue_(element.text || element.url);
  }
  if (element.type === 'emoji') {
    return ':' + stringValue_(element.name) + ':';
  }
  if (element.type === 'user') {
    return '<@' + stringValue_(element.user_id) + '>';
  }
  if (element.type === 'channel') {
    return '<#' + stringValue_(element.channel_id) + '>';
  }
  if (element.elements) {
    return extractSlackRichTextElements_(element.elements);
  }
  return slackTextObjectText_(element);
}

function withReactionForwardPostLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function saveReactionForwardPost_(record) {
  var sheet = getManagedSheet_('reaction_forward_posts');
  var row = [
    record.processed_at || nowIso_(),
    record.rule_name || '',
    record.source_channel_name || '',
    record.source_channel_id || '',
    record.source_message_ts || '',
    record.source_url || '',
    record.reaction_name || '',
    record.target_channel_name || '',
    record.target_channel_id || '',
    record.posted_ts || '',
    record.posted_text || '',
    record.post_mode || '',
    String(Boolean(record.include_source_link)),
    String(Boolean(record.dry_run)),
    record.source_reply_count || 0,
    record.posted_reply_count || 0,
    record.reply_error_count || 0
  ].map(function(value) {
    return stringValue_(value);
  });
  var rowIndex = sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, row.length).setNumberFormat('@');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function isReactionForwardAlreadyPosted_(ruleName, sourceChannelId, sourceMessageTs, reactionName, targetChannelId) {
  var sheet = getManagedSheet_('reaction_forward_posts');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }
  for (var i = 1; i < values.length; i += 1) {
    if (reactionForwardPostRowMatches_(values[i], ruleName, sourceChannelId, sourceMessageTs, reactionName, targetChannelId)) {
      return true;
    }
  }
  return false;
}

function reactionForwardPostRowMatches_(row, ruleName, sourceChannelId, sourceMessageTs, reactionName, targetChannelId) {
  var dryRun = parseBoolean_(row[13]);
  if (dryRun) {
    return false;
  }
  return stringValue_(row[1]) === stringValue_(ruleName) &&
    stringValue_(row[3]) === stringValue_(sourceChannelId) &&
    normalizeSlackTsForCompare_(row[4]) === normalizeSlackTsForCompare_(sourceMessageTs) &&
    normalizeReactionName_(row[6]) === normalizeReactionName_(reactionName) &&
    stringValue_(row[8]) === stringValue_(targetChannelId);
}

function refreshReactionForwardPosts_(confirm, limitOverride) {
  if (confirm !== REACTION_FORWARD_CONFIRM_TOKEN) {
    throw new Error('汎用リアクション転送済み投稿の更新には confirm=' + REACTION_FORWARD_CONFIRM_TOKEN + ' が必要です。');
  }

  var sheet = getManagedSheet_('reaction_forward_posts');
  var values = sheet.getDataRange().getValues();
  var limit = Math.max(1, Math.min(parsePositiveInteger_(limitOverride, 10), 50));
  var rulesByName = {};
  readReactionForwardRules_().forEach(function(rule) {
    rulesByName[rule.ruleName] = rule;
  });
  var stats = {
    checked_rows: Math.max(values.length - 1, 0),
    limit: limit,
    considered_count: 0,
    updated_count: 0,
    reposted_count: 0,
    skipped_count: 0,
    empty_message_skipped_count: 0,
    blocks_used_count: 0,
    blocks_fallback_count: 0,
    source_reply_count: 0,
    posted_reply_count: 0,
    reply_error_count: 0,
    error_count: 0,
    last_error: ''
  };

  for (var i = values.length - 1; i >= 1 && stats.considered_count < limit; i -= 1) {
    var row = values[i];
    var dryRun = parseBoolean_(row[13]);
    var ruleName = stringValue_(row[1]);
    var sourceChannelName = stringValue_(row[2]);
    var sourceChannelId = stringValue_(row[3]);
    var sourceMessageTs = stringValue_(row[4]);
    var sourceUrl = stringValue_(row[5]);
    var targetChannelId = stringValue_(row[8]);
    var postedTs = stringValue_(row[9]);
    var existingPostedReplyCount = parsePositiveInteger_(row[15], 0);

    if (dryRun || !ruleName || !sourceChannelId || !sourceMessageTs || !targetChannelId || !postedTs) {
      stats.skipped_count += 1;
      continue;
    }

    stats.considered_count += 1;
    try {
      var rule = rulesByName[ruleName] || {
        ruleName: ruleName,
        sourceChannelName: sourceChannelName || sourceChannelId,
        reactionName: normalizeReactionName_(row[6]),
        targetChannelName: stringValue_(row[7]) || targetChannelId,
        postMode: normalizeReactionForwardPostMode_(row[11]),
        includeSourceLink: parseBoolean_(row[12])
      };
      var message = getChannelMessageByTs_(sourceChannelId, sourceMessageTs);
      if (!sourceUrl) {
        sourceUrl = getPermalink(sourceChannelId, sourceMessageTs);
      }
      var postPayload = buildReactionForwardPostPayload_(message, rule, sourceUrl);
      if (!postPayload.text) {
        stats.empty_message_skipped_count += 1;
        continue;
      }
      var updateResponse;
      try {
        updateResponse = updateReactionForwardPayload_(
          targetChannelId,
          postedTs,
          postPayload,
          'refreshReactionForwardPost:' + ruleName + ':' + postedTs
        );
        stats.updated_count += 1;
      } catch (error) {
        if (!isSlackMessageNotFoundError_(error)) {
          throw error;
        }
        saveError('refreshReactionForwardPost:repost_missing_target:' + ruleName + ':' + postedTs, error);
        updateResponse = postReactionForwardPayload_(
          targetChannelId,
          postPayload,
          'refreshReactionForwardPost:repost_missing_target:' + ruleName + ':' + sourceMessageTs
        );
        postedTs = updateResponse.ts || postedTs;
        sheet.getRange(i + 1, 10).setNumberFormat('@');
        sheet.getRange(i + 1, 10).setValue(postedTs);
        stats.reposted_count += 1;
      }
      sheet.getRange(i + 1, 6).setNumberFormat('@');
      sheet.getRange(i + 1, 6).setValue(sourceUrl);
      sheet.getRange(i + 1, 11).setNumberFormat('@');
      sheet.getRange(i + 1, 11).setValue(postPayload.text);
      if (existingPostedReplyCount === 0) {
        var replyForwardResult = forwardReactionForwardReplies_(
          sourceChannelId,
          sourceMessageTs,
          targetChannelId,
          postedTs,
          rule,
          stats,
          'refreshReactionForwardReplies:' + ruleName + ':' + postedTs
        );
        sheet.getRange(i + 1, 15, 1, 3).setNumberFormat('@');
        sheet.getRange(i + 1, 15, 1, 3).setValues([[
          replyForwardResult.source_reply_count,
          replyForwardResult.posted_reply_count,
          replyForwardResult.reply_error_count
        ]]);
      }
      if (updateResponse.reaction_forward_used_blocks) {
        stats.blocks_used_count += 1;
      }
      if (updateResponse.reaction_forward_blocks_fallback) {
        stats.blocks_fallback_count += 1;
      }
    } catch (error) {
      stats.error_count += 1;
      stats.last_error = error && error.message ? error.message : String(error);
      saveError('refreshReactionForwardPost:' + ruleName + ':' + postedTs, error);
    }
  }

  return stats;
}

function isAlreadyLinked(targetChannelId, targetThreadTs, sourceUrl, targetUrl) {
  var sheet = getManagedSheet_('linked_threads');
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
  var sheet = getManagedSheet_('linked_threads');
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
  var sheet = getManagedSheet_('run_logs');
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

function saveScheduledRunLog_(result) {
  try {
    var sheet = getManagedSheet_('scheduled_run_logs');
    sheet.appendRow([
      result.started_at || '',
      result.finished_at || nowIso_(),
      result.elapsed_seconds || 0,
      String(Boolean(result.completed)),
      String(Boolean(result.deadline_reached)),
      result.error_count || 0,
      result.invoice_forwarding && result.invoice_forwarding.posted_count || 0,
      result.invoice_forwarding && result.invoice_forwarding.channels_deferred || 0,
      result.reaction_forwarding && result.reaction_forwarding.posted_count || 0,
      result.vehicle_monitoring && result.vehicle_monitoring.synced || 0,
      result.vehicle_linking && result.vehicle_linking.posted_count || 0,
      String(Boolean(result.vehicle_linking && result.vehicle_linking.deadline_reached)),
      result.phase_order || ''
    ]);
  } catch (error) {
    Logger.log('scheduled_run_logsへの保存に失敗: ' + (error && error.message ? error.message : error));
  }
}

function saveError(context, error) {
  var sheet = getManagedSheet_('errors');
  var message = error && error.message ? error.message : String(error);
  var raw = error && error.rawResponse ? error.rawResponse : '';
  sheet.appendRow([nowIso_(), context || '', message, raw]);
}

function saveSlackReactionEventLog_(stats) {
  try {
    var sheet = getManagedSheet_('slack_reaction_events');
    sheet.appendRow([
      nowIso_(),
      stats.event_type || '',
      stats.reaction_name || '',
      stats.item_type || '',
      stats.source_channel_id || '',
      stats.source_channel_name || '',
      stats.source_message_ts || '',
      stats.matching_rule_count || 0,
      String(Boolean(stats.should_check_invoice)),
      String(Boolean(stats.invoice_source_allowed)),
      stats.reason || '',
      stats.candidates_found || 0,
      stats.posted_count || 0,
      stats.planned_count || 0,
      stats.duplicate_skipped_count || 0,
      stats.error_count || 0,
      stats.last_error || '',
      stats.matching_invoice_route_count || 0
    ]);
  } catch (error) {
    Logger.log('slack_reaction_eventsへの保存に失敗: ' + (error && error.message ? error.message : error));
  }
}

function saveDryRunLog(record) {
  var sheet = getManagedSheet_('dry_run_logs');
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
  var sheet = getManagedSheet_('invoice_reaction_posts');
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

function readInvoiceChannelScanState_() {
  var sheet = getManagedSheet_('invoice_channel_scan_state');
  var values = sheet.getDataRange().getValues();
  var stateByChannelId = {};
  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var channelId = stringValue_(row[1]);
    if (!channelId) {
      continue;
    }
    stateByChannelId[channelId] = {
      source_channel_name: stringValue_(row[0]),
      source_channel_id: channelId,
      last_checked_at: stringValue_(row[2]),
      last_full_scan_at: stringValue_(row[3]),
      last_scanned_latest_ts: stringValue_(row[4]),
      last_seen_latest_ts: stringValue_(row[5]),
      messages_checked: parsePositiveInteger_(row[6], 0),
      reply_threads_checked: parsePositiveInteger_(row[7], 0),
      reply_messages_checked: parsePositiveInteger_(row[8], 0),
      candidates_found: parsePositiveInteger_(row[9], 0),
      posted_count: parsePositiveInteger_(row[10], 0),
      planned_count: parsePositiveInteger_(row[11], 0),
      duplicate_skipped_count: parsePositiveInteger_(row[12], 0),
      skipped_unchanged: parseBoolean_(row[13]),
      last_error: stringValue_(row[14]),
      dry_run: parseBoolean_(row[15]),
      history_pages_scanned: parsePositiveInteger_(row[16], 0),
      route_signature: stringValue_(row[17])
    };
  }
  return stateByChannelId;
}

function saveInvoiceChannelScanState_(record) {
  var sheet = getManagedSheet_('invoice_channel_scan_state');
  var row = [
    record.source_channel_name || '',
    record.source_channel_id || '',
    record.last_checked_at || nowIso_(),
    record.last_full_scan_at || '',
    record.last_scanned_latest_ts || '',
    record.last_seen_latest_ts || '',
    record.messages_checked || 0,
    record.reply_threads_checked || 0,
    record.reply_messages_checked || 0,
    record.candidates_found || 0,
    record.posted_count || 0,
    record.planned_count || 0,
    record.duplicate_skipped_count || 0,
    String(Boolean(record.skipped_unchanged)),
    record.last_error || '',
    String(Boolean(record.dry_run)),
    record.history_pages_scanned || 0,
    record.route_signature || ''
  ].map(function(value) {
    return stringValue_(value);
  });
  var rowIndex = findRowByValue_(sheet, 2, record.source_channel_id);
  if (!rowIndex) {
    rowIndex = sheet.getLastRow() + 1;
  }
  sheet.getRange(rowIndex, 1, 1, row.length).setNumberFormat('@');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function isInvoiceAlreadyPosted_(sourceChannelId, sourceMessageTs, fileId, reactionName, targetChannelId, targetChannelName) {
  var sheet = getManagedSheet_('invoice_reaction_posts');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }
  for (var i = 1; i < values.length; i += 1) {
    if (invoiceReactionPostRowMatches_(
      values[i],
      sourceChannelId,
      sourceMessageTs,
      fileId,
      reactionName,
      targetChannelId,
      targetChannelName
    )) {
      return true;
    }
  }
  return false;
}

function invoiceReactionPostRowMatches_(row, sourceChannelId, sourceMessageTs, fileId, reactionName, targetChannelId, targetChannelName) {
  if (parseBoolean_(row[12])) {
    return false;
  }
  var storedTargetChannelId = stringValue_(row[9]);
  var targetMatches = stringValue_(targetChannelId)
    ? (
      storedTargetChannelId === stringValue_(targetChannelId) ||
      (!storedTargetChannelId && Boolean(targetChannelName) &&
        channelNameMatches_({name: stringValue_(row[8])}, targetChannelName))
    )
    : channelNameMatches_({name: stringValue_(row[8])}, targetChannelName);
  return (
    stringValue_(row[2]) === stringValue_(sourceChannelId) &&
    normalizeSlackTsForCompare_(row[3]) === normalizeSlackTsForCompare_(sourceMessageTs) &&
    stringValue_(row[5]) === stringValue_(fileId) &&
    normalizeReactionName_(row[7]) === normalizeReactionName_(reactionName) &&
    targetMatches
  );
}

function refreshInvoicePostPreviews_(confirm) {
  if (confirm !== INVOICE_FORWARD_CONFIRM_TOKEN) {
    throw new Error('請求書転送投稿の更新には confirm=' + INVOICE_FORWARD_CONFIRM_TOKEN + ' が必要です。');
  }

  var sheet = getManagedSheet_('invoice_reaction_posts');
  var values = sheet.getDataRange().getValues();
  var stats = {
    checked_rows: Math.max(values.length - 1, 0),
    updated_count: 0,
    skipped_count: 0,
    error_count: 0
  };

  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var sourceUrl = stringValue_(row[4]);
    var fileName = stringValue_(row[6]);
    var targetChannelId = stringValue_(row[9]);
    var postedTs = stringValue_(row[10]);
    var dryRun = parseBoolean_(row[12]);

    if (dryRun || !sourceUrl || !targetChannelId || !postedTs) {
      stats.skipped_count += 1;
      continue;
    }

    try {
      var text = invoiceForwardMessage_(fileName, sourceUrl);
      var attachments = invoiceRecordAttachments_(fileName, sourceUrl, row[7]);
      updateChannelMessage(targetChannelId, postedTs, text, attachments);
      sheet.getRange(i + 1, 12).setNumberFormat('@');
      sheet.getRange(i + 1, 12).setValue(text);
      stats.updated_count += 1;
    } catch (error) {
      stats.error_count += 1;
      saveError('refreshInvoicePostPreview:' + postedTs, error);
    }
  }

  return stats;
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

function testInvoiceForwardFallback_() {
  var sourceUrl = 'https://slack.test/archives/C/p1000000000000000';
  assertTest_(invoiceForwardMessage_('', sourceUrl) === '<https://slack.test/archives/C/p1000000000000000|元投稿を開く>', 'invoice without PDF must forward only the source link');
  assertTest_(
    invoiceForwardDedupKey_({ts: '100.1'}, null) === 'no-pdf:100.100000',
    'invoice without PDF must dedupe by source message timestamp'
  );
  assertTest_(invoiceRecordAttachments_('', sourceUrl).length === 1, 'invoice preview attachment must be generated');
  assertTest_(
    invoiceRecordAttachments_('', sourceUrl, 'rocket')[0].title === 'ロケット付き元投稿',
    'rocket preview title must remain unchanged'
  );
  assertTest_(
    invoiceRecordAttachments_('', sourceUrl, 'flying_saucer')[0].title === 'UFO付き元投稿',
    'UFO preview title must identify the UFO route'
  );
}

function testInvoiceSettingsParsing_() {
  assertTest_(
    JSON.stringify(parseInvoiceSourceChannelNames_({INVOICE_SOURCE_CHANNEL_NAMES: '依頼＿ALL, 経理,依頼＿ALL'})) === JSON.stringify(['依頼＿ALL', '経理']),
    'invoice source channel names must be comma-separated and deduplicated'
  );
  assertTest_(
    JSON.stringify(parseInvoiceSourceChannelNames_({INVOICE_SOURCE_CHANNEL_NAME: '依頼＿ALL'})) === JSON.stringify(['依頼＿ALL']),
    'legacy invoice source channel name must still work'
  );
  assertTest_(
    JSON.stringify(parseInvoiceSourceChannelNames_({})) === JSON.stringify(parseCommaSeparatedSetting_(DEFAULT_SETTINGS.INVOICE_SOURCE_CHANNEL_NAMES)),
    'missing invoice source setting must default to explicit invoice channels'
  );
  var defaultInvoiceSources = parseCommaSeparatedSetting_(DEFAULT_SETTINGS.INVOICE_SOURCE_CHANNEL_NAMES);
  assertTest_(defaultInvoiceSources.length === 5, 'default invoice source setting must contain exactly five active channels');
  assertTest_(defaultInvoiceSources.indexOf('依頼_引き継ぎ') === -1, 'archived handover channel must not be a default invoice source');
  assertTest_(DEFAULT_SETTINGS.INVOICE_FORCE_RESCAN_HOURS === '1', 'invoice full recovery must run hourly by default');
  assertTest_(
    invoiceLastFullScanAt_({last_full_scan_at: '2026-07-30T01:00:00.000Z'}, true, '2026-07-30T02:00:00.000Z') ===
      '2026-07-30T01:00:00.000Z',
    'incremental scans must preserve the previous full-scan timestamp'
  );
  assertTest_(
    invoiceLastFullScanAt_({last_full_scan_at: '2026-07-30T01:00:00.000Z'}, false, '2026-07-30T02:00:00.000Z') ===
      '2026-07-30T02:00:00.000Z',
    'full scans must advance the full-scan timestamp'
  );
  assertTest_(settingUpgradeMatches_('3', {from: ['6', '3']}), 'three-hour invoice recovery must migrate to hourly');
  assertTest_(settingUpgradeMatches_('6', {from: ['6', '3']}), 'six-hour invoice recovery must migrate to hourly');
  assertTest_(!settingUpgradeMatches_('2', {from: ['6', '3']}), 'custom invoice recovery intervals must remain unchanged');
  assertTest_(parseTriggerIntervalHours_('hourly') === 1, 'hourly trigger setting must parse as 1 hour');
  assertTest_(parseTriggerIntervalHours_('') === 0, 'blank trigger interval must fall back to daily hour list');
  assertTest_(invoiceRuntimeGuardSeconds_(300) === 180, 'invoice runtime guard must reserve time before the web execution limit');
  assertTest_(invoiceRuntimeGuardSeconds_(60) === 30, 'invoice runtime guard must keep a minimum safety reserve for short runs');
  var selectedChannels = filterInvoiceSourceChannels_([
    {name: 'source-one', id: 'C1'},
    {name: 'source-two', id: 'C2'}
  ], ['source-two']);
  assertTest_(selectedChannels.length === 1 && selectedChannels[0].id === 'C2', 'targeted invoice runs must select only the requested channel');
  assertTest_(
    findSlackMessageByTs_([{ts: '100.1'}, {ts: '200.2'}], '200.200000').ts === '200.2',
    'targeted invoice messages must match normalized Slack timestamps'
  );
}

function testInvoiceForwardRoutes_() {
  assertTest_(
    SHEET_HEADERS.slack_reaction_events[SHEET_HEADERS.slack_reaction_events.length - 1] === 'matching_invoice_route_count',
    'new Slack reaction event fields must be appended to preserve legacy rows'
  );
  var routes = readInvoiceForwardRoutesFromValues_([
    SHEET_HEADERS.invoice_forward_routes,
    ['true', 'invoice_rocket', ':ROCKET:', '依頼＿請求書'],
    ['true', 'payment_ufo', ':Flying_Saucer:', '依頼_振込'],
    ['false', 'disabled_route', 'white_check_mark', '確認'],
    ['true', 'payment_ufo', 'flying_saucer', '重複先'],
    ['true', '', 'eyes', '空名']
  ]);
  var runnable = routes.filter(invoiceForwardRouteIsRunnable_);
  assertTest_(routes.length === 5, 'invoice route parser must retain configured rows');
  assertTest_(runnable.length === 2, 'invoice route parser must expose only two runnable routes');
  assertTest_(routes[3].validationError === 'duplicate_route_name', 'duplicate invoice route names must be invalid');
  assertTest_(routes[4].validationError === 'route_name_required', 'blank invoice route names must be invalid');
  assertTest_(runnable[1].reactionName === 'flying_saucer', 'UFO reaction name must normalize to flying_saucer');
  assertTest_(
    findMatchingInvoiceForwardRoutesFromRoutes_(runnable, ':FLYING_SAUCER:')[0].routeName === 'payment_ufo',
    'UFO reaction must select only the payment route'
  );
  assertTest_(
    findMatchingInvoiceForwardRoutesFromRoutes_(runnable, 'rocket')[0].routeName === 'invoice_rocket',
    'rocket reaction must keep the legacy invoice route'
  );
  assertTest_(
    invoiceForwardRouteSignature_(runnable) !== invoiceForwardRouteSignature_([runnable[0]]),
    'invoice route signature must change when the UFO route is added'
  );
  assertTest_(
    invoiceRouteConfigurationChanged_({route_signature: 'old'}, invoiceForwardRouteSignature_(runnable)),
    'changed invoice route signature must force a channel rescan'
  );
  assertTest_(
    addLegacyInvoiceForwardRoute_(
      [runnable[1]],
      {
        invoiceForwardEnabled: true,
        invoiceReactionName: 'rocket',
        invoiceTargetChannelName: '依頼＿請求書'
      }
    )[0].routeName === 'invoice_rocket',
    'legacy rocket settings must remain available when the route row is absent'
  );

  var postedRow = [
    '', '', 'C_SOURCE', '100.100000', '', 'pdf-1', 'payment.pdf',
    'flying_saucer', '依頼_振込', 'C_TARGET', '', '', 'false'
  ];
  assertTest_(
    invoiceReactionPostRowMatches_(
      postedRow,
      'C_SOURCE',
      '100.1',
      'pdf-1',
      ':FLYING_SAUCER:',
      'C_TARGET',
      '依頼_振込'
    ),
    'invoice duplicate row must match the same target channel'
  );
  assertTest_(
    !invoiceReactionPostRowMatches_(
      postedRow,
      'C_SOURCE',
      '100.1',
      'pdf-1',
      'flying_saucer',
      'C_OTHER_TARGET',
      '別の転送先'
    ),
    'invoice duplicate row must not match a different target channel'
  );
  var legacyTargetRow = postedRow.slice();
  legacyTargetRow[9] = '';
  assertTest_(
    invoiceReactionPostRowMatches_(
      legacyTargetRow,
      'C_SOURCE',
      '100.1',
      'pdf-1',
      'flying_saucer',
      'C_TARGET',
      '依頼_振込'
    ),
    'legacy invoice rows with a blank target ID must fall back to the target name'
  );
  var dryRunRow = postedRow.slice();
  dryRunRow[12] = 'true';
  assertTest_(
    !invoiceReactionPostRowMatches_(
      dryRunRow,
      'C_SOURCE',
      '100.1',
      'pdf-1',
      'flying_saucer',
      'C_TARGET',
      '依頼_振込'
    ),
    'invoice dry-run history must not block a production post'
  );

  var sourceResolution = resolveInvoiceSourceChannelsFromAvailable_(
    {
      invoiceSourceAllJoinedChannels: false,
      invoiceSourceChannelNames: ['source-one', 'missing-source', 'source-two']
    },
    [{id: 'C_TARGET', name: '依頼_振込'}],
    [
      {id: 'C1', name: 'source-one', is_member: true},
      {id: 'C_TARGET', name: '依頼_振込', is_member: true},
      {id: 'C2', name: 'source-two', is_member: true}
    ]
  );
  assertTest_(sourceResolution.channels.length === 2, 'resolved invoice sources must continue around one missing channel');
  assertTest_(sourceResolution.unresolved.length === 1, 'missing invoice source must remain in diagnostics');
  assertTest_(sourceResolution.unresolved[0].configured_name === 'missing-source', 'missing invoice source name must be preserved');

  var seededRows = [];
  var fakeRouteSheet = {
    getLastRow: function() { return 1; },
    getRange: function() {
      return {
        setNumberFormat: function() {},
        setValues: function(values) { seededRows = values; }
      };
    }
  };
  var fakeSettingsSheet = {
    getDataRange: function() {
      return {
        getValues: function() {
          return [
            SHEET_HEADERS.settings,
            ['INVOICE_REACTION_NAME', 'rocket', ''],
            ['INVOICE_TARGET_CHANNEL_NAME', '依頼＿請求書', '']
          ];
        }
      };
    }
  };
  seedInvoiceForwardRoutes_(fakeRouteSheet, fakeSettingsSheet);
  assertTest_(seededRows.length === 2, 'invoice route seeding must create exactly two initial routes');
  assertTest_(seededRows[1][1] === 'payment_ufo', 'invoice route seeding must include the UFO route');
  var existingRouteTouched = false;
  seedInvoiceForwardRoutes_({
    getLastRow: function() { return 2; },
    getRange: function() {
      existingRouteTouched = true;
      return {};
    }
  }, fakeSettingsSheet);
  assertTest_(!existingRouteTouched, 'invoice route seeding must not overwrite existing rows');

  var disabledRouteInput = buildInvoiceForwardRouteWebInput_(
    {enabled: 'false', route_name: 'payment_ufo'},
    runnable
  );
  assertTest_(disabledRouteInput.enabled === false, 'route management must parse enabled=false');
  assertTest_(
    disabledRouteInput.reactionName === 'flying_saucer' &&
      disabledRouteInput.targetChannelName === '依頼_振込',
    'disabling a route must reuse its existing reaction and target without Slack resolution'
  );

  var routeContext = {
    route: runnable[1],
    targetChannel: {id: 'C_TARGET', name: '依頼_振込'}
  };
  var sampleStats = {
    reply_threads_checked: 0,
    reply_messages_checked: 0,
    error_count: 0,
    message_samples: []
  };
  addInvoiceRouteMessageSamples_(
    sampleStats,
    {ts: '200.1', reactions: [{name: 'flying_saucer'}], files: []},
    [routeContext],
    'root',
    '200.1'
  );
  var processedReplies = [];
  var replyScanIncomplete = scanInvoiceThreadRepliesForForward_(
    {ts: '200.1', reply_count: 1},
    {id: 'C_SOURCE', name: 'source-one'},
    [routeContext],
    {invoiceReplyThreadLimit: 25},
    sampleStats,
    true,
    function() { return false; },
    {
      getThreadMessages: function() {
        return [
          {ts: '200.1'},
          {ts: '200.2', thread_ts: '200.1', reactions: [{name: 'flying_saucer'}], files: []}
        ];
      },
      processMessage: function(message) {
        processedReplies.push(message.ts);
      }
    }
  );
  assertTest_(!replyScanIncomplete, 'UFO reply scan must complete without a deadline');
  assertTest_(processedReplies.length === 1 && processedReplies[0] === '200.2', 'UFO reply scan must process the reply but not the root twice');
  assertTest_(sampleStats.message_samples[0].scope === 'root', 'UFO route must recognize a root message');
  assertTest_(sampleStats.message_samples[1].scope === 'reply', 'UFO route must recognize a reply message');
  assertTest_(
    invoiceForwardMessage_('payment.pdf', 'https://slack.test/source').indexOf('payment.pdf') !== -1,
    'invoice PDF payload must include the PDF file name'
  );
  assertTest_(
    invoiceForwardMessage_('', 'https://slack.test/source').indexOf('https://slack.test/source') !== -1,
    'invoice link-only payload must include the source message link'
  );
}

function testReactionForwarding_() {
  var rules = readReactionForwardRulesFromValues_([
    SHEET_HEADERS.reaction_forward_rules,
    ['true', 'assistant_articles', 'アシスタント', ':Share-News:', '記事共有', 'copy_text', 'false']
  ]);
  assertTest_(rules.length === 1, 'reaction forward rule must parse one row');
  assertTest_(rules[0].enabled === true, 'reaction forward rule enabled flag must parse');
  assertTest_(rules[0].reactionName === 'share-news', 'reaction forward reaction name must normalize');
  assertTest_(rules[0].includeSourceLink === false, 'reaction forward include_source_link must parse false');

  var builtRule = buildReactionForwardRuleRow_({
    enabled: '',
    ruleName: 'assistant_articles',
    sourceChannelName: 'アシスタント',
    reactionName: ':輪っか:',
    targetChannelName: '電話対応',
    postMode: '',
    includeSourceLink: ''
  });
  assertTest_(builtRule.row[0] === 'true', 'reaction forward web rule must default to enabled');
  assertTest_(builtRule.row[3] === '輪っか', 'reaction forward web rule must normalize custom emoji name');
  assertTest_(builtRule.row[4] === '電話対応', 'reaction forward web rule must preserve target channel name');

  var textResult = buildReactionForwardPostText_({
    text: '  見出し  \n\n\n 本文です  '
  }, rules[0], '');
  assertTest_(textResult.text === '見出し\n\n本文です', 'reaction forward text must be cleaned');

  var blockText = buildReactionForwardPostText_({
    text: '',
    blocks: [
      {type: 'header', text: {type: 'plain_text', text: '記事タイトル'}},
      {type: 'section', text: {type: 'mrkdwn', text: '*要約本文*'}},
      {type: 'context', elements: [{type: 'mrkdwn', text: '補足'}]}
    ]
  }, rules[0], '');
  assertTest_(blockText.text === '記事タイトル\n\n*要約本文*\n\n補足', 'reaction forward blocks must become copy text');

  var blockPayload = buildReactionForwardPostPayload_({
    text: '',
    blocks: [
      {type: 'header', block_id: 'old-header', text: {type: 'plain_text', text: '記事タイトル'}},
      {
        type: 'section',
        block_id: 'old-section',
        text: {type: 'mrkdwn', text: '*要約本文*'},
        accessory: {type: 'button', action_id: 'open', text: {type: 'plain_text', text: '開く'}}
      },
      {type: 'actions', elements: [{type: 'button', action_id: 'skip', text: {type: 'plain_text', text: '不要'}}]}
    ]
  }, rules[0], '');
  assertTest_(blockPayload.blocks.length === 2, 'reaction forward payload must keep text blocks only');
  assertTest_(blockPayload.blocks[0].block_id === undefined, 'reaction forward payload must remove block_id');
  assertTest_(!blockPayload.blocks[1].accessory, 'reaction forward payload must remove non-image accessories');

  var linkRule = {
    ruleName: rules[0].ruleName,
    sourceChannelName: rules[0].sourceChannelName,
    reactionName: rules[0].reactionName,
    targetChannelName: rules[0].targetChannelName,
    postMode: rules[0].postMode,
    includeSourceLink: true
  };
  var linkPayload = buildReactionForwardPostPayload_({
    text: '',
    blocks: [{type: 'section', text: {type: 'mrkdwn', text: '本文'}}]
  }, linkRule, 'https://slack.test/archives/C/p1000000000000000');
  assertTest_(linkPayload.blocks.length === 2, 'reaction forward payload must append source link block when requested');

  var sectionTocPayload = buildReactionForwardPostPayload_({
    text: 'zoom要約(26秒): 要約: 内容です。\n\n次の対応: 確認する\n\nリンク: <https://example.test|録音を再生>'
  }, rules[0], '');
  assertTest_(sectionTocPayload.text.indexOf('*目次*\n1. 要約\n2. 次の対応') !== -1, 'reaction forward payload must add TOC from summary section labels');
  assertTest_(sectionTocPayload.text.indexOf('3. リンク') === -1, 'reaction forward TOC must exclude link-only labels');

  var articleTocPayload = buildReactionForwardPostPayload_({
    text: '',
    blocks: [
      {type: 'header', text: {type: 'plain_text', text: '記事タイトル'}},
      {type: 'section', text: {type: 'mrkdwn', text: '要約:\n### 背景\n本文\n### 影響\n本文'}}
    ]
  }, rules[0], '');
  assertTest_(articleTocPayload.text.indexOf('2. 背景') !== -1, 'reaction forward payload must add TOC from article subheadings');
  assertTest_(articleTocPayload.blocks.length === 3, 'reaction forward TOC must be inserted as a Slack block');
  assertTest_(articleTocPayload.blocks[1].text.text.indexOf('*目次*') !== -1, 'reaction forward TOC block must be inserted before summary blocks');

  var replyMessages = reactionForwardReplyMessagesFromThread_([
    {ts: '100.100000', text: 'root'},
    {ts: '100.200000', text: 'コメント1'},
    {
      ts: '100.300000',
      text: '',
      blocks: [{type: 'section', text: {type: 'mrkdwn', text: '*コメント2*'}}]
    }
  ], '100.1');
  assertTest_(replyMessages.length === 2, 'reaction forward replies must exclude the root message');

  var replyStats = makeReactionForwardStats_(false);
  var postedReplies = [];
  var replyResult = forwardReactionForwardReplyMessages_(
    replyMessages,
    'C_TARGET',
    '200.100000',
    rules[0],
    replyStats,
    'testReactionForwardReplies',
    function(postPayload) {
      postedReplies.push(postPayload);
      return {
        ts: 'reply.' + postedReplies.length,
        reaction_forward_used_blocks: Boolean(postPayload.blocks && postPayload.blocks.length),
        reaction_forward_blocks_fallback: false
      };
    }
  );
  assertTest_(replyResult.source_reply_count === 2, 'reaction forward reply source count must be recorded');
  assertTest_(replyResult.posted_reply_count === 2, 'reaction forward replies must be posted');
  assertTest_(postedReplies[1].blocks.length === 1, 'reaction forward reply blocks must be preserved');
  assertTest_(replyStats.posted_reply_count === 2, 'reaction forward reply stats must be merged');

  var manyReplies = [];
  for (var replyIndex = 0; replyIndex < 22; replyIndex += 1) {
    manyReplies.push({ts: '101.' + replyIndex, text: 'コメント' + replyIndex});
  }
  var manyPosted = [];
  var manyReplyResult = forwardReactionForwardReplyMessages_(
    manyReplies,
    'C_TARGET',
    '201.100000',
    rules[0],
    makeReactionForwardStats_(false),
    'testReactionForwardManyReplies',
    function(postPayload) {
      manyPosted.push(postPayload);
      return {
        ts: 'many.' + manyPosted.length,
        reaction_forward_used_blocks: false,
        reaction_forward_blocks_fallback: false
      };
    }
  );
  assertTest_(manyReplyResult.source_reply_count === 22, 'reaction forward reply source count must include omitted replies');
  assertTest_(manyReplyResult.posted_reply_count === REACTION_FORWARD_MAX_REPLY_COUNT, 'reaction forward replies must be capped');
  assertTest_(manyPosted.length === REACTION_FORWARD_MAX_REPLY_COUNT + 1, 'reaction forward omitted reply notice must be posted');
  assertTest_(manyPosted[manyPosted.length - 1].text.indexOf('残り2件は省略') !== -1, 'reaction forward omitted reply notice must include omitted count');

  var fallbackErrors = [];
  var fallbackResponse = sendReactionForwardPayloadWithFallback_(
    {text: '本文', blocks: [{type: 'section', text: {type: 'mrkdwn', text: '*本文*'}}]},
    'testReactionForwardBlocksFallback',
    function() {
      var error = new Error('Slack API error on chat.postMessage: invalid_blocks');
      error.rawResponse = '{"ok":false,"error":"invalid_blocks"}';
      throw error;
    },
    function() {
      return {ts: 'fallback.1'};
    },
    function(context) {
      fallbackErrors.push(context);
    }
  );
  assertTest_(fallbackResponse.reaction_forward_blocks_fallback === true, 'reaction forward block failure must fall back to text');
  assertTest_(fallbackErrors.length === 1, 'reaction forward block fallback must record an error');

  var richText = buildReactionForwardPostText_({
    text: '',
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {type: 'rich_text_section', elements: [{type: 'text', text: '記事'}, {type: 'text', text: '本文'}]}
        ]
      }
    ]
  }, rules[0], '');
  assertTest_(richText.text === '記事本文', 'reaction forward rich text inline elements must stay inline');

  assertTest_(
    reactionForwardPostRowMatches_(
      ['', 'assistant_articles', 'アシスタント', 'C_SOURCE', '100.100000', '', 'share-news', '記事共有', 'C_TARGET', '', '', 'copy_text', 'false', 'false'],
      'assistant_articles',
      'C_SOURCE',
      '100.1',
      'share-news',
      'C_TARGET'
    ),
    'reaction forward duplicate row must match normalized timestamp'
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
  testInvoiceForwardFallback_();
  testInvoiceSettingsParsing_();
  testInvoiceForwardRoutes_();
  testReactionForwarding_();
  testScheduledRuntimeGuards_();
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

function testScheduledRuntimeGuards_() {
  var nowMs = 100000;
  assertTest_(!runtimeDeadlineReached_(nowMs + 1, nowMs), 'runtime deadline must remain open before deadline');
  assertTest_(runtimeDeadlineReached_(nowMs, nowMs), 'runtime deadline must close at deadline');
  assertTest_(!runtimeDeadlineReached_(0, nowMs), 'empty runtime deadline must remain open');
  assertTest_(
    shouldStopInvoiceRun_(nowMs - 1000, 300, nowMs - 1),
    'invoice runtime guard must honor the scheduled deadline'
  );
  var phaseDeadline = scheduledPhaseDeadline_(nowMs + 60000, 120);
  assertTest_(phaseDeadline <= nowMs + 60000, 'phase deadline must not exceed the hard deadline');
  assertTest_(scheduledPhaseErrorCount_({error_count: 2}) === 2, 'scheduled phase errors must be included in the run summary');
  assertTest_(scheduledPhaseErrorCount_({}) === 0, 'missing scheduled phase errors must count as zero');
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

function runWithMode_(dryRun, onlyVin, lookbackDaysOverride, maxThreadsPerChannel, runtimeDeadlineMs) {
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
    channels_deferred: 0,
    deadline_reached: false,
    max_threads_per_channel: maxThreadsPerChannel || 0,
    error_count: 0,
    plannedKeys: {}
  };

  try {
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
    for (var channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
        stats.deadline_reached = true;
        stats.channels_deferred = channels.length - channelIndex;
        break;
      }
      var channel = channels[channelIndex];
      try {
        var scan = getRecentThreadsWithStats_(
          channel.id,
          lookbackDaysOverride || settings.lookbackDays,
          maxThreadsPerChannel,
          function() {
            return runtimeDeadlineReached_(runtimeDeadlineMs);
          }
        );
        stats.expired_skipped_count += scan.expiredSkipped;
        scan.threads.forEach(function(thread) {
          thread.role = channel.role;
          thread.configuredChannelName = channel.name;
          allThreads.push(thread);
        });
        if (scan.deadline_reached) {
          stats.deadline_reached = true;
          stats.channels_deferred = channels.length - channelIndex;
          break;
        }
      } catch (error) {
        stats.error_count += 1;
        saveError('getRecentThreads:' + channel.name, error);
      }
    }

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

    for (var linkKeyIndex = 0; linkKeyIndex < linkKeys.length; linkKeyIndex += 1) {
      if (runtimeDeadlineReached_(runtimeDeadlineMs)) {
        stats.deadline_reached = true;
        break;
      }
      var linkKey = linkKeys[linkKeyIndex];
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
    }
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
      memo: [
        dryRun ? 'dry_run planned_count=' + stats.planned_count : '',
        stats.deadline_reached ? 'deadline_reached=true' : '',
        maxThreadsPerChannel ? 'max_threads_per_channel=' + maxThreadsPerChannel : ''
      ].filter(function(value) {
        return Boolean(value);
      }).join(' ')
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

    postThreadMessage(action.target.channelId, action.target.threadTs, action.text, linkActionAttachments_(action, sourceUrl));
    saveLinkedThread(record);
    stats.posted_count += 1;
  } catch (error) {
    stats.error_count += 1;
    saveError('executeLinkAction:' + action.relationType + ':' + action.vin, error);
  }
}

function getRecentThreadsWithStats_(channelId, lookbackDays, maxThreads, shouldStop) {
  var cutoffTs = cutoffSlackTs_(lookbackDays);
  var threadTsMap = {};
  var expiredSkipped = 0;
  var deadlineReached = collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap, maxThreads, shouldStop);

  // Bot tokens cannot call search.messages, so this GAS scans joined channel history.

  var threads = [];
  var threadTimestamps = Object.keys(threadTsMap);
  for (var threadIndex = 0; threadIndex < threadTimestamps.length; threadIndex += 1) {
    if (shouldStop && shouldStop()) {
      deadlineReached = true;
      break;
    }
    var threadTs = threadTimestamps[threadIndex];
    try {
      var messages = getThreadMessages(channelId, threadTs, shouldStop);
      if (shouldStop && shouldStop()) {
        deadlineReached = true;
        break;
      }
      if (!messages.length) {
        continue;
      }

      var root = messages[0];
      var lastTs = messages.reduce(function(maxTs, message) {
        return Math.max(maxTs, slackTsNumber_(message.ts));
      }, slackTsNumber_(root.ts));

      if (lastTs < Number(cutoffTs)) {
        expiredSkipped += 1;
        continue;
      }

      var text = messages.map(function(message) {
        return stringValue_(message.text);
      }).join('\n');
      var linkKeys = extractLinkKeys(text);
      var vins = extractVins(text);
      var threadIds = extractThreadIds(text);
      if (!linkKeys.length) {
        continue;
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
  }

  return {
    threads: threads,
    expiredSkipped: expiredSkipped,
    deadline_reached: deadlineReached
  };
}

function scanVinLabels_(channelRole, lookbackDaysOverride, maxThreadsPerChannel, channelNameFilter) {
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

function collectThreadCandidatesFromHistory_(channelId, cutoffTs, threadTsMap, maxThreads, shouldStop) {
  var cursor = '';
  do {
    if (shouldStop && shouldStop()) {
      return true;
    }
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
  return false;
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

function resolveInvoiceSourceChannels_(settings, targetChannels) {
  return resolveInvoiceSourceChannelsWithDiagnostics_(settings, targetChannels).channels;
}

function resolveInvoiceSourceChannelsWithDiagnostics_(settings, targetChannels) {
  return resolveInvoiceSourceChannelsFromAvailable_(
    settings,
    targetChannels,
    getAllChannels_()
  );
}

function resolveInvoiceSourceChannelsFromAvailable_(settings, targetChannels, availableChannels) {
  var targets = Array.isArray(targetChannels)
    ? targetChannels
    : (targetChannels ? [targetChannels] : []);
  var targetIds = {};
  targets.forEach(function(channel) {
    if (channel && channel.id) {
      targetIds[channel.id] = true;
    }
  });

  var available = availableChannels || [];
  var selected = [];
  var unresolved = [];
  if (settings.invoiceSourceAllJoinedChannels) {
    selected = available.filter(function(channel) {
      return channel && channel.id && (channel.is_member === true || channel.is_private === true);
    });
  } else {
    (settings.invoiceSourceChannelNames || []).forEach(function(name) {
      var requestedName = stringValue_(name).trim();
      if (!requestedName) {
        return;
      }
      var channel = available.filter(function(candidate) {
        return candidate && (
          stringValue_(candidate.id) === requestedName ||
          channelNameMatches_(candidate, requestedName)
        );
      })[0];
      if (!channel) {
        unresolved.push({
          configured_name: requestedName,
          reason: 'channel_not_found_or_bot_not_invited'
        });
        return;
      }
      if (channel.is_member === false) {
        unresolved.push({
          configured_name: requestedName,
          channel_id: channel.id || '',
          reason: 'bot_not_invited'
        });
        return;
      }
      selected.push(channel);
    });
  }

  var seen = {};
  var channels = selected.filter(function(channel) {
    if (!channel || !channel.id || seen[channel.id] || targetIds[channel.id]) {
      return false;
    }
    seen[channel.id] = true;
    return true;
  }).map(function(channel) {
    return {
      id: channel.id,
      name: channel.name || channel.name_normalized || channel.id,
      is_private: Boolean(channel.is_private),
      is_member: channel.is_member !== false
    };
  }).sort(function(a, b) {
    return a.name.localeCompare(b.name, 'ja');
  });

  return {
    channels: channels,
    unresolved: unresolved
  };
}

function getJoinedChannels_() {
  return getAllChannels_().filter(function(channel) {
    return channel && channel.id && (channel.is_member === true || channel.is_private === true);
  });
}

function listJoinedChannelsForInvoice_() {
  var settings = getSettings();
  var configuredRoutes = getInvoiceForwardRouteDefinitions_(settings);
  var routes = configuredRoutes.filter(invoiceForwardRouteIsRunnable_);
  var invalidRoutes = configuredRoutes.filter(function(route) {
    return route.enabled && !invoiceForwardRouteIsRunnable_(route);
  });
  var routeResolution = resolveInvoiceForwardRouteContexts_(routes);
  routeResolution.unresolved.forEach(function(unresolvedRoute) {
    saveError(
      'listJoinedChannelsForInvoice:target:' + unresolvedRoute.route_name,
      new Error(unresolvedRoute.error)
    );
  });
  var targetChannels = routeResolution.contexts.map(function(context) {
    return context.targetChannel;
  });
  var joinedChannels = getJoinedChannels_().map(channelSummary_);
  var sourceResolution = resolveInvoiceSourceChannelsWithDiagnostics_(settings, targetChannels);
  var invoiceSources = sourceResolution.channels.map(channelSummary_);
  sourceResolution.unresolved.forEach(function(unresolvedSource) {
    saveError(
      'listJoinedChannelsForInvoice:source:' + unresolvedSource.configured_name,
      new Error(unresolvedSource.reason)
    );
  });
  return {
    checked_at: nowIso_(),
    joined_count: joinedChannels.length,
    invoice_source_count: invoiceSources.length,
    target_channel: targetChannels.length ? channelSummary_(targetChannels[0]) : null,
    target_channels: targetChannels.map(channelSummary_),
    invoice_forward_routes: routes.map(function(route) {
      return {
        enabled: route.enabled,
        route_name: route.routeName,
        reaction_name: route.reactionName,
        target_channel_name: route.targetChannelName
      };
    }),
    invalid_invoice_forward_routes: invalidRoutes.map(function(route) {
      return {
        route_name: route.routeName,
        reaction_name: route.reactionName,
        target_channel_name: route.targetChannelName,
        row_number: route.rowNumber || '',
        validation_error: route.validationError || 'route_not_runnable'
      };
    }),
    unresolved_target_routes: routeResolution.unresolved,
    invoice_source_setting: settings.invoiceSourceChannelNames.join(','),
    invoice_source_error: sourceResolution.unresolved.map(function(source) {
      return source.configured_name + ':' + source.reason;
    }).join(','),
    unresolved_sources: sourceResolution.unresolved,
    channels: joinedChannels,
    invoice_sources: invoiceSources
  };
}

function channelSummary_(channel) {
  return {
    name: channel.name || channel.name_normalized || channel.id || '',
    id: channel.id || '',
    is_private: Boolean(channel.is_private),
    is_member: channel.is_member !== false
  };
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

function getManagedSheet_(sheetName) {
  if (!SHEET_HEADERS[sheetName]) {
    throw new Error('管理対象外のシートです: ' + sheetName);
  }
  var spreadsheet = getOrCreateSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);
  var needsInitialization = !sheet;
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  needsInitialization = needsInitialization || sheet.getLastRow() === 0;
  var needsSchemaUpgrade = [
    'invoice_forward_routes',
    'invoice_channel_scan_state',
    'slack_reaction_events'
  ].indexOf(sheetName) !== -1 && !MANAGED_SHEET_SCHEMA_READY[sheetName];
  if (needsInitialization || needsSchemaUpgrade) {
    ensureHeader_(sheet, SHEET_HEADERS[sheetName]);
    MANAGED_SHEET_SCHEMA_READY[sheetName] = true;
    if (needsInitialization) {
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, SHEET_HEADERS[sheetName].length);
    }
  }
  if (sheetName === 'settings' && needsInitialization) {
    seedDefaultSettings_(sheet);
    upgradeInvoiceSafetySettings_(sheet);
    ensureGeneratedSecretSetting_(sheet, 'SLACK_EVENT_REQUEST_TOKEN', 'slackevt_');
    ensureGeneratedSecretSetting_(sheet, 'WEB_ADMIN_TOKEN', 'admin_');
  } else if (sheetName === 'invoice_forward_routes' && sheet.getLastRow() <= 1) {
    seedInvoiceForwardRoutes_(sheet, getManagedSheet_('settings'));
  } else if (sheetName === 'reaction_forward_rules' && needsInitialization) {
    seedReactionForwardRuleTemplate_(sheet);
  }
  return sheet;
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

function seedInvoiceForwardRoutes_(sheet, settingsSheet) {
  if (!sheet || sheet.getLastRow() > 1) {
    return;
  }
  var rawSettings = settingsSheet ? readSettingsMap_(settingsSheet) : {};
  var rows = [
    [
      'true',
      'invoice_rocket',
      normalizeReactionName_(settingOrDefault_(rawSettings, 'INVOICE_REACTION_NAME')),
      stringValue_(settingOrDefault_(rawSettings, 'INVOICE_TARGET_CHANNEL_NAME')).trim()
    ],
    [
      'true',
      'payment_ufo',
      'flying_saucer',
      '依頼_振込'
    ]
  ];
  sheet.getRange(2, 1, rows.length, rows[0].length).setNumberFormat('@');
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function seedReactionForwardRuleTemplate_(sheet) {
  if (sheet.getLastRow() > 1) {
    return;
  }
  var row = [
    'false',
    'assistant_articles',
    'アシスタント',
    '',
    '',
    'copy_text',
    'false'
  ];
  sheet.getRange(2, 1, 1, row.length).setNumberFormat('@');
  sheet.getRange(2, 1, 1, row.length).setValues([row]);
}

function upgradeInvoiceSafetySettings_(sheet) {
  var upgrades = {
    INVOICE_LOOKBACK_DAYS: {from: '7', to: '30'},
    INVOICE_HISTORY_LIMIT: {from: '50', to: '100'},
    INVOICE_HISTORY_PAGE_LIMIT: {from: '', to: '3'},
    INVOICE_REPLY_THREAD_LIMIT: {from: '10', to: '25'},
    INVOICE_FORCE_RESCAN_HOURS: {from: ['6', '3'], to: '1'}
  };
  var settings = readSettingsMap_(sheet);
  Object.keys(upgrades).forEach(function(key) {
    var current = stringValue_(settings[key]).trim();
    var upgrade = upgrades[key];
    if (settingUpgradeMatches_(current, upgrade)) {
      upsertSetting_(sheet, key, upgrade.to, settingMemo_(key));
    }
  });
}

function settingUpgradeMatches_(current, upgrade) {
  var fromValues = Array.isArray(upgrade.from) ? upgrade.from : [upgrade.from];
  return fromValues.indexOf(current) !== -1;
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
  var rowIndex = 0;
  if (lastRow >= 2) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i += 1) {
      if (keys[i][0] === key) {
        rowIndex = i + 2;
      }
    }
  }
  if (rowIndex) {
    sheet.getRange(rowIndex, 2, 1, 2).setValues([[value, memo || '']]);
    return;
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

function findRowByValue_(sheet, columnNumber, value) {
  var target = stringValue_(value);
  if (!target || sheet.getLastRow() < 2) {
    return 0;
  }
  var values = sheet.getRange(2, columnNumber, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i += 1) {
    if (stringValue_(values[i][0]) === target) {
      return i + 2;
    }
  }
  return 0;
}

function settingMemo_(key) {
  var memos = {
    SLACK_BOT_TOKEN: 'xoxb-で始まるBot Token。Script Propertiesにも同期します。',
    TEAM_DOMAIN: '任意。Slackチームドメインの控えです。',
    SLACK_EVENT_VERIFICATION_TOKEN: '任意。Slack Events APIを使う場合だけ、Basic InformationのVerification Tokenを入れます。',
    SLACK_EVENT_REQUEST_TOKEN: 'Slack Events APIのRequest URLに付ける共有トークンです。自動生成されます。',
    WEB_ADMIN_TOKEN: '公開Webアプリの管理操作に必要なトークンです。自動生成されます。',
    PARENT_CHANNEL_NAME: '大親チャンネル名。',
    CHILD_CHANNEL_NAMES: '子チャンネル名をカンマ区切りで指定します。',
    LOOKBACK_DAYS: '最終更新日時がこの日数以内のスレッドだけ対象にします。',
    DRY_RUN: 'trueなら車案件の紐付けをSlackへ投稿せずdry_run_logsだけ保存します。',
    MAIN_TRIGGER_HOURS: 'scheduledMain()を毎日実行する時刻です。0-23時をカンマ区切りで指定します。例: 3,10,13,16,20',
    MAIN_TRIGGER_INTERVAL_HOURS: '1ならscheduledMain()を1時間ごとに実行します。空にするとMAIN_TRIGGER_HOURSを使います。',
    INVOICE_FORWARD_ENABLED: 'trueならinvoice_forward_routesに登録した依頼リアクション転送を有効にします。',
    INVOICE_SOURCE_CHANNEL_NAME: '旧設定。単一監視元チャンネル名です。INVOICE_SOURCE_CHANNEL_NAMESが空の場合だけ使います。',
    INVOICE_SOURCE_CHANNEL_NAMES: '*ならBot参加済み全チャンネルを監視します。通常はロケット／UFO共通の監視元をカンマ区切りで明示します。',
    INVOICE_TARGET_CHANNEL_NAME: '旧ロケットルートの転送先互換設定です。通常はinvoice_forward_routesを使います。',
    INVOICE_REACTION_NAME: '旧ロケットルートの絵文字名互換設定です。通常はinvoice_forward_routesを使います。',
    INVOICE_LOOKBACK_DAYS: '依頼リアクション転送で直近何日分の投稿を見るかを指定します。',
    INVOICE_HISTORY_LIMIT: '依頼リアクション転送で1ページに確認する投稿数です。制限対策のため必要以上に増やさないでください。',
    INVOICE_REPLY_THREAD_LIMIT: '依頼リアクション転送で返信を確認するrootスレッド数の上限です。',
    INVOICE_FORCE_RESCAN_HOURS: '新着がないチャンネルでもこの時間を過ぎたら再スキャンし、後付けリアクションを拾います。',
    INVOICE_FORWARD_DRY_RUN: 'trueなら依頼リアクション転送もSlackへ投稿せず候補数だけ確認します。',
    VEHICLE_API_ENABLED: 'trueの場合だけ車管理専用のSlackイベント送信を有効にします。',
    VEHICLE_API_URL: '車管理の署名API URLです。',
    VEHICLE_API_SECRET: '車管理とGASだけで共有するHMAC秘密鍵です。画面やSlackへ表示しません。',
    VEHICLE_CHANNEL_ID: '車管理専用SlackチャンネルIDです。名前ではなくIDで固定します。'
  };
  return memos[key] || '';
}

function settingOrDefault_(settingsMap, key) {
  var value;
  if (settingsMap[key] !== undefined && (settingsMap[key] !== '' || settingAllowsBlank_(key))) {
    value = settingsMap[key];
  } else {
    value = DEFAULT_SETTINGS[key];
  }
  return normalizeSettingValue_(key, value);
}

function settingAllowsBlank_(key) {
  return key === 'MAIN_TRIGGER_INTERVAL_HOURS' || key === 'INVOICE_SOURCE_CHANNEL_NAMES';
}

function normalizeSettingValue_(key, value) {
  if (key === 'CHILD_CHANNEL_NAMES') {
    return stringValue_(value).replace(/オールマシンサービス\s+SEEMORE/g, 'オールマシンサービス');
  }
  return value;
}

function slackApiWithToken_(token, method, payload) {
  var response = fetchSlackApi_(token, method, payload || {});
  if (response.getResponseCode && response.getResponseCode() === 429) {
    var retryAfter = parsePositiveInteger_(getHeaderCaseInsensitive_(response.getHeaders(), 'Retry-After'), 1);
    Utilities.sleep(Math.min(retryAfter, 30) * 1000);
    response = fetchSlackApi_(token, method, payload || {});
  }

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

function fetchSlackApi_(token, method, payload) {
  return UrlFetchApp.fetch('https://slack.com/api/' + method, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: encodeSlackPayload_(payload || {}),
    muteHttpExceptions: true
  });
}

function getHeaderCaseInsensitive_(headers, name) {
  var target = stringValue_(name).toLowerCase();
  var keys = Object.keys(headers || {});
  for (var i = 0; i < keys.length; i += 1) {
    if (keys[i].toLowerCase() === target) {
      return headers[keys[i]];
    }
  }
  return '';
}

function encodeSlackPayload_(payload) {
  var encoded = {};
  Object.keys(payload).forEach(function(key) {
    var value = payload[key];
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'boolean') {
      encoded[key] = String(value);
    } else if (Array.isArray(value) || typeof value === 'object') {
      encoded[key] = JSON.stringify(value);
    } else {
      encoded[key] = value;
    }
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
  return '関連依頼スレ：\n\n【' + channelName + '】\n' + slackLinkText_(url, '元スレッドを開く');
}

function sameChannelMessage_(url) {
  return '同一車体番号の関連スレ：\n\n' + slackLinkText_(url, '元スレッドを開く');
}

function linkActionAttachments_(action, sourceUrl) {
  var title = action.relationType === 'same_channel_duplicate'
    ? '同一案件スレッド'
    : '関連依頼スレッド';
  var text = action.source.configuredChannelName || action.source.channelName || '';
  return [slackPreviewAttachment_(title, sourceUrl, text)];
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

function addInvoiceRouteMessageSamples_(stats, message, routeContexts, scope, threadTs) {
  (routeContexts || []).forEach(function(context) {
    if (messageHasReaction_(message, context.route.reactionName)) {
      addInvoiceMessageSample_(
        stats,
        message,
        context.route.reactionName,
        scope,
        threadTs,
        context.route.routeName
      );
    }
  });
}

function addInvoiceMessageSample_(stats, message, reactionName, scope, threadTs, routeName) {
  if (!stats.message_samples || stats.message_samples.length >= 10) {
    return;
  }
  var sample = invoiceMessageSample_(message, reactionName, scope, threadTs);
  sample.route_name = routeName || '';
  stats.message_samples.push(sample);
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

function invoiceForwardDedupKey_(message, pdfFile) {
  if (pdfFile) {
    return stringValue_(pdfFile.id || pdfFile.url_private || invoiceFileName_(pdfFile));
  }
  return 'no-pdf:' + normalizeSlackTsForCompare_(message.ts);
}

function invoiceForwardMessage_(fileName, sourceUrl) {
  if (!fileName) {
    return slackLinkText_(sourceUrl, '元投稿を開く');
  }
  return '【' + fileName + ' ' + todayDateString_() + '】\n' + slackLinkText_(sourceUrl, '元投稿を開く');
}

function invoiceForwardAttachments_(message, sourceChannelName, sourceUrl, pdfFile, reactionName) {
  var lines = [];
  var preview = stringValue_(message.text).trim();
  var files = (message.files || []).map(invoiceFileName_).filter(function(name) {
    return name;
  });
  if (sourceChannelName) {
    lines.push('チャンネル: ' + sourceChannelName);
  }
  if (preview) {
    lines.push(truncateForSlackAttachment_(preview, 280));
  }
  if (files.length) {
    lines.push('添付: ' + files.join(', '));
  }
  return [slackPreviewAttachment_(
    pdfFile ? invoiceFileName_(pdfFile) : invoiceReactionPreviewTitle_(reactionName),
    sourceUrl,
    lines.join('\n')
  )];
}

function invoiceRecordAttachments_(fileName, sourceUrl, reactionName) {
  return [slackPreviewAttachment_(
    fileName || invoiceReactionPreviewTitle_(reactionName),
    sourceUrl,
    fileName ? 'PDFあり' : 'PDFなし・リンクのみ'
  )];
}

function invoiceReactionPreviewTitle_(reactionName) {
  var normalized = normalizeReactionName_(reactionName);
  if (normalized === 'flying_saucer') {
    return 'UFO付き元投稿';
  }
  if (!normalized || normalized === 'rocket') {
    return 'ロケット付き元投稿';
  }
  return 'リアクション付き元投稿';
}

function slackPreviewAttachment_(title, titleLink, text) {
  return {
    fallback: stringValue_(title) + ' ' + stringValue_(titleLink),
    color: '#36C5F0',
    title: stringValue_(title) || '元投稿',
    title_link: titleLink,
    text: text || slackLinkText_(titleLink, '元投稿を開く'),
    mrkdwn_in: ['text']
  };
}

function slackLinkText_(url, label) {
  return '<' + stringValue_(url) + '|' + sanitizeSlackLinkLabel_(label) + '>';
}

function sanitizeSlackLinkLabel_(label) {
  return stringValue_(label).replace(/[<>|]/g, ' ').trim() || 'リンクを開く';
}

function truncateForSlackAttachment_(value, maxLength) {
  var text = stringValue_(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

function todayDateString_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseBoolean_(value) {
  var normalized = stringValue_(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parseCommaSeparatedSetting_(value) {
  return stringValue_(value)
    .split(',')
    .map(function(part) {
      return part.trim();
    })
    .filter(function(part, index, values) {
      return part && values.indexOf(part) === index;
    });
}

function parseInvoiceSourceChannelNames_(settingsMap) {
  var rawSourceNames = settingsMap.INVOICE_SOURCE_CHANNEL_NAMES;
  if (rawSourceNames !== undefined && rawSourceNames !== '') {
    return parseCommaSeparatedSetting_(rawSourceNames);
  }

  var legacySourceName = stringValue_(settingsMap.INVOICE_SOURCE_CHANNEL_NAME).trim();
  if (legacySourceName) {
    return [legacySourceName];
  }
  return parseCommaSeparatedSetting_(DEFAULT_SETTINGS.INVOICE_SOURCE_CHANNEL_NAMES);
}

function parseTriggerIntervalHours_(value) {
  var normalized = normalizeUnicode_(value).trim().toLowerCase();
  if (!normalized || normalized === 'daily' || normalized === 'none') {
    return 0;
  }
  if (normalized === 'hourly') {
    return 1;
  }
  var parsed = parseInt(normalized, 10);
  return parsed > 0 && parsed <= 24 ? parsed : 0;
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

function parseTriggerHoursStrict_(value) {
  var seen = {};
  var hours = [];
  normalizeUnicode_(value)
    .split(',')
    .forEach(function(part) {
      var text = part.trim();
      if (!text) {
        return;
      }
      if (!/^\d{1,2}$/.test(text)) {
        throw new Error('MAIN_TRIGGER_HOURSに0-23の時刻だけをカンマ区切りで指定してください: ' + text);
      }
      var hour = parseInt(text, 10);
      if (hour < 0 || hour > 23) {
        throw new Error('MAIN_TRIGGER_HOURSは0-23の範囲で指定してください: ' + text);
      }
      if (!seen[hour]) {
        seen[hour] = true;
        hours.push(hour);
      }
    });
  if (!hours.length) {
    throw new Error('MAIN_TRIGGER_HOURSを1つ以上指定してください。');
  }
  return hours.sort(function(a, b) {
    return a - b;
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
