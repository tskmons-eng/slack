/**
 * Gmail -> Slack notifier for Google Apps Script.
 *
 * Run this project under seemore.co.ltd@gmail.com.
 * Store the Slack incoming webhook URL in Script Properties as SLACK_WEBHOOK_URL.
 */
function forwardLabeledGmailToSlack() {
  const startAt = getGmailToSlackStartAt_();
  const TARGET_LABEL = "転送";
  const DONE_LABEL = "slack転送済み";
  const WEBHOOK_URL = getSlackWebhookUrl_();

  const targetLabel = GmailApp.getUserLabelByName(TARGET_LABEL);
  if (!targetLabel) return;

  let doneLabel = GmailApp.getUserLabelByName(DONE_LABEL);
  if (!doneLabel) {
    doneLabel = GmailApp.createLabel(DONE_LABEL);
  }

  const threads = targetLabel.getThreads();

  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    if (message.getDate().getTime() <= startAt) return;

    const subject = message.getSubject() || "(件名なし)";
    const from = message.getFrom() || "";
    const date = Utilities.formatDate(message.getDate(), "Asia/Tokyo", "yyyy/MM/dd HH:mm");

    const body = (message.getPlainBody() || "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = body.slice(0, 300) + (body.length > 300 ? "…" : "");

    const gmailUrl = buildGmailThreadUrl_(thread);
    const shortUrl = slackLinkText_(gmailUrl, "メールを開く");

    const text = [
      "📩 *Gmail通知*",
      `*件名:* ${subject}`,
      `*送信元:* ${from}`,
      `*日時:* ${date}`,
      `*リンク:* ${shortUrl}`,
      "─────────────",
      excerpt
    ].join("\n");

    const res = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ text: text }),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      thread.removeLabel(targetLabel);
      thread.addLabel(doneLabel);
    } else {
      Logger.log("Slack送信失敗: " + res.getResponseCode() + " " + res.getContentText());
    }
  });
}

function scheduledGmailToSlack() {
  labelGmailToSlackTargets();
  forwardLabeledGmailToSlack();
}

function labelGmailToSlackTargets() {
  getGmailToSlackStartAt_();
  const TARGET_LABEL = "転送";
  const DONE_LABEL = "slack転送済み";
  const targetLabel = getOrCreateGmailLabel_(TARGET_LABEL);

  labelGmailToSlackTargets_(targetLabel, TARGET_LABEL, DONE_LABEL);
}

function labelGmailToSlackTargets_(targetLabel, targetLabelName, doneLabelName) {
  const startAt = getGmailToSlackStartAt_();
  const query = buildGmailToSlackQuery_(targetLabelName, doneLabelName);
  const threads = GmailApp.search(query, 0, 50);

  Logger.log("転送ラベル付与対象: " + threads.length + "件");
  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    if (messages[messages.length - 1].getDate().getTime() <= startAt) return;
    thread.addLabel(targetLabel);
  });
}

function buildGmailToSlackQuery_(targetLabelName, doneLabelName, options) {
  const parts = [
    "in:inbox",
    "newer_than:14d",
    `-label:${doneLabelName}`,
    "-from:me",
    "-subject:セキュリティ",
    `-subject:"Notion Team"`,
    "-subject:security",
    "-subject:不審なアクティビティ",
    `-subject:"Google で iPhone のセットアップを完了しましょう"`,
    "-subject:件の未読メッセージがあります",
    `-subject:"Set preferences, add memory, and choose a look"`,
    "-subject:Notionでチームに参加しましょう",
    "-subject:平素はエックスサーバーをご利用いただき誠にありがとうございます。",
    "-from:info@tamaseika.com",
    "-from:no-reply@accounts.google.com",
    "-from:security-noreply@accountprotection.microsoft.com",
    "-from:mail@mail.adobe.com"
  ];

  parts.push(`-label:${targetLabelName}`);
  parts.push("after:" + Math.floor(getGmailToSlackStartAt_() / 1000));

  return parts.join(" ");
}

function getOrCreateGmailLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

function installGmailToSlackTrigger() {
  assertExpectedGmailAccount_("seemore.co.ltd@gmail.com");
  getGmailToSlackStartAt_();
  removeGmailToSlackTrigger();

  ScriptApp.newTrigger("scheduledGmailToSlack")
    .timeBased()
    .everyMinutes(5)
    .create();
}

// Re-running this function preserves the boundary so retries cannot lose new mail.
function resumeGmailToSlackFromNow() {
  assertExpectedGmailAccount_("seemore.co.ltd@gmail.com");
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("GMAIL_TO_SLACK_START_AT")) {
    properties.setProperty("GMAIL_TO_SLACK_START_AT", new Date().toISOString());
  }
  getSlackWebhookUrl_();
  installGmailToSlackTrigger();
  return getGmailToSlackStatus();
}

function getGmailToSlackStartAt_() {
  const value = PropertiesService.getScriptProperties().getProperty("GMAIL_TO_SLACK_START_AT");
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) {
    throw new Error("Set a valid GMAIL_TO_SLACK_START_AT before forwarding. No mail was sent.");
  }
  return timestamp;
}

// Read-only diagnosis: no sending or Gmail label changes.
function getGmailToSlackStatus() {
  assertExpectedGmailAccount_("seemore.co.ltd@gmail.com");
  const startAt = getGmailToSlackStartAt_();
  const label = GmailApp.getUserLabelByName("転送");
  const threads = label ? label.getThreads() : [];
  let eligible = 0;
  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    if (messages[messages.length - 1].getDate().getTime() > startAt) eligible++;
  });
  const status = {
    start_at_jst: Utilities.formatDate(new Date(startAt), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss"),
    scheduled_trigger_count: ScriptApp.getProjectTriggers().filter(function(trigger) {
      return trigger.getHandlerFunction() === "scheduledGmailToSlack";
    }).length,
    labeled_eligible_count: eligible,
    labeled_past_excluded_count: threads.length - eligible,
    search_candidate_count_up_to_50: GmailApp.search(buildGmailToSlackQuery_("転送", "slack転送済み"), 0, 50).length
  };
  Logger.log(JSON.stringify(status));
  return status;
}

function removeGmailToSlackTrigger() {
  const handlerFunctions = [
    "scheduledGmailToSlack",
    "forwardLabeledGmailToSlack",
    "labelGmailToSlackTargets"
  ];

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlerFunctions.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function buildGmailThreadUrl_(thread) {
  return "https://mail.google.com/mail/u/0/#all/" + thread.getId();
}

function slackLinkText_(url, label) {
  return "<" + url + "|" + String(label || "リンク").replace(/[<>|]/g, " ").trim() + ">";
}

function getSlackWebhookUrl_() {
  const url = PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");
  if (!url) {
    throw new Error("Set the SLACK_WEBHOOK_URL script property before running.");
  }
  return url;
}

function assertExpectedGmailAccount_(expectedEmail) {
  const expected = String(expectedEmail || "").toLowerCase();
  const active = getSessionEmail_("getActiveUser");
  const effective = getSessionEmail_("getEffectiveUser");
  const actual = (active || effective || "").toLowerCase();

  if (!actual) {
    throw new Error("Could not verify the running Google account. Expected " + expectedEmail + ".");
  }

  if (actual !== expected) {
    throw new Error("Wrong Gmail account for Slack forwarding: " + actual + ". Expected " + expectedEmail + ".");
  }
}

function getSessionEmail_(methodName) {
  try {
    const user = Session[methodName]();
    return user && user.getEmail ? String(user.getEmail() || "") : "";
  } catch (e) {
    return "";
  }
}
