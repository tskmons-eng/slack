/**
 * Gmail -> Gmail forwarder for Google Apps Script.
 *
 * Edit only this config block first:
 * - sourceAccountForSetup: the Gmail account where this script should run.
 * - destinationEmail: the Gmail address that receives forwarded messages.
 * - startAfterIso: messages before this timestamp are ignored.
 * - searchQueryParts: Gmail search conditions for the messages to forward.
 *
 * This file is independent from mail.js and does not call the Slack webhook.
 */
const GMAIL_TO_GMAIL_FORWARD_CONFIG = {
  sourceAccountForSetup: "tsk.mons@gmail.com",
  destinationEmail: "seemore.co.ltd@gmail.com",
  doneLabelName: "forwarded_to_seemore",
  startAfterIso: "2026-06-02T17:27:19+09:00",
  triggerEveryMinutes: 5,
  maxThreads: 50,
  searchQueryParts: [
    "in:inbox",
    "newer_than:14d",
    "-from:me",
    'subject:"Yahoo!オークション - 取引メッセージ："'
  ]
};

function forwardSelectedGmailToGmail() {
  runSelectedGmailToGmailForward_(false);
}

function previewSelectedGmailToGmailForward() {
  runSelectedGmailToGmailForward_(true);
}

function installSelectedGmailToGmailForwardTrigger() {
  validateGmailToGmailForwardConfig_(GMAIL_TO_GMAIL_FORWARD_CONFIG);
  deleteSelectedGmailToGmailForwardTriggers_();

  ScriptApp.newTrigger("forwardSelectedGmailToGmail")
    .timeBased()
    .everyMinutes(GMAIL_TO_GMAIL_FORWARD_CONFIG.triggerEveryMinutes)
    .create();

  Logger.log("Installed Gmail forward trigger.");
}

function removeSelectedGmailToGmailForwardTrigger() {
  deleteSelectedGmailToGmailForwardTriggers_();
  Logger.log("Removed Gmail forward trigger.");
}

function runSelectedGmailToGmailForward_(previewOnly) {
  validateGmailToGmailForwardConfig_(GMAIL_TO_GMAIL_FORWARD_CONFIG);

  const config = GMAIL_TO_GMAIL_FORWARD_CONFIG;
  const doneLabel = getOrCreateForwardDoneLabel_(config.doneLabelName);
  const startAfter = new Date(config.startAfterIso);
  const query = buildGmailToGmailForwardQuery_(config);
  const threads = GmailApp.search(query, 0, config.maxThreads);

  threads.forEach(function(thread) {
    const message = getLatestMessageFromThread_(thread);
    if (!message) return;
    if (message.getDate() <= startAfter) return;

    const subject = message.getSubject() || "(no subject)";

    if (previewOnly) {
      Logger.log("[preview] %s", subject);
      return;
    }

    message.forward(config.destinationEmail);
    thread.addLabel(doneLabel);
    Logger.log("[forwarded] %s -> %s", subject, config.destinationEmail);
  });
}

function buildGmailToGmailForwardQuery_(config) {
  return config.searchQueryParts
    .concat(["-label:" + config.doneLabelName])
    .join(" ");
}

function getOrCreateForwardDoneLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

function getLatestMessageFromThread_(thread) {
  const messages = thread.getMessages();
  return messages.length ? messages[messages.length - 1] : null;
}

function deleteSelectedGmailToGmailForwardTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "forwardSelectedGmailToGmail") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function validateGmailToGmailForwardConfig_(config) {
  if (!config.destinationEmail) {
    throw new Error("Set GMAIL_TO_GMAIL_FORWARD_CONFIG.destinationEmail before running.");
  }

  if (config.destinationEmail.indexOf("@") === -1) {
    throw new Error("destinationEmail must be an email address.");
  }

  const query = config.searchQueryParts.join(" ");
  if (query.indexOf("Yahoo!オークション - 取引メッセージ：") === -1) {
    throw new Error("This forwarder must target Yahoo! Auction transaction message emails.");
  }

  if (!config.startAfterIso || isNaN(new Date(config.startAfterIso).getTime())) {
    throw new Error("startAfterIso must be a valid ISO timestamp.");
  }

  if (!config.triggerEveryMinutes || config.triggerEveryMinutes < 1) {
    throw new Error("triggerEveryMinutes must be 1 or greater.");
  }

  if (!config.maxThreads || config.maxThreads < 1) {
    throw new Error("maxThreads must be 1 or greater.");
  }
}
