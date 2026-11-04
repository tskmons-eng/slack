// 米取引（請求書作成補助の「米取引」モード）との連絡係。
// - Slack の米取引チャンネル（配達・仕入・依頼＿小売取引など）で押された／外されたスタンプと、仕入チャンネルの文章の報告を、
//   署名付きでツール（https://seemore-grp.com/seikyu/api/rice-slack-events.php）へ送る。
// - スタンプの意味（確認・完了・OK・入金完了）はツールの設定で決めるので、ここでは生のスタンプ名をそのまま送る。
// - 1時間ごとの scheduledMain から scheduledRiceRecovery_ を呼び、直近の米チャンネルのスタンプを見直して未送信のものを送る。
// 車案件の紐付け・🚀請求書転送・🛸振込転送には触らない（Code.gs からは2か所だけ呼ばれる）。
// 署名は車管理と同じ方式：HMAC-SHA256(timestamp + "\n" + nonce + "\n" + eventId + "\n" + body, RICE_API_SECRET) の16進数。
// 約束ごとの正本は 請求書作成補助/docs/rice/CONTRACT.md 5章、設定手順は docs/rice/SLACK_SETUP.md。

var RICE_SETTINGS_CACHE_KEY = 'RICE_SETTINGS_V1';
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
    RICE_LOOKBACK_DAYS: raw.RICE_LOOKBACK_DAYS
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
    secret: secret,
    channels: channels,
    lookbackDays: lookbackDays > 0 && lookbackDays <= 60 ? lookbackDays : RICE_DEFAULT_LOOKBACK_DAYS
  };
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
      return runtimeDeadlineReached_(runtimeDeadlineMs);
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

  Logger.log('testRiceLogic OK');
  return {
    ok: true,
    signature: vectorSignature,
    routed_types: [added.type, removed.type, text.type],
    recovery_sent: storeResult.sent_count + purchaseResult.sent_count
  };
}
