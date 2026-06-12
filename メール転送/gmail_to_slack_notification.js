/**
 * Gmail -> Slack notifier for Google Apps Script.
 *
 * Run this project under seemore.co.ltd@gmail.com.
 * Store the Slack incoming webhook URL in Script Properties as SLACK_WEBHOOK_URL.
 */
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

  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];

    const subject = message.getSubject() || "(件名なし)";
    const from = message.getFrom() || "";
    const date = Utilities.formatDate(message.getDate(), "Asia/Tokyo", "yyyy/MM/dd HH:mm");

    const body = (message.getPlainBody() || "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = body.slice(0, 300) + (body.length > 300 ? "…" : "");

    const shortUrl = buildGmailThreadUrl_(thread);

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
  return "https://mail.google.com/mail/?authuser=" + encodeURIComponent("seemore.co.ltd@gmail.com") + "#inbox/" + thread.getId();
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
