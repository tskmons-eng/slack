function forwardLabeledGmailToSlack() {
  const TARGET_LABEL = "転送";
  const DONE_LABEL = "slack転送済み";
  const GMAIL_AUTHUSER = "seemore.co.ltd@gmail.com";
  const WEBHOOK_URL = getSlackWebhookUrl_();

  const targetLabel = getOrCreateGmailLabel_(TARGET_LABEL);
  const doneLabel = getOrCreateGmailLabel_(DONE_LABEL);
  labelGmailToSlackTargets_(targetLabel, TARGET_LABEL, DONE_LABEL);

  const threads = getGmailToSlackTargetThreads_(TARGET_LABEL, DONE_LABEL);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    const message = getLatestEligibleMessage_(messages, GMAIL_AUTHUSER);
    if (!message) return;

    const subject = message.getSubject() || "(件名なし)";
    const from = message.getFrom() || "";
    const date = Utilities.formatDate(message.getDate(), "Asia/Tokyo", "yyyy/MM/dd HH:mm");

    const body = (message.getPlainBody() || "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = body.slice(0, 300) + (body.length > 300 ? "…" : "");

    const gmailUrl = buildGmailThreadUrl_(thread, GMAIL_AUTHUSER);
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

function labelGmailToSlackTargets_(targetLabel, targetLabelName, doneLabelName) {
  const query = [
    "in:inbox",
    "newer_than:14d",
    `-label:${targetLabelName}`,
    `-label:${doneLabelName}`,
    "-from:me",
    "-to:tsk.mons@gmail.com",
    "-cc:tsk.mons@gmail.com",
    "-bcc:tsk.mons@gmail.com",
    "-deliveredto:tsk.mons@gmail.com",
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
  ].join(" ");

  GmailApp.search(query, 0, 50).forEach(function(thread) {
    thread.addLabel(targetLabel);
  });
}

function getOrCreateGmailLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

function getGmailToSlackTargetThreads_(targetLabelName, doneLabelName) {
  const query = [
    `label:${targetLabelName}`,
    "in:inbox",
    "newer_than:14d",
    `-label:${doneLabelName}`,
    "-from:me"
  ].join(" ");

  return GmailApp.search(query, 0, 50);
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

function buildGmailThreadUrl_(thread, authuser) {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(authuser)}#all/${thread.getId()}`;
}

function slackLinkText_(url, label) {
  return `<${url}|${label}>`;
}

function getLatestEligibleMessage_(messages, accountEmail) {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const account = String(accountEmail || "").toLowerCase();

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.getDate().getTime() < cutoff) continue;
    if (messageFromMatches_(message, account)) continue;
    return message;
  }

  return null;
}

function messageFromMatches_(message, accountEmail) {
  return String(message.getFrom() || "").toLowerCase().indexOf(accountEmail) !== -1;
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
