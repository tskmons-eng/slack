/**
 * Gmail -> Slack notifier for Google Apps Script.
 *
 * Run this project under seemore.co.ltd@gmail.com.
 * Store the Slack incoming webhook URL in Script Properties as SLACK_WEBHOOK_URL.
 */
function forwardLabeledGmailToSlack() {
  const EXPECTED_GMAIL_ACCOUNT = "seemore.co.ltd@gmail.com";
  const DONE_LABEL = "slack転送済み";
  const WEBHOOK_URL = getSlackWebhookUrl_();
  assertExpectedGmailAccount_(EXPECTED_GMAIL_ACCOUNT);

  const query = [
    "in:inbox",
    "newer_than:14d",
    `-label:${DONE_LABEL}`,
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

  let doneLabel = GmailApp.getUserLabelByName(DONE_LABEL);
  if (!doneLabel) {
    doneLabel = GmailApp.createLabel(DONE_LABEL);
  }

  const threads = GmailApp.search(query, 0, 50);

  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];

    const subject = message.getSubject() || "(件名なし)";
    const from = message.getFrom() || "";
    const date = Utilities.formatDate(message.getDate(), "Asia/Tokyo", "yyyy/MM/dd HH:mm");

    const body = (message.getPlainBody() || "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = body.slice(0, 300) + (body.length > 300 ? "..." : "");

    const gmailUrl = buildGmailThreadUrl_(thread);
    const fallbackGmailUrl = buildGmailSearchUrl_(message);
    const shortUrl = slackLinkText_(gmailUrl, "メールを開く") +
      (fallbackGmailUrl ? "\n*開けない時:* " + slackLinkText_(fallbackGmailUrl, "検索で開く") : "");

    const text = [
      "*Gmail通知*",
      `*件名:* ${subject}`,
      `*送信元:* ${from}`,
      `*日時:* ${date}`,
      `*リンク:* ${shortUrl}`,
      "-------------",
      excerpt
    ].join("\n");

    const res = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ text: text }),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      thread.addLabel(doneLabel);
    } else {
      Logger.log("Slack送信失敗: " + res.getResponseCode() + " " + res.getContentText());
    }
  });
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
  return "https://mail.google.com/mail/u/0/#all/" + thread.getId();
}

function buildGmailSearchUrl_(message) {
  const rfc822MessageId = getRfc822MessageId_(message);
  if (!rfc822MessageId) return "";
  return "https://mail.google.com/mail/u/0/#search/" + encodeURIComponent("rfc822msgid:" + rfc822MessageId);
}

function getRfc822MessageId_(message) {
  try {
    return (message.getHeader("Message-ID") || "").trim().replace(/^<|>$/g, "");
  } catch (e) {
    return "";
  }
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
