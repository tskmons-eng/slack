function forwardLabeledGmailToSlack() {
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

  threads.forEach(thread => {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1]; // 最新メールだけ送る

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

    const payload = { text };

    const res = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      thread.removeLabel(targetLabel);
      thread.addLabel(doneLabel);
    } else {
      Logger.log(`Slack送信失敗: ${res.getResponseCode()} ${res.getContentText()}`);
    }
  });
}

function labelGmailToSlackTargets() {
  const TARGET_LABEL = "転送";
  const DONE_LABEL = "slack転送済み";
  const targetLabel = getOrCreateGmailLabel_(TARGET_LABEL);

  labelGmailToSlackTargets_(targetLabel, TARGET_LABEL, DONE_LABEL);
}

function labelGmailToSlackTargets_(targetLabel, targetLabelName, doneLabelName) {
  GmailApp.search(buildGmailToSlackQuery_(targetLabelName, doneLabelName), 0, 50)
    .forEach(function(thread) {
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
    "-subject:Notion Team",
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

  return parts.join(" ");
}

function getOrCreateGmailLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

function installGmailToSlackTrigger() {
  assertExpectedGmailAccount_("seemore.co.ltd@gmail.com");
  removeGmailToSlackTrigger();

  ScriptApp.newTrigger("forwardLabeledGmailToSlack")
    .timeBased()
    .everyMinutes(5)
    .create();
}

function removeGmailToSlackTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "forwardLabeledGmailToSlack") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function buildGmailThreadUrl_(thread) {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent("seemore.co.ltd@gmail.com")}#inbox/${thread.getId()}`;
}

function slackLinkText_(url, label) {
  return `<${url}|${label}>`;
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
