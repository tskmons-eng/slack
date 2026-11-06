// 米取引（請求書作成補助の「米取引」モード）との連絡係。
// - Slack の米取引チャンネル（配達・仕入・依頼＿小売取引など）で押された／外されたスタンプと、仕入チャンネルの文章の報告を、
//   署名付きでツール（https://seemore-grp.com/seikyu/api/rice-slack-events.php）へ送る。
// - スタンプの意味（確認・完了・OK・入金完了）はツールの設定で決めるので、ここでは生のスタンプ名をそのまま送る。
// - 1時間ごとの scheduledMain から scheduledRiceRecovery_ を呼び、直近の米チャンネルのスタンプを見直して未送信のものを送る。
// - 同じ1時間ごとの段階の最後に riceSyncDueDatesToCalendar_ で、ツールの入金期日の一覧（rice-due-dates.php）を読み、
//   Google カレンダー（settings の RICE_CALENDAR_ID、空なら既定のカレンダー）に終日の予定を作る・直す・消す（2026-11-06 の直し（5回目））。
// 車案件の紐付け・🚀請求書転送・🛸振込転送には触らない（Code.gs からは2か所だけ呼ばれる）。
// 署名は車管理と同じ方式：HMAC-SHA256(timestamp + "\n" + nonce + "\n" + eventId + "\n" + body, RICE_API_SECRET) の16進数。
// 約束ごとの正本は 請求書作成補助/docs/rice/CONTRACT.md 5章、設定手順は docs/rice/SLACK_SETUP.md。

var RICE_SETTINGS_CACHE_KEY = 'RICE_SETTINGS_V2'; // V2：RICE_CALENDAR_ID を足した
var RICE_SETTINGS_CACHE_SECONDS = 300;
var RICE_STATE_PROPERTY_PREFIX = 'RICE_RX_';
var RICE_BOT_USER_ID_PROPERTY = 'RICE_BOT_USER_ID';
var RICE_DEFAULT_API_URL = 'https://seemore-grp.com/seikyu/api/rice-slack-events.php';
var RICE_DEFAULT_LOOKBACK_DAYS = 21; // スタンプを見直す期間（配達は注文から数日後、入金は請求から2〜3週間後に押される）
var RICE_THREAD_PARENT_LOOKBACK_DAYS = 45; // 店舗スレ（月ごとの親投稿）を探す期間
var RICE_STATE_KEEP_DAYS = 60; // 送った記録を残す期間
var RICE_HISTORY_PAGE_LIMIT = 3;
var RICE_HISTORY_PAGE_SIZE = 100;
var RICE_CHANNEL_ROLES = ['delivery', 'purchase', 'retail', 'invoice', 'reaction'];

// ---------------------------------------------------------------------------
// 設定（settings シートの RICE_* 行。無ければ初期値＝送らない）
// ---------------------------------------------------------------------------

var RICE_SETTINGS_MEMO_ = null;

function getRiceSettings_() {
  if (RICE_SETTINGS_MEMO_) {
    return RICE_SETTINGS_MEMO_;
  }
  var cache = null;
  try {
    cache = CacheService.getScriptCache();
    var cached = cache.get(RICE_SETTINGS_CACHE_KEY);
    if (cached) {
      RICE_SETTINGS_MEMO_ = parseRiceSettings_(JSON.parse(cached));
      return RICE_SETTINGS_MEMO_;
    }
  } catch (cacheError) {
    cache = null;
  }
  var raw = readSettingsMap_(getManagedSheet_('settings'));
  var picked = {
    RICE_API_ENABLED: raw.RICE_API_ENABLED,
    RICE_API_URL: raw.RICE_API_URL,
    RICE_API_SECRET: raw.RICE_API_SECRET,
    RICE_CHANNEL_IDS: raw.RICE_CHANNEL_IDS,
    RICE_LOOKBACK_DAYS: raw.RICE_LOOKBACK_DAYS,
    RICE_CALENDAR_ID: raw.RICE_CALENDAR_ID,
    RICE_CALENDAR_ENABLED: raw.RICE_CALENDAR_ENABLED
  };
  if (cache) {
    try {
      cache.put(RICE_SETTINGS_CACHE_KEY, JSON.stringify(picked), RICE_SETTINGS_CACHE_SECONDS);
    } catch (putError) {
      // キャッシュに置けなくても動く
    }
  }
  RICE_SETTINGS_MEMO_ = parseRiceSettings_(picked);
  return RICE_SETTINGS_MEMO_;
}

function parseRiceSettings_(raw) {
  raw = raw || {};
  var url = stringValue_(raw.RICE_API_URL).trim() || RICE_DEFAULT_API_URL;
  var secret = stringValue_(raw.RICE_API_SECRET).trim();
  var enabledFlag = stringValue_(raw.RICE_API_ENABLED).trim().toLowerCase() === 'true';
  var problems = [];
  if (!/^https:\/\/[^\s]+$/.test(url)) {
    problems.push('RICE_API_URL は https:// で始まる URL にしてください。');
  }
  if (!/^[a-f0-9]{64}$/i.test(secret)) {
    problems.push('RICE_API_SECRET は64桁の16進数にしてください。');
  }
  var channels = parseRiceChannelIds_(raw.RICE_CHANNEL_IDS);
  if (!channels.length) {
    problems.push('RICE_CHANNEL_IDS にチャンネル ID がありません。');
  }
  var lookbackDays = parseInt(stringValue_(raw.RICE_LOOKBACK_DAYS), 10);
  return {
    enabled: enabledFlag && problems.length === 0,
    enabledFlag: enabledFlag,
    problems: problems,
    apiUrl: url,
    dueDatesUrl: riceDueDatesUrl_(url),
    secret: secret,
    channels: channels,
    lookbackDays: lookbackDays > 0 && lookbackDays <= 60 ? lookbackDays : RICE_DEFAULT_LOOKBACK_DAYS,
    calendarId: stringValue_(raw.RICE_CALENDAR_ID).trim(), // 空なら CalendarApp.getDefaultCalendar()
    calendarEnabled: stringValue_(raw.RICE_CALENDAR_ENABLED).trim().toLowerCase() !== 'false' // 行が無い・空なら入れる。false でカレンダーだけ止める
  };
}

// 入金期日の一覧の URL：RICE_API_URL（…/rice-slack-events.php）と同じ場所の rice-due-dates.php。
function riceDueDatesUrl_(apiUrl) {
  var url = stringValue_(apiUrl).trim();
  if (/\/rice-slack-events\.php$/.test(url)) {
    return url.replace(/rice-slack-events\.php$/, 'rice-due-dates.php');
  }
  return url.replace(/\/[^\/]*$/, '/rice-due-dates.php');
}

// "C0123:delivery, C0456:purchase, C0789:retail" → [{id, role}]。役割を書かなければ "reaction"（スタンプだけ送る）。
function parseRiceChannelIds_(value) {
  var seen = {};
  return stringValue_(value).split(/[,\n]/).map(function(part) {
    return part.trim();
  }).filter(function(part) {
    return part !== '';
  }).map(function(part) {
    var pieces = part.split(/[:=]/);
    var id = pieces[0].trim();
    var role = (pieces[1] || 'reaction').trim().toLowerCase();
    if (RICE_CHANNEL_ROLES.indexOf(role) === -1) {
      role = 'reaction';
    }
    return {id: id, role: role};
  }).filter(function(channel) {
    if (!/^[CG][A-Z0-9]+$/.test(channel.id) || seen[channel.id]) {
      return false;
    }
    seen[channel.id] = true;
    return true;
  });
}

function riceChannelRole_(riceSettings, channelId) {
  for (var i = 0; i < riceSettings.channels.length; i += 1) {
    if (riceSettings.channels[i].id === channelId) {
      return riceSettings.channels[i].role;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// 連絡の形と署名
// ---------------------------------------------------------------------------

// "+1::skin-tone-2" → "+1"、":White_Check_Mark:" → "white_check_mark"
function riceNormalizeReaction_(name) {
  return normalizeReactionName_(name).replace(/::skin-tone-\d+$/, '');
}

// ヘッダーに載せるので ASCII だけにする（日本語のスタンプ名は %XX に直す）。
function riceEventIdPart_(value) {
  var text = stringValue_(value);
  return /^[\x21-\x7E]*$/.test(text) && text.indexOf(':') === -1 ? text : encodeURIComponent(text);
}

// eventId = rice:{channel}:{messageTs}:{reaction}:{user}:{added|removed}（CONTRACT.md 5章）
function riceEventId_(channelId, messageTs, reaction, userId, action) {
  return ['rice', channelId, messageTs, reaction, userId, action].map(riceEventIdPart_).join(':');
}

// 車管理への送信（sendVehicleApiRequest_）と同じく、ASCII 以外を \uXXXX にした JSON。署名の入力を ASCII だけにする。
function riceAsciiJson_(value) {
  return JSON.stringify(value).replace(/[^\x20-\x7E]/g, function(character) {
    return '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4);
  });
}

function riceSignature_(timestamp, nonce, eventId, body, secret) {
  var input = [timestamp, nonce, eventId, body].join('\n');
  return bytesToHex_(Utilities.computeHmacSha256Signature(input, secret));
}

function riceNewNonce_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

// 送る直前の形（テストで中身を確かめるため、送る処理と分ける）。
function riceBuildRequest_(payload, riceSettings, timestamp, nonce) {
  var body = riceAsciiJson_(payload);
  var eventId = stringValue_(payload.eventId);
  return {
    url: riceSettings.apiUrl,
    body: body,
    headers: {
      'X-Seemore-Timestamp': timestamp,
      'X-Seemore-Nonce': nonce,
      'X-Seemore-Event-Id': eventId,
      'X-Seemore-Signature': riceSignature_(timestamp, nonce, eventId, body, riceSettings.secret)
    }
  };
}

/**
 * ツールへ1件送る。返り値：{ok, status, permanent, response}
 * 2xx（処理した・処理済み・関係ない）は ok。400 は送り直しても同じなので permanent。それ以外は次の拾い直しで送り直す。
 */
function sendRiceApiRequest_(payload, riceSettings) {
  var request = riceBuildRequest_(payload, riceSettings, String(Math.floor(Date.now() / 1000)), riceNewNonce_());
  var response = UrlFetchApp.fetch(request.url, {
    method: 'post',
    contentType: 'application/json',
    payload: Utilities.newBlob(request.body, 'application/json').getBytes(),
    headers: request.headers,
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    parsed = null;
  }
  return {
    ok: status >= 200 && status < 300,
    status: status,
    permanent: status === 400 || status === 413,
    response: parsed || text.slice(0, 300)
  };
}

// ---------------------------------------------------------------------------
// Slack のイベント → 送る連絡（振り分け）
// ---------------------------------------------------------------------------

function riceIsoFromSlackTs_(ts) {
  var seconds = parseFloat(stringValue_(ts));
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

/** reaction_added / reaction_removed → 送る連絡（関係なければ null）。 */
function riceBuildReactionEvent_(slackEvent, riceSettings, botUserId) {
  if (!slackEvent || (slackEvent.type !== 'reaction_added' && slackEvent.type !== 'reaction_removed')) {
    return null;
  }
  var item = slackEvent.item || {};
  if (item.type !== 'message' || !item.channel || !item.ts) {
    return null;
  }
  if (!riceChannelRole_(riceSettings, item.channel)) {
    return null;
  }
  var userId = stringValue_(slackEvent.user);
  if (!userId || (botUserId && userId === botUserId)) {
    return null; // ボット（＝ツール）が自分で押したスタンプは送らない
  }
  var reaction = riceNormalizeReaction_(slackEvent.reaction);
  if (!reaction) {
    return null;
  }
  var action = slackEvent.type === 'reaction_added' ? 'added' : 'removed';
  return {
    eventId: riceEventId_(item.channel, item.ts, reaction, userId, action),
    type: slackEvent.type,
    channelId: item.channel,
    messageTs: stringValue_(item.ts),
    userId: userId,
    userName: '',
    occurredAt: riceIsoFromSlackTs_(slackEvent.event_ts),
    text: '',
    reaction: reaction,
    action: action
  };
}

/** 仕入チャンネル（役割 purchase）に人が文章で投稿した → purchase_text_observed（関係なければ null）。 */
function riceBuildMessageEvent_(message, channelId, riceSettings, botUserId, occurredAt) {
  if (!message || riceChannelRole_(riceSettings, channelId) !== 'purchase') {
    return null;
  }
  if (message.bot_id || (botUserId && message.user === botUserId)) {
    return null;
  }
  var subtype = stringValue_(message.subtype);
  if (subtype && subtype !== 'file_share') {
    return null;
  }
  if (message.thread_ts && stringValue_(message.thread_ts) !== stringValue_(message.ts)) {
    return null; // スレッドの返信（「OK です」など）は報告として扱わない
  }
  var text = stringValue_(message.text).trim();
  var userId = stringValue_(message.user);
  if (!text || !userId || !message.ts) {
    return null;
  }
  return {
    eventId: riceEventId_(channelId, message.ts, 'text', userId, 'posted'),
    type: 'purchase_text_observed',
    channelId: channelId,
    messageTs: stringValue_(message.ts),
    userId: userId,
    userName: '',
    occurredAt: occurredAt || riceIsoFromSlackTs_(message.ts),
    text: text.slice(0, 4000),
    reaction: '',
    action: 'posted'
  };
}

/** Slack のイベント1件を、米取引へ送る連絡に振り分ける（関係なければ null）。 */
function riceRouteSlackEvent_(slackEvent, riceSettings, botUserId) {
  if (!slackEvent || !riceSettings.enabled) {
    return null;
  }
  if (slackEvent.type === 'reaction_added' || slackEvent.type === 'reaction_removed') {
    return riceBuildReactionEvent_(slackEvent, riceSettings, botUserId);
  }
  if (slackEvent.type === 'message') {
    return riceBuildMessageEvent_(slackEvent, slackEvent.channel, riceSettings, botUserId, riceIsoFromSlackTs_(slackEvent.event_ts || slackEvent.ts));
  }
  return null;
}

// ---------------------------------------------------------------------------
// 送った記録（Script Properties に投稿ごと。キー RICE_RX_{channel}_{ts}）
// ---------------------------------------------------------------------------

function riceStateKey_(channelId, messageTs) {
  return RICE_STATE_PROPERTY_PREFIX + channelId + '_' + stringValue_(messageTs).replace('.', '_');
}

function riceEntryKey_(payload) {
  return payload.type === 'purchase_text_observed' ? 't|' + payload.userId : 'r|' + payload.reaction + '|' + payload.userId;
}

function riceParseState_(text) {
  if (!text) {
    return {t: 0, r: {}};
  }
  try {
    var parsed = JSON.parse(text);
    return {t: parsed.t || 0, r: parsed.r || {}};
  } catch (error) {
    return {t: 0, r: {}};
  }
}

function riceDefaultStateStore_() {
  var properties = PropertiesService.getScriptProperties();
  return {
    get: function(channelId, messageTs) {
      return riceParseState_(properties.getProperty(riceStateKey_(channelId, messageTs)));
    },
    set: function(channelId, messageTs, state) {
      properties.setProperty(riceStateKey_(channelId, messageTs), JSON.stringify({t: Date.now(), r: state.r}));
    }
  };
}

// 送れたら記録する。added → 'a'、removed → 'r'、文章 → 'a'。
function riceRecordSent_(store, payload) {
  var state = store.get(payload.channelId, payload.messageTs);
  state.r[riceEntryKey_(payload)] = payload.action === 'removed' ? 'r' : 'a';
  store.set(payload.channelId, payload.messageTs, state);
}

function riceAlreadySent_(store, payload) {
  var state = store.get(payload.channelId, payload.messageTs);
  var current = state.r[riceEntryKey_(payload)];
  return payload.action === 'removed' ? current === 'r' : current === 'a';
}

/**
 * 今のスタンプと送った記録を比べ、送る必要のある [{reaction, userId, action}] を返す（ボット自身のスタンプは除く）。
 * 人数が多くて Slack が押した人を全部返さないスタンプ（count > users.length）は、外したとは判断しない。
 */
function riceDiffReactions_(message, state, botUserId) {
  var current = {};
  var truncated = {};
  (message.reactions || []).forEach(function(reaction) {
    var name = riceNormalizeReaction_(reaction.name);
    var users = reaction.users || [];
    if ((reaction.count || 0) > users.length) {
      truncated[name] = true;
    }
    users.forEach(function(userId) {
      if (userId && userId !== botUserId) {
        current['r|' + name + '|' + userId] = {reaction: name, userId: userId};
      }
    });
  });
  var changes = [];
  Object.keys(current).forEach(function(key) {
    if (state.r[key] !== 'a') {
      changes.push({reaction: current[key].reaction, userId: current[key].userId, action: 'added'});
    }
  });
  Object.keys(state.r).forEach(function(key) {
    if (key.indexOf('r|') !== 0 || state.r[key] !== 'a' || current[key]) {
      return;
    }
    var parts = key.split('|');
    if (truncated[parts[1]]) {
      return;
    }
    changes.push({reaction: parts[1], userId: parts[2], action: 'removed'});
  });
  return changes;
}

// ---------------------------------------------------------------------------
// 入口1：Slack Events（Code.gs の handleSlackEventPayload_ から呼ばれる）。例外は外に出さない。
// ---------------------------------------------------------------------------

function riceHandleSlackEventSafely_(slackEvent, envelope) {
  try {
    return riceHandleSlackEvent_(slackEvent, envelope, null);
  } catch (error) {
    try {
      saveError('riceHandleSlackEvent', error);
    } catch (saveFailure) {
      Logger.log('riceHandleSlackEvent: ' + (error && error.message ? error.message : error));
    }
    return {ok: false, error: error && error.message ? error.message : String(error)};
  }
}

function riceHandleSlackEvent_(slackEvent, envelope, deps) {
  deps = deps || {};
  var type = slackEvent && slackEvent.type;
  if (type !== 'reaction_added' && type !== 'reaction_removed' && type !== 'message') {
    return {ok: true, ignored: true, reason: 'not_rice_event_type'};
  }
  var riceSettings = deps.settings || getRiceSettings_();
  if (!riceSettings.enabled) {
    return {ok: true, ignored: true, reason: 'rice_disabled'};
  }
  var channelId = type === 'message' ? slackEvent.channel : (slackEvent.item || {}).channel;
  if (!riceChannelRole_(riceSettings, channelId)) {
    return {ok: true, ignored: true, reason: 'not_rice_channel'};
  }
  var botUserId = deps.botUserId !== undefined ? deps.botUserId : riceBotUserIdFromEnvelope_(envelope);
  var payload = riceRouteSlackEvent_(slackEvent, riceSettings, botUserId);
  if (!payload) {
    return {ok: true, ignored: true, reason: 'not_rice_target'};
  }
  return riceSendAndRecord_(payload, riceSettings, deps);
}

function riceSendAndRecord_(payload, riceSettings, deps) {
  deps = deps || {};
  var store = deps.store || riceDefaultStateStore_();
  var send = deps.send || sendRiceApiRequest_;
  var result = send(payload, riceSettings);
  if (result.ok || result.permanent) {
    riceRecordSent_(store, payload);
  }
  if (!result.ok) {
    var error = new Error('米取引への送信失敗: HTTP ' + result.status + ' ' + payload.eventId);
    error.rawResponse = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
    if (deps.onError) {
      deps.onError(error);
    } else {
      saveError('riceSend', error);
    }
  }
  return {ok: result.ok, event_id: payload.eventId, status: result.status, response: result.response};
}

function riceBotUserIdFromEnvelope_(envelope) {
  var authorizations = envelope && envelope.authorizations;
  if (authorizations && authorizations.length && authorizations[0].is_bot && authorizations[0].user_id) {
    return authorizations[0].user_id;
  }
  return riceBotUserId_();
}

// ボット自身の Slack ユーザー ID（ツールが同じトークンで押したスタンプを除くため）。
function riceBotUserId_() {
  var properties = PropertiesService.getScriptProperties();
  var cached = stringValue_(properties.getProperty(RICE_BOT_USER_ID_PROPERTY));
  if (cached) {
    return cached;
  }
  var userId = stringValue_(slackApi('auth.test', {}).user_id);
  if (userId) {
    properties.setProperty(RICE_BOT_USER_ID_PROPERTY, userId);
  }
  return userId;
}

// ---------------------------------------------------------------------------
// 入口2：1時間ごとの拾い直し（Code.gs の scheduledMain から呼ばれる）
// ---------------------------------------------------------------------------

function scheduledRiceRecovery_(runtimeDeadlineMs) {
  var riceSettings = getRiceSettings_();
  var result = {
    ok: true,
    enabled: riceSettings.enabled,
    problems: riceSettings.enabledFlag ? riceSettings.problems : [],
    channels_checked: 0,
    messages_checked: 0,
    sent_count: 0,
    failed_count: 0,
    error_count: 0,
    pruned_count: 0,
    deadline_reached: false
  };
  if (!riceSettings.enabled) {
    if (riceSettings.enabledFlag && riceSettings.problems.length) {
      result.error_count = 1;
      saveError('scheduledRiceRecovery:settings', new Error(riceSettings.problems.join(' ')));
    }
    return result;
  }
  // スタンプの拾い直しは、最後の入金期日のカレンダーのために RICE_CALENDAR_RESERVE_SECONDS だけ早めに止める
  var recoveryDeadlineMs = runtimeDeadlineMs ? runtimeDeadlineMs - RICE_CALENDAR_RESERVE_SECONDS * 1000 : 0;
  var deps = {
    settings: riceSettings,
    botUserId: riceBotUserId_(),
    store: riceDefaultStateStore_(),
    send: sendRiceApiRequest_,
    history: riceFetchHistory_,
    replies: function(channelId, threadTs, shouldStop) {
      return getThreadMessages(channelId, threadTs, shouldStop);
    },
    shouldStop: function() {
      return runtimeDeadlineReached_(recoveryDeadlineMs);
    },
    nowMs: Date.now()
  };
  riceSettings.channels.forEach(function(channel) {
    if (result.deadline_reached || deps.shouldStop()) {
      result.deadline_reached = true;
      return;
    }
    try {
      var channelResult = riceRecoverChannel_(channel, deps);
      result.channels_checked += 1;
      result.messages_checked += channelResult.messages_checked;
      result.sent_count += channelResult.sent_count;
      result.failed_count += channelResult.failed_count;
      result.deadline_reached = result.deadline_reached || channelResult.deadline_reached;
    } catch (error) {
      result.error_count += 1;
      saveError('scheduledRiceRecovery:' + channel.id, error);
    }
  });
  if (!result.deadline_reached) {
    result.pruned_count = ricePruneState_(Date.now());
  }
  if (result.failed_count) {
    result.error_count += 1;
  }
  // 入金期日を Google カレンダーへ（中で例外を握る。失敗しても上の拾い直し・ほかの段階は止めない）
  var calendarDeadlineMs = Date.now() + RICE_CALENDAR_BUDGET_SECONDS * 1000;
  if (runtimeDeadlineMs) {
    calendarDeadlineMs = Math.min(calendarDeadlineMs, runtimeDeadlineMs);
  }
  result.calendar = riceSyncDueDatesToCalendarSafely_(calendarDeadlineMs, {settings: riceSettings});
  result.error_count += result.calendar.error_count || 0;
  result.deadline_reached = result.deadline_reached || Boolean(result.calendar.deadline_reached);
  return result;
}

function riceFetchHistory_(channelId, oldestSeconds, shouldStop) {
  var messages = [];
  var cursor = '';
  for (var page = 0; page < RICE_HISTORY_PAGE_LIMIT; page += 1) {
    if (shouldStop && shouldStop()) {
      break;
    }
    var payload = {channel: channelId, limit: RICE_HISTORY_PAGE_SIZE, oldest: String(oldestSeconds), inclusive: true};
    if (cursor) {
      payload.cursor = cursor;
    }
    var response = slackApi('conversations.history', payload);
    messages = messages.concat(response.messages || []);
    cursor = response.response_metadata && response.response_metadata.next_cursor ? response.response_metadata.next_cursor : '';
    if (!cursor) {
      break;
    }
  }
  return messages;
}

/** 1チャンネルを見直す。deps でSlack・送信・記録を差し替えられる（テスト用）。 */
function riceRecoverChannel_(channel, deps) {
  var result = {messages_checked: 0, sent_count: 0, failed_count: 0, deadline_reached: false};
  var nowSeconds = Math.floor(deps.nowMs / 1000);
  var reactionOldest = nowSeconds - deps.settings.lookbackDays * 86400;
  var historyOldest = channel.role === 'retail'
    ? nowSeconds - Math.max(deps.settings.lookbackDays, RICE_THREAD_PARENT_LOOKBACK_DAYS) * 86400
    : reactionOldest;
  var messages = deps.history(channel.id, historyOldest, deps.shouldStop);
  var occurredAt = new Date(deps.nowMs).toISOString();

  var handleMessage = function(message) {
    if (slackTsNumber_(message.ts) < reactionOldest) {
      return;
    }
    result.messages_checked += 1;
    var payloads = [];
    var state = deps.store.get(channel.id, message.ts);
    riceDiffReactions_(message, state, deps.botUserId).forEach(function(change) {
      payloads.push({
        eventId: riceEventId_(channel.id, message.ts, change.reaction, change.userId, change.action),
        type: change.action === 'added' ? 'reaction_added' : 'reaction_removed',
        channelId: channel.id,
        messageTs: stringValue_(message.ts),
        userId: change.userId,
        userName: '',
        occurredAt: occurredAt, // 一覧からはスタンプを押した時刻が分からないので、見つけた時刻
        text: '',
        reaction: change.reaction,
        action: change.action
      });
    });
    var textPayload = riceBuildMessageEvent_(message, channel.id, deps.settings, deps.botUserId, '');
    if (textPayload && !riceAlreadySent_(deps.store, textPayload)) {
      payloads.push(textPayload);
    }
    payloads.forEach(function(payload) {
      if (deps.shouldStop()) {
        result.deadline_reached = true;
        return;
      }
      var sent = riceSendAndRecord_(payload, deps.settings, deps);
      if (sent.ok) {
        result.sent_count += 1;
      } else {
        result.failed_count += 1;
      }
    });
  };

  for (var i = 0; i < messages.length; i += 1) {
    if (deps.shouldStop()) {
      result.deadline_reached = true;
      break;
    }
    var message = messages[i];
    handleMessage(message);
    // 店舗スレ（ツールが立てた月ごとの親投稿）の返信には、注文・請求書の投稿がある
    var isBotParent = Boolean(message.bot_id) || (deps.botUserId && message.user === deps.botUserId);
    if (channel.role === 'retail' && isBotParent && (message.reply_count || 0) > 0) {
      var replies = deps.replies(channel.id, message.ts, deps.shouldStop);
      for (var j = 0; j < replies.length; j += 1) {
        if (stringValue_(replies[j].ts) === stringValue_(message.ts)) {
          continue;
        }
        if (deps.shouldStop()) {
          result.deadline_reached = true;
          break;
        }
        handleMessage(replies[j]);
      }
    }
  }
  return result;
}

// 古い送った記録を片付ける（投稿の ts が RICE_STATE_KEEP_DAYS より前）。
function ricePruneState_(nowMs) {
  var properties = PropertiesService.getScriptProperties();
  var all = properties.getProperties();
  var limitSeconds = Math.floor(nowMs / 1000) - RICE_STATE_KEEP_DAYS * 86400;
  var pruned = 0;
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(RICE_STATE_PROPERTY_PREFIX) !== 0) {
      return;
    }
    var match = key.match(/_(\d+)_(\d+)$/);
    if (match && parseInt(match[1], 10) < limitSeconds) {
      properties.deleteProperty(key);
      pruned += 1;
    }
  });
  return pruned;
}

// ---------------------------------------------------------------------------
// 入口3：入金期日を Google カレンダーへ（2026-11-06 の直し（5回目））
// ツールの rice-due-dates.php に署名付きで要求し（eventId は "rice-due:" で始める）、請求書ごとに期日の終日の予定を作る・直す・消す。
// - 請求書 id → 予定 id を Script Properties の RICE_CAL_{invoiceId} に残す（二重に作らない）。
// - 題・日付・説明が違うときだけ直す。同じ中身なら RICE_CALENDAR_RECHECK_HOURS ごとにだけ予定を見に行く（毎時の呼び出しを減らす）。
// - 予定が人の手で消されていたら作り直さない（Properties に s='user_deleted' と残す）。void の請求書は予定を消す。
// - 失敗は握って errors シートと結果の errors に残す（ほかの段階は止めない）。
// ---------------------------------------------------------------------------

var RICE_CALENDAR_PROPERTY_PREFIX = 'RICE_CAL_';
var RICE_CALENDAR_BUDGET_SECONDS = 20;  // 1回の実行でカレンダーに使う時間の上限
var RICE_CALENDAR_RESERVE_SECONDS = 10; // スタンプの拾い直しが、カレンダーのために残しておく時間
var RICE_CALENDAR_RECHECK_HOURS = 24;   // 中身が変わらない予定を、人が直していないか見に行く間隔
var RICE_DUE_DATES_EVENT_PREFIX = 'rice-due:';

function riceYen_(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function riceIsYmd_(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(stringValue_(value));
}

// "2026-11-23" → スクリプトのタイムゾーン（Asia/Tokyo）のその日の 0 時（終日の予定に渡す形）
function riceDateFromYmd_(ymd) {
  var parts = stringValue_(ymd).split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function riceYmdFromDate_(date) {
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd') : '';
}

function riceSha256Hex_(text) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, stringValue_(text), Utilities.Charset.UTF_8));
}

/** ツールの1件 → 予定の題・日付・説明（と、その中身の印）。 */
function riceCalendarEventSpec_(invoice) {
  var total = Number(invoice.totalAmount) || 0;
  var amountDue = invoice.amountDue === undefined || invoice.amountDue === null ? total : Number(invoice.amountDue) || 0;
  var outstanding = Math.max(0, Number(invoice.outstanding) || 0);
  var paid = outstanding <= 0;
  var name = stringValue_(invoice.billingAccountName).trim() || '（不明な請求先）';
  var title = (paid ? '【入金済】' : '【入金期日】') + name + ' ' + riceYen_(amountDue) + '円';
  var lines = [
    '請求書番号 ' + stringValue_(invoice.invoiceNo),
    '期間 ' + stringValue_(invoice.periodLabel),
    '請求額 ' + riceYen_(total) + '円'
  ];
  if (amountDue !== total) {
    lines.push('今回お支払いいただく額 ' + riceYen_(amountDue) + '円（前回の入金超過分を引いた額）');
  }
  lines.push('未回収 ' + riceYen_(outstanding) + '円' + (paid ? '（入金済）' : ''));
  lines.push('');
  lines.push('米取引ツールの請求書から1時間ごとに自動で入れています。この予定を消すと、もう作り直しません。');
  var description = lines.join('\n');
  var date = stringValue_(invoice.dueDate);
  return {
    title: title,
    date: date,
    description: description,
    hash: riceSha256Hex_(JSON.stringify([title, date, description])).slice(0, 32)
  };
}

// 送る直前の形（テストで中身を確かめるため、送る処理と分ける）。本文は {}。
function riceBuildDueDatesRequest_(riceSettings, timestamp, nonce) {
  var body = '{}';
  var eventId = RICE_DUE_DATES_EVENT_PREFIX + timestamp + ':' + stringValue_(nonce).slice(0, 12);
  return {
    url: riceSettings.dueDatesUrl || riceDueDatesUrl_(riceSettings.apiUrl),
    body: body,
    headers: {
      'X-Seemore-Timestamp': timestamp,
      'X-Seemore-Nonce': nonce,
      'X-Seemore-Event-Id': eventId,
      'X-Seemore-Signature': riceSignature_(timestamp, nonce, eventId, body, riceSettings.secret)
    }
  };
}

/** ツールから入金期日の一覧を読む。読めなければ例外（中身は errors シートへ）。 */
function riceFetchDueDates_(riceSettings) {
  var request = riceBuildDueDatesRequest_(riceSettings, String(Math.floor(Date.now() / 1000)), riceNewNonce_());
  var response = UrlFetchApp.fetch(request.url, {
    method: 'post',
    contentType: 'application/json',
    payload: request.body,
    headers: request.headers,
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    parsed = null;
  }
  if (status !== 200 || !parsed || parsed.ok !== true || !Array.isArray(parsed.invoices)) {
    var error = new Error('入金期日の一覧を読めませんでした: HTTP ' + status);
    error.rawResponse = stringValue_(text).slice(0, 300);
    throw error;
  }
  return parsed.invoices;
}

function riceOpenCalendar_(riceSettings) {
  if (riceSettings.calendarId) {
    var calendar = CalendarApp.getCalendarById(riceSettings.calendarId);
    if (!calendar) {
      throw new Error('RICE_CALENDAR_ID のカレンダーが見つかりません（ID を確かめるか、空にして既定のカレンダーを使ってください）。');
    }
    return calendar;
  }
  return CalendarApp.getDefaultCalendar();
}

// どのカレンダーに作った予定か（カレンダー ID そのものは残さず、印だけ）。
function riceCalendarKey_(calendarId) {
  return riceSha256Hex_(calendarId).slice(0, 12);
}

function riceCalendarPropertyStore_() {
  var properties = PropertiesService.getScriptProperties();
  return {
    getAll: function() {
      var all = properties.getProperties();
      var states = {};
      Object.keys(all).forEach(function(key) {
        if (key.indexOf(RICE_CALENDAR_PROPERTY_PREFIX) !== 0) {
          return;
        }
        try {
          states[key] = JSON.parse(all[key]);
        } catch (error) {
          states[key] = null;
        }
      });
      return states;
    },
    set: function(key, state) {
      properties.setProperty(key, JSON.stringify(state));
    },
    remove: function(key) {
      properties.deleteProperty(key);
    }
  };
}

function riceSyncDueDatesToCalendarSafely_(runtimeDeadlineMs, deps) {
  try {
    return riceSyncDueDatesToCalendar_(runtimeDeadlineMs, deps);
  } catch (error) {
    try {
      saveError('riceCalendar', error);
    } catch (saveFailure) {
      Logger.log('riceCalendar: ' + (error && error.message ? error.message : error));
    }
    return {ok: false, error_count: 1, errors: [error && error.message ? error.message : String(error)], deadline_reached: false};
  }
}

/**
 * 入金期日の予定を作る・直す・消す。deps でツール・カレンダー・記録・時刻を差し替えられる（テスト用）。
 * RICE_API_ENABLED が true でなければ何もしない。返り値は scheduled_run_logs の rice_recovery.calendar に入る。
 */
function riceSyncDueDatesToCalendar_(runtimeDeadlineMs, deps) {
  deps = deps || {};
  var riceSettings = deps.settings || getRiceSettings_();
  var result = {
    ok: true,
    invoices_seen: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    user_deleted: 0,
    skipped_user_deleted: 0,
    pruned: 0,
    error_count: 0,
    errors: [],
    deadline_reached: false
  };
  if (!riceSettings.enabled) {
    result.skipped = true;
    result.reason = 'rice_disabled';
    return result;
  }
  if (riceSettings.calendarEnabled === false) {
    result.skipped = true;
    result.reason = 'calendar_disabled';
    return result;
  }
  var shouldStop = deps.shouldStop || function() {
    return runtimeDeadlineReached_(runtimeDeadlineMs);
  };
  var onError = deps.onError || function(error, context) {
    saveError('riceCalendar:' + context, error);
  };
  var noteError = function(context, error) {
    result.error_count += 1;
    if (result.errors.length < 10) {
      result.errors.push(context + ': ' + (error && error.message ? error.message : String(error)));
    }
    onError(error, context);
  };
  // 毎時の実行と手での実行が重なっても二重に作らない（スクリプトのロックは🚀転送が使うので、ユーザーのロックを使う）
  var lock = deps.lock || LockService.getUserLock();
  if (!lock.tryLock(1000)) {
    result.skipped = true;
    result.reason = 'calendar_sync_running';
    return result;
  }
  try {
    var calendar;
    var invoices;
    try {
      calendar = deps.calendar || riceOpenCalendar_(riceSettings);
    } catch (calendarError) {
      result.ok = false;
      noteError('calendar', calendarError);
      return result;
    }
    try {
      invoices = (deps.fetchDueDates || riceFetchDueDates_)(riceSettings);
    } catch (fetchError) {
      result.ok = false;
      noteError('due_dates', fetchError);
      return result;
    }
    var store = deps.props || riceCalendarPropertyStore_();
    var states = store.getAll();
    var calendarKey = riceCalendarKey_(calendar.getId());
    var nowMs = deps.nowMs || Date.now();
    var listed = {};
    for (var i = 0; i < invoices.length; i += 1) {
      if (shouldStop()) {
        result.deadline_reached = true;
        break;
      }
      var invoice = invoices[i] || {};
      var invoiceId = stringValue_(invoice.invoiceId);
      if (!invoiceId || !riceIsYmd_(invoice.dueDate)) {
        continue;
      }
      var key = RICE_CALENDAR_PROPERTY_PREFIX + invoiceId;
      listed[key] = true;
      result.invoices_seen += 1;
      try {
        riceSyncOneDueDate_(invoice, key, states[key] || null, calendar, calendarKey, store, nowMs, result);
      } catch (error) {
        noteError(stringValue_(invoice.invoiceNo) || invoiceId, error);
      }
    }
    // void のまま一覧から外れた（void から90日たった）請求書の記録を片付ける
    if (!result.deadline_reached) {
      Object.keys(states).forEach(function(stateKey) {
        if (!listed[stateKey] && states[stateKey] && states[stateKey].s === 'void') {
          store.remove(stateKey);
          result.pruned += 1;
        }
      });
    }
  } finally {
    lock.releaseLock();
  }
  return result;
}

function riceSyncOneDueDate_(invoice, key, state, calendar, calendarKey, store, nowMs, result) {
  if (state && state.k && state.k !== calendarKey) {
    state = null; // RICE_CALENDAR_ID を変えた：新しいカレンダーに作る（前のカレンダーの予定はそのまま）
  }
  var status = stringValue_(invoice.status);
  if (status === 'void') {
    if (state && state.s === 'active' && state.e) {
      var oldEvent = calendar.getEventById(state.e);
      if (oldEvent) {
        oldEvent.deleteEvent();
        result.deleted += 1;
      }
    }
    if (state && state.s !== 'void') {
      store.set(key, {e: state.e || '', k: calendarKey, s: 'void', c: nowMs});
    }
    return;
  }
  if (status !== 'issued') {
    return;
  }
  if (state && state.s === 'user_deleted') {
    result.skipped_user_deleted += 1;
    return;
  }
  if (state && state.s === 'void') {
    return; // void になった請求書は元に戻らない
  }
  var spec = riceCalendarEventSpec_(invoice);
  if (!state || !state.e) {
    var created = calendar.createAllDayEvent(spec.title, riceDateFromYmd_(spec.date), {description: spec.description});
    store.set(key, {e: created.getId(), k: calendarKey, s: 'active', h: spec.hash, c: nowMs});
    result.created += 1;
    return;
  }
  if (state.h === spec.hash && nowMs - (Number(state.c) || 0) < RICE_CALENDAR_RECHECK_HOURS * 3600 * 1000) {
    result.unchanged += 1;
    return;
  }
  var event = calendar.getEventById(state.e);
  if (!event) {
    // 人の手で消された：作り直さない
    store.set(key, {e: state.e, k: calendarKey, s: 'user_deleted', h: state.h || '', c: nowMs});
    result.user_deleted += 1;
    return;
  }
  var changed = false;
  if (stringValue_(event.getTitle()) !== spec.title) {
    event.setTitle(spec.title);
    changed = true;
  }
  if (stringValue_(event.getDescription()) !== spec.description) {
    event.setDescription(spec.description);
    changed = true;
  }
  if (!event.isAllDayEvent() || riceYmdFromDate_(event.getAllDayStartDate()) !== spec.date) {
    event.setAllDayDate(riceDateFromYmd_(spec.date));
    changed = true;
  }
  store.set(key, {e: state.e, k: calendarKey, s: 'active', h: spec.hash, c: nowMs});
  if (changed) {
    result.updated += 1;
  } else {
    result.unchanged += 1;
  }
}

/**
 * Apps Script の画面から手で1回動かす用（関数の一覧で選んで「実行」）。初めて動かすときに Google カレンダーの許可を求められる。
 * RICE_API_ENABLED=true のときだけ予定を作る。結果は実行ログに出る。
 */
function runRiceCalendarSyncNow() {
  // settings シートを直した直後でも今の値で動くよう、5分のキャッシュを捨てて読み直す
  RICE_SETTINGS_MEMO_ = null;
  try {
    CacheService.getScriptCache().remove(RICE_SETTINGS_CACHE_KEY);
  } catch (cacheError) {
    // キャッシュが使えなくても動く
  }
  var result = riceSyncDueDatesToCalendarSafely_(Date.now() + 60 * 1000, {});
  Logger.log('runRiceCalendarSyncNow: ' + JSON.stringify(result));
  return result;
}

// ---------------------------------------------------------------------------
// 合成データのテスト（Slack・ツールへは送らない）。ローカルでは local-tests/run-logic-tests.js から動かす。
// ---------------------------------------------------------------------------

function testRiceLogic() {
  var secret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  var settings = parseRiceSettings_({
    RICE_API_ENABLED: 'true',
    RICE_API_URL: 'https://seikyu.test/api/rice-slack-events.php',
    RICE_API_SECRET: secret,
    RICE_CHANNEL_IDS: 'C0DELIV:delivery, C0PURCH:purchase, C0STORE:retail, bad-id, C0DELIV:purchase'
  });

  // 設定
  assertTest_(settings.enabled === true, 'rice settings must be enabled when all values are valid');
  assertTest_(settings.channels.length === 3, 'rice channel ids must drop invalid and duplicate entries');
  assertTest_(riceChannelRole_(settings, 'C0PURCH') === 'purchase', 'rice channel role must be parsed');
  assertTest_(riceChannelRole_(settings, 'C0OTHER') === '', 'unknown channel must have no rice role');
  assertTest_(parseRiceSettings_({RICE_API_ENABLED: 'true', RICE_API_SECRET: 'short', RICE_CHANNEL_IDS: 'C1'}).enabled === false, 'invalid secret must keep rice disabled');
  assertTest_(parseRiceSettings_({RICE_API_ENABLED: 'false', RICE_API_SECRET: secret, RICE_CHANNEL_IDS: 'C1'}).enabled === false, 'RICE_API_ENABLED=false must keep rice disabled');
  assertTest_(parseRiceSettings_({}).enabled === false, 'missing rice settings must keep rice disabled');

  // 署名：ツール側（tests/rice-slack-check.php）と同じ入力で同じ16進数になる
  var vectorBody = riceAsciiJson_({eventId: 'rice:C0DELIV:1762300001.000100:eyes:U0STAFF:added', type: 'reaction_added', text: '白米'});
  assertTest_(vectorBody === '{"eventId":"rice:C0DELIV:1762300001.000100:eyes:U0STAFF:added","type":"reaction_added","text":"\\u767d\\u7c73"}', 'rice body must escape non-ASCII like the vehicle integration');
  var vectorSignature = riceSignature_('1762300000', 'abcdef0123456789abcdef0123456789', 'rice:C0DELIV:1762300001.000100:eyes:U0STAFF:added', vectorBody, secret);
  assertTest_(vectorSignature === '9b14749186b04733843fd3d697a7beb37a4bfe587986767ebc5baf97aec6bfa1', 'rice signature must match the PHP implementation: ' + vectorSignature);
  var request = riceBuildRequest_({eventId: 'rice:C0DELIV:1.2:eyes:U1:added', type: 'reaction_added'}, settings, '1762300000', 'n0nce0123456789abcdef');
  assertTest_(request.headers['X-Seemore-Event-Id'] === 'rice:C0DELIV:1.2:eyes:U1:added', 'rice request must carry the event id header');
  assertTest_(request.headers['X-Seemore-Signature'] === riceSignature_('1762300000', 'n0nce0123456789abcdef', 'rice:C0DELIV:1.2:eyes:U1:added', request.body, secret), 'rice request signature must cover timestamp, nonce, event id and body');
  assertTest_(request.url === 'https://seikyu.test/api/rice-slack-events.php', 'rice request must use RICE_API_URL');

  // eventId
  assertTest_(riceEventId_('C0DELIV', '1762300001.000100', 'white_check_mark', 'U0STAFF', 'added') === 'rice:C0DELIV:1762300001.000100:white_check_mark:U0STAFF:added', 'rice event id format');
  var japaneseId = riceEventId_('C0DELIV', '1.2', '完了', 'U0STAFF', 'removed');
  assertTest_(/^[\x21-\x7E]+$/.test(japaneseId) && japaneseId === 'rice:C0DELIV:1.2:%E5%AE%8C%E4%BA%86:U0STAFF:removed', 'non-ASCII reaction names must be percent-encoded in the event id: ' + japaneseId);
  assertTest_(riceNormalizeReaction_(':+1::skin-tone-3:') === '+1', 'skin tone must be removed from reaction names');

  // 振り分け
  var added = riceRouteSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'Eyes', item: {type: 'message', channel: 'C0DELIV', ts: '1762300001.000100'}, event_ts: '1762300050.000200'}, settings, 'U0BOT');
  assertTest_(added && added.type === 'reaction_added' && added.reaction === 'eyes' && added.action === 'added', 'reaction in a rice channel must be routed');
  assertTest_(added.eventId === 'rice:C0DELIV:1762300001.000100:eyes:U0STAFF:added', 'routed reaction must carry the contract event id');
  assertTest_(added.occurredAt === new Date(1762300050000).toISOString(), 'reaction time must come from event_ts');
  var removed = riceRouteSlackEvent_({type: 'reaction_removed', user: 'U0STAFF', reaction: 'eyes', item: {type: 'message', channel: 'C0DELIV', ts: '1762300001.000100'}}, settings, 'U0BOT');
  assertTest_(removed && removed.type === 'reaction_removed' && /:removed$/.test(removed.eventId), 'reaction_removed must be routed');
  assertTest_(riceRouteSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'rocket', item: {type: 'message', channel: 'C0CAR', ts: '1.2'}}, settings, 'U0BOT') === null, 'reactions outside rice channels must be ignored');
  assertTest_(riceRouteSlackEvent_({type: 'reaction_added', user: 'U0BOT', reaction: 'rocket', item: {type: 'message', channel: 'C0STORE', ts: '1.2'}}, settings, 'U0BOT') === null, 'reactions added by the bot itself must be ignored');
  assertTest_(riceRouteSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'eyes', item: {type: 'file', file: 'F1'}}, settings, 'U0BOT') === null, 'file reactions must be ignored');
  var disabled = parseRiceSettings_({RICE_API_ENABLED: 'false', RICE_API_SECRET: secret, RICE_CHANNEL_IDS: 'C0DELIV'});
  assertTest_(riceRouteSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'eyes', item: {type: 'message', channel: 'C0DELIV', ts: '1.2'}}, disabled, 'U0BOT') === null, 'disabled rice settings must not route anything');
  var text = riceRouteSlackEvent_({type: 'message', channel: 'C0PURCH', user: 'U0MIYA', text: '山田さん 白米300kg 12万円', ts: '1762400000.000100'}, settings, 'U0BOT');
  assertTest_(text && text.type === 'purchase_text_observed' && text.eventId === 'rice:C0PURCH:1762400000.000100:text:U0MIYA:posted', 'human purchase text must be routed');
  assertTest_(riceRouteSlackEvent_({type: 'message', channel: 'C0PURCH', bot_id: 'B1', user: 'U0BOT', text: '【仕入報告】', ts: '1.2'}, settings, 'U0BOT') === null, 'bot purchase posts must not be routed');
  assertTest_(riceRouteSlackEvent_({type: 'message', channel: 'C0PURCH', user: 'U0MIYA', text: 'OKです', ts: '1.3', thread_ts: '1.2'}, settings, 'U0BOT') === null, 'thread replies must not become purchase reports');
  assertTest_(riceRouteSlackEvent_({type: 'message', channel: 'C0DELIV', user: 'U0MIYA', text: '白米300kg', ts: '1.4'}, settings, 'U0BOT') === null, 'text outside the purchase channel must be ignored');
  assertTest_(riceRouteSlackEvent_({type: 'message', subtype: 'message_changed', channel: 'C0PURCH', user: 'U0MIYA', text: 'x', ts: '1.5'}, settings, 'U0BOT') === null, 'edited message events must be ignored');

  // 送った記録と二重防止（イベントの経路）
  var memory = {};
  var store = {
    get: function(channelId, messageTs) {
      return riceParseState_(memory[riceStateKey_(channelId, messageTs)]);
    },
    set: function(channelId, messageTs, state) {
      memory[riceStateKey_(channelId, messageTs)] = JSON.stringify({t: 1, r: state.r});
    }
  };
  var sentPayloads = [];
  var nextStatus = 200;
  var fakeSend = function(payload) {
    sentPayloads.push(payload);
    return {ok: nextStatus >= 200 && nextStatus < 300, status: nextStatus, permanent: nextStatus === 400, response: {ok: true}};
  };
  var errors = [];
  var deps = {settings: settings, botUserId: 'U0BOT', store: store, send: fakeSend, onError: function(error) { errors.push(error); }};
  var eventResult = riceHandleSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'eyes', item: {type: 'message', channel: 'C0DELIV', ts: '1762300001.000100'}, event_ts: '1762300050.0'}, {}, deps);
  assertTest_(eventResult.ok && sentPayloads.length === 1, 'event path must send one rice event');
  assertTest_(riceAlreadySent_(store, sentPayloads[0]), 'event path must record the sent reaction');
  var ignored = riceHandleSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'rocket', item: {type: 'message', channel: 'C0CAR', ts: '9.9'}}, {}, deps);
  assertTest_(ignored.ignored === true && sentPayloads.length === 1, 'event path must not send events outside rice channels');
  var ignoredType = riceHandleSlackEvent_({type: 'channel_created'}, {}, deps);
  assertTest_(ignoredType.ignored === true, 'unrelated Slack event types must be ignored');
  nextStatus = 500;
  riceHandleSlackEvent_({type: 'reaction_added', user: 'U0STAFF', reaction: 'white_check_mark', item: {type: 'message', channel: 'C0DELIV', ts: '1762300001.000100'}}, {}, deps);
  assertTest_(errors.length === 1 && !riceAlreadySent_(store, sentPayloads[1]), 'failed sends must not be recorded so recovery retries them');
  nextStatus = 200;
  assertTest_(riceBotUserIdFromEnvelope_({authorizations: [{is_bot: true, user_id: 'U0FROMENV'}]}) === 'U0FROMENV', 'bot user id must come from the event envelope');

  // 拾い直し：未送信の付いたスタンプ・外れたスタンプ・ボットのスタンプ・人数が切られたスタンプ
  var state = store.get('C0DELIV', '1762300001.000100');
  var diff = riceDiffReactions_({ts: '1762300001.000100', reactions: [
    {name: 'eyes', count: 1, users: ['U0STAFF']},
    {name: 'white_check_mark', count: 1, users: ['U0STAFF']},
    {name: 'rocket', count: 1, users: ['U0BOT']}
  ]}, state, 'U0BOT');
  assertTest_(diff.length === 1 && diff[0].reaction === 'white_check_mark' && diff[0].action === 'added', 'recovery must send only reactions not yet sent: ' + JSON.stringify(diff));
  var removedDiff = riceDiffReactions_({ts: '1762300001.000100', reactions: []}, state, 'U0BOT');
  assertTest_(removedDiff.length === 1 && removedDiff[0].reaction === 'eyes' && removedDiff[0].action === 'removed', 'recovery must detect removed reactions');
  var truncatedDiff = riceDiffReactions_({ts: '1762300001.000100', reactions: [{name: 'eyes', count: 60, users: ['U0OTHER']}]}, state, 'U0BOT');
  assertTest_(truncatedDiff.every(function(change) { return change.action !== 'removed'; }), 'truncated reaction user lists must not be treated as removals');

  // 拾い直しの1チャンネル分（店舗スレの返信も見る・二回目は送らない）
  var nowMs = 1762400000 * 1000;
  var history = {
    C0STORE: [
      {ts: String(1762400000 - 20 * 86400) + '.000100', bot_id: 'B1', user: 'U0BOT', reply_count: 2, reactions: []},
      {ts: '1762399000.000100', user: 'U0HUMAN', text: '雑談', reactions: [{name: 'eyes', count: 1, users: ['U0HUMAN']}]}
    ],
    C0PURCH: [
      {ts: '1762399500.000100', user: 'U0MIYA', text: '白米300kg', reactions: [{name: 'ok', count: 1, users: ['U0OFFICE']}]},
      {ts: '1762399600.000100', bot_id: 'B1', user: 'U0BOT', text: '【仕入報告】', reactions: []}
    ]
  };
  var replies = {};
  replies[history.C0STORE[0].ts] = [
    history.C0STORE[0],
    {ts: '1762390000.000100', bot_id: 'B1', user: 'U0BOT', text: '【請求書】', reactions: [{name: 'moneybag', count: 2, users: ['U0OFFICE', 'U0BOT']}]}
  ];
  sentPayloads = [];
  var recoveryDeps = {
    settings: settings,
    botUserId: 'U0BOT',
    store: store,
    send: fakeSend,
    onError: function(error) { errors.push(error); },
    history: function(channelId) { return history[channelId] || []; },
    replies: function(channelId, threadTs) { return replies[threadTs] || []; },
    shouldStop: function() { return false; },
    nowMs: nowMs
  };
  var storeResult = riceRecoverChannel_({id: 'C0STORE', role: 'retail'}, recoveryDeps);
  assertTest_(storeResult.sent_count === 2, 'retail recovery must send reactions on top-level posts and bot thread replies: ' + JSON.stringify(sentPayloads));
  assertTest_(sentPayloads.some(function(payload) { return payload.reaction === 'moneybag' && payload.userId === 'U0OFFICE' && payload.messageTs === '1762390000.000100'; }), 'retail recovery must include the payment stamp on the invoice reply');
  var purchaseResult = riceRecoverChannel_({id: 'C0PURCH', role: 'purchase'}, recoveryDeps);
  assertTest_(purchaseResult.sent_count === 2, 'purchase recovery must send the OK stamp and the human text report');
  assertTest_(sentPayloads.some(function(payload) { return payload.type === 'purchase_text_observed' && payload.messageTs === '1762399500.000100'; }), 'purchase recovery must send text reports');
  var again = riceRecoverChannel_({id: 'C0STORE', role: 'retail'}, recoveryDeps).sent_count + riceRecoverChannel_({id: 'C0PURCH', role: 'purchase'}, recoveryDeps).sent_count;
  assertTest_(again === 0, 'second recovery pass must not resend anything');
  var stopDeps = Object.assign({}, recoveryDeps, {shouldStop: function() { return true; }});
  assertTest_(riceRecoverChannel_({id: 'C0STORE', role: 'retail'}, stopDeps).deadline_reached === true, 'recovery must stop at the runtime deadline');

  // Code.gs からの呼び出し（最小限の2か所）
  assertTest_(String(handleSlackEventPayload_).indexOf('riceHandleSlackEventSafely_') !== -1, 'Slack event dispatch must hand events to Rice.gs');
  assertTest_(String(scheduledMain).indexOf('scheduledRiceRecovery_') !== -1, 'scheduledMain must include the rice recovery phase');

  var calendarResult = testRiceCalendarLogic_(settings, secret);

  Logger.log('testRiceLogic OK');
  return {
    ok: true,
    signature: vectorSignature,
    routed_types: [added.type, removed.type, text.type],
    recovery_sent: storeResult.sent_count + purchaseResult.sent_count,
    calendar: calendarResult
  };
}

// 入金期日の Google カレンダー（CalendarApp・UrlFetchApp は偽物。本物のカレンダー・ツールには触らない）
function testRiceCalendarLogic_(settings, secret) {
  // 要求の形と署名（ツール側 tests/rice-slack-check.php の 34 と同じ値）
  assertTest_(settings.dueDatesUrl === 'https://seikyu.test/api/rice-due-dates.php', 'due dates url must sit next to rice-slack-events.php: ' + settings.dueDatesUrl);
  assertTest_(riceDueDatesUrl_('https://seikyu.test/api/other.php') === 'https://seikyu.test/api/rice-due-dates.php', 'due dates url must fall back to the same folder');
  var dueRequest = riceBuildDueDatesRequest_(settings, '1762300000', 'abcdef0123456789abcdef0123456789');
  assertTest_(dueRequest.body === '{}' && dueRequest.headers['X-Seemore-Event-Id'] === 'rice-due:1762300000:abcdef012345', 'due dates request must post {} with a rice-due: event id');
  assertTest_(dueRequest.headers['X-Seemore-Signature'] === 'bab961b8eae9902ed528075be8d8e4112ad3f6b0ca75b4800eb604226df3a1e9', 'due dates signature must match the PHP implementation: ' + dueRequest.headers['X-Seemore-Signature']);
  assertTest_(dueRequest.headers['X-Seemore-Signature'] === riceSignature_('1762300000', 'abcdef0123456789abcdef0123456789', 'rice-due:1762300000:abcdef012345', '{}', secret), 'due dates signature must cover timestamp, nonce, event id and body');
  assertTest_(riceYmdFromDate_(riceDateFromYmd_('2026-11-23')) === '2026-11-23', 'all-day date must round-trip in the script time zone');
  assertTest_(riceYen_(1234567) === '1,234,567' && riceYen_(0) === '0', 'yen must use thousands separators');

  // 偽物のカレンダー
  var makeCalendar = function(calendarId) {
    var calendar = {events: {}, seq: 0, calls: {create: 0, get: 0, set: 0, del: 0}, failCreateFor: ''};
    calendar.getId = function() { return calendarId; };
    calendar.getEventById = function(id) {
      calendar.calls.get += 1;
      return calendar.events[id] || null;
    };
    calendar.createAllDayEvent = function(title, date, options) {
      calendar.calls.create += 1;
      if (calendar.failCreateFor && title.indexOf(calendar.failCreateFor) !== -1) {
        throw new Error('Calendar の一時的な失敗');
      }
      calendar.seq += 1;
      var id = calendarId + '-ev' + calendar.seq + '@google.com';
      var event = {title: title, date: date, allDay: true, description: (options && options.description) || ''};
      event.getId = function() { return id; };
      event.getTitle = function() { return event.title; };
      event.setTitle = function(value) { calendar.calls.set += 1; event.title = value; };
      event.getDescription = function() { return event.description; };
      event.setDescription = function(value) { calendar.calls.set += 1; event.description = value; };
      event.isAllDayEvent = function() { return event.allDay; };
      event.getAllDayStartDate = function() { return event.date; };
      event.setAllDayDate = function(value) { calendar.calls.set += 1; event.date = value; event.allDay = true; };
      event.deleteEvent = function() { calendar.calls.del += 1; delete calendar.events[id]; };
      calendar.events[id] = event;
      return event;
    };
    calendar.list = function() {
      return Object.keys(calendar.events).map(function(id) { return calendar.events[id]; });
    };
    return calendar;
  };
  var memory = {};
  var props = {
    getAll: function() {
      var out = {};
      Object.keys(memory).forEach(function(key) { out[key] = JSON.parse(memory[key]); });
      return out;
    },
    set: function(key, state) { memory[key] = JSON.stringify(state); },
    remove: function(key) { delete memory[key]; }
  };
  var lockCalls = {tried: 0, released: 0, deny: false};
  var lock = {
    tryLock: function() { lockCalls.tried += 1; return !lockCalls.deny; },
    releaseLock: function() { lockCalls.released += 1; }
  };
  var calendar = makeCalendar('primary-test');
  var list = [];
  var errors = [];
  var hour = 3600 * 1000;
  var nowMs = Date.UTC(2026, 10, 6, 1, 0, 0);
  var sync = function(extra) {
    return riceSyncDueDatesToCalendar_(0, Object.assign({
      settings: settings,
      calendar: calendar,
      fetchDueDates: function() { return JSON.parse(JSON.stringify(list)); },
      props: props,
      lock: lock,
      nowMs: nowMs,
      shouldStop: function() { return false; },
      onError: function(error, context) { errors.push(context + ': ' + error.message); }
    }, extra || {}));
  };
  var invoice = function(id, no, due, total, amountDue, outstanding, status) {
    return {invoiceId: id, invoiceNo: no, billingAccountName: '期日テスト商店', periodLabel: '2026-11 前半', dueDate: due, totalAmount: total, amountDue: amountDue, outstanding: outstanding, status: status || 'issued'};
  };
  var eventFor = function(invoiceId) {
    var state = memory[RICE_CALENDAR_PROPERTY_PREFIX + invoiceId] ? JSON.parse(memory[RICE_CALENDAR_PROPERTY_PREFIX + invoiceId]) : null;
    return state ? calendar.events[state.e] || null : null;
  };
  var stateFor = function(invoiceId) {
    var raw = memory[RICE_CALENDAR_PROPERTY_PREFIX + invoiceId];
    return raw ? JSON.parse(raw) : null;
  };

  // 作る（未入金・満額入金・前受けあり）。期日の無いもの・知らない状態は作らない
  list = [
    invoice('inv-a', 'RI-A', '2026-11-23', 120000, 120000, 120000),
    invoice('inv-b', 'RI-B', '2026-12-08', 80000, 75000, 60000),
    invoice('inv-c', 'RI-C', '2026-11-08', 30000, 30000, 0),
    invoice('inv-n', 'RI-N', '', 10000, 10000, 10000)
  ];
  var first = sync();
  assertTest_(first.ok && first.created === 3 && first.invoices_seen === 3 && first.error_count === 0, 'calendar sync must create one all-day event per invoice with a due date: ' + JSON.stringify(first));
  var eventA = eventFor('inv-a');
  assertTest_(eventA && eventA.title === '【入金期日】期日テスト商店 120,000円', 'unpaid event title must show the name and the amount to pay: ' + (eventA && eventA.title));
  assertTest_(eventA.allDay && riceYmdFromDate_(eventA.date) === '2026-11-23', 'event must be an all-day event on the due date');
  assertTest_(eventA.description.indexOf('請求書番号 RI-A') === 0 && eventA.description.indexOf('期間 2026-11 前半') !== -1 && eventA.description.indexOf('請求額 120,000円') !== -1 && eventA.description.indexOf('未回収 120,000円') !== -1, 'event description must carry invoice no, period, total and outstanding: ' + eventA.description);
  assertTest_(eventFor('inv-c').title === '【入金済】期日テスト商店 30,000円' && eventFor('inv-c').description.indexOf('未回収 0円（入金済）') !== -1, 'fully paid invoice must be titled 【入金済】');
  assertTest_(eventFor('inv-b').title === '【入金期日】期日テスト商店 75,000円' && eventFor('inv-b').description.indexOf('今回お支払いいただく額 75,000円') !== -1 && eventFor('inv-b').description.indexOf('未回収 60,000円') !== -1, 'carried credit must reduce the title amount and show in the description');
  assertTest_(stateFor('inv-n') === null && calendar.list().length === 3, 'invoices without a due date must not get an event');
  assertTest_(lockCalls.tried === 1 && lockCalls.released === 1, 'calendar sync must take and release the lock');

  // 二重に作らない（同じ中身なら予定を見にも行かない）
  var callsBefore = JSON.stringify(calendar.calls);
  nowMs += hour;
  var second = sync();
  assertTest_(second.created === 0 && second.unchanged === 3 && calendar.list().length === 3, 'second sync must not create duplicates: ' + JSON.stringify(second));
  assertTest_(JSON.stringify(calendar.calls) === callsBefore, 'unchanged invoices must not touch the calendar within the recheck window');

  // 直す：一部入金（説明だけ変わる）→ 満額入金（【入金済】になる）
  list[0].outstanding = 20000;
  nowMs += hour;
  var partial = sync();
  assertTest_(partial.updated === 1 && partial.created === 0 && eventFor('inv-a').title === '【入金期日】期日テスト商店 120,000円' && eventFor('inv-a').description.indexOf('未回収 20,000円') !== -1, 'partial payment must update only the description: ' + JSON.stringify(partial));
  list[0].outstanding = 0;
  nowMs += hour;
  var paid = sync();
  assertTest_(paid.updated === 1 && eventFor('inv-a').title === '【入金済】期日テスト商店 120,000円' && eventFor('inv-a').description.indexOf('未回収 0円（入金済）') !== -1, 'full payment must turn the event into 【入金済】');
  assertTest_(calendar.list().length === 3, 'updates must not create new events');

  // 人が題を書き換えた・日付を動かした → 1日ごとの見直しで元に戻す。同じ中身なら直さない
  eventFor('inv-c').title = '手で書き換えた題';
  eventFor('inv-b').date = riceDateFromYmd_('2026-12-20');
  nowMs += RICE_CALENDAR_RECHECK_HOURS * hour + 1;
  var setsBefore = calendar.calls.set;
  var recheck = sync();
  assertTest_(recheck.updated === 2 && recheck.unchanged === 1 && eventFor('inv-c').title === '【入金済】期日テスト商店 30,000円' && riceYmdFromDate_(eventFor('inv-b').date) === '2026-12-08', 'daily recheck must restore edited title and date only where they differ: ' + JSON.stringify(recheck));
  assertTest_(calendar.calls.set === setsBefore + 2, 'only the differing fields must be written');

  // 人の手で消された予定は作り直さない
  var deletedId = stateFor('inv-b').e;
  delete calendar.events[deletedId];
  list[1].outstanding = 10000; // 中身が変わって見に行く
  nowMs += hour;
  var gone = sync();
  assertTest_(gone.user_deleted === 1 && gone.created === 0 && stateFor('inv-b').s === 'user_deleted' && !calendar.events[deletedId], 'event deleted by a person must be recorded and not recreated: ' + JSON.stringify(gone));
  list[1].outstanding = 0;
  nowMs += RICE_CALENDAR_RECHECK_HOURS * hour + 1;
  var stillGone = sync();
  assertTest_(stillGone.created === 0 && stillGone.skipped_user_deleted === 1 && calendar.list().length === 2, 'deleted-by-person events must stay deleted on later runs');

  // void は予定を消す（そのあとは何もしない）。void のまま一覧から外れたら記録を片付ける
  list.push(invoice('inv-d', 'RI-D', '2026-12-23', 50000, 50000, 50000));
  nowMs += hour;
  assertTest_(sync().created === 1 && eventFor('inv-d') !== null, 'new invoice must get an event');
  var eventIdD = stateFor('inv-d').e;
  list[4].status = 'void';
  nowMs += hour;
  var voided = sync();
  assertTest_(voided.deleted === 1 && !calendar.events[eventIdD] && stateFor('inv-d').s === 'void', 'void invoice must delete its event: ' + JSON.stringify(voided));
  var delBefore = calendar.calls.del;
  nowMs += hour;
  var voidAgain = sync();
  assertTest_(voidAgain.deleted === 0 && voidAgain.created === 0 && calendar.calls.del === delBefore, 'void invoice must not be deleted or created twice');
  list.push(invoice('inv-e', 'RI-E', '2026-10-23', 40000, 40000, 40000, 'void'));
  nowMs += hour;
  assertTest_(sync().created === 0 && stateFor('inv-e') === null, 'void invoice never seen before must not create anything');
  list.splice(4, 1); // inv-d が一覧から外れた（void から90日）
  nowMs += hour;
  var pruned = sync();
  assertTest_(pruned.pruned === 1 && stateFor('inv-d') === null && stateFor('inv-b').s === 'user_deleted', 'void records must be pruned once the tool stops listing them (deleted-by-person records stay)');

  // 1件の失敗はほかの請求書を止めない・次の回に作り直す
  list.push(invoice('inv-f', 'RI-F', '2026-12-25', 1000, 1000, 1000));
  list.push(invoice('inv-g', 'RI-G', '2026-12-26', 2000, 2000, 2000));
  calendar.failCreateFor = '1,000円';
  errors = [];
  nowMs += hour;
  var partialFail = sync();
  assertTest_(partialFail.error_count === 1 && partialFail.created === 1 && stateFor('inv-f') === null && stateFor('inv-g') !== null && errors.length === 1 && partialFail.errors[0].indexOf('RI-F') === 0, 'one failing invoice must be reported and must not stop the others: ' + JSON.stringify(partialFail));
  calendar.failCreateFor = '';
  nowMs += hour;
  assertTest_(sync().created === 1 && stateFor('inv-f') !== null, 'failed invoice must be created on the next run');

  // ツールから読めない・カレンダーが開けない → 例外にせず errors に残す
  errors = [];
  var fetchFail = sync({fetchDueDates: function() { throw new Error('入金期日の一覧を読めませんでした: HTTP 401'); }});
  assertTest_(fetchFail.ok === false && fetchFail.error_count === 1 && fetchFail.errors[0].indexOf('due_dates: ') === 0 && errors.length === 1, 'fetch failures must be captured, not thrown: ' + JSON.stringify(fetchFail));
  var safe = riceSyncDueDatesToCalendarSafely_(0, {settings: settings, lock: lock, calendar: calendar, props: props, fetchDueDates: function() { return null; }, onError: function() {}});
  assertTest_(safe.ok === false && safe.error_count === 1, 'unexpected errors must be captured by the safe wrapper: ' + JSON.stringify(safe));
  assertTest_(lockCalls.tried === lockCalls.released, 'the lock must always be released');

  // カレンダーを変えた（RICE_CALENDAR_ID）→ 新しいカレンダーに作る
  var otherCalendar = makeCalendar('rice-other-test');
  nowMs += hour;
  var moved = sync({calendar: otherCalendar});
  assertTest_(moved.created === otherCalendar.list().length && moved.created === 5 && moved.skipped_user_deleted === 0, 'changing the calendar must create the events in the new calendar: ' + JSON.stringify(moved));

  // 止める条件：RICE_API_ENABLED=false・時間切れ・ほかの実行が動いている
  var disabledSettings = parseRiceSettings_({RICE_API_ENABLED: 'false', RICE_API_SECRET: secret, RICE_CHANNEL_IDS: 'C0DELIV'});
  var offResult = sync({settings: disabledSettings, fetchDueDates: function() { throw new Error('呼んではいけない'); }});
  assertTest_(offResult.skipped === true && offResult.reason === 'rice_disabled' && offResult.error_count === 0, 'calendar sync must do nothing while RICE_API_ENABLED is not true');
  var calendarOff = parseRiceSettings_({RICE_API_ENABLED: 'true', RICE_API_URL: 'https://seikyu.test/api/rice-slack-events.php', RICE_API_SECRET: secret, RICE_CHANNEL_IDS: 'C0DELIV', RICE_CALENDAR_ENABLED: 'FALSE'});
  var calendarOffResult = sync({settings: calendarOff, fetchDueDates: function() { throw new Error('呼んではいけない'); }});
  assertTest_(calendarOff.enabled === true && calendarOffResult.skipped === true && calendarOffResult.reason === 'calendar_disabled', 'RICE_CALENDAR_ENABLED=false must stop only the calendar sync');
  assertTest_(settings.calendarEnabled === true, 'calendar sync must be on when RICE_CALENDAR_ENABLED is missing');
  var stopCalendar = makeCalendar('rice-stop-test');
  var stopped = sync({calendar: stopCalendar, shouldStop: function() { return true; }});
  assertTest_(stopped.deadline_reached === true && stopCalendar.calls.create === 0, 'calendar sync must stop at the runtime budget');
  lockCalls.deny = true;
  var locked = sync({calendar: stopCalendar});
  lockCalls.deny = false;
  assertTest_(locked.skipped === true && locked.reason === 'calendar_sync_running' && stopCalendar.calls.create === 0, 'calendar sync must skip when another run holds the lock');

  // 1時間ごとの拾い直し（rice_recovery の段階）から呼ばれる
  assertTest_(String(scheduledRiceRecovery_).indexOf('riceSyncDueDatesToCalendarSafely_') !== -1, 'scheduledRiceRecovery_ must run the calendar sync');
  assertTest_(String(scheduledRiceRecovery_).indexOf('RICE_CALENDAR_RESERVE_SECONDS') !== -1 && String(scheduledRiceRecovery_).indexOf('RICE_CALENDAR_BUDGET_SECONDS') !== -1, 'calendar sync must have its own time budget inside rice_recovery');
  assertTest_(parseRiceSettings_({RICE_CALENDAR_ID: ' cal@example.test '}).calendarId === 'cal@example.test' && parseRiceSettings_({}).calendarId === '', 'RICE_CALENDAR_ID must be read (blank means the default calendar)');

  return {created: calendar.list().length, moved: moved.created};
}
