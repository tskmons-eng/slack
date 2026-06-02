/**
 * Gmail -> Gmail forwarder for Google Apps Script.
 *
 * Edit only this config block first:
 * - destinationEmail: the Gmail address that receives forwarded messages.
 * - searchQueryParts: Gmail search conditions for the messages to forward.
 *
 * This file is independent from mail.js and does not call the Slack webhook.
 */
const GMAIL_TO_GMAIL_FORWARD_CONFIG = {
  destinationEmail: "TO_ADDRESS@gmail.com",
  doneLabelName: "gmail_to_gmail_forwarded",
  maxThreads: 50,
  searchQueryParts: [
    "in:inbox",
    "newer_than:14d",
    "-from:me",
    "from:REPLACE_WITH_SENDER@example.com",
    // Example:
    // 'subject:"invoice"',
    // 'has:attachment'
  ]
};

function forwardSelectedGmailToGmail() {
  runSelectedGmailToGmailForward_(false);
}

function previewSelectedGmailToGmailForward() {
  runSelectedGmailToGmailForward_(true);
}

function runSelectedGmailToGmailForward_(previewOnly) {
  validateGmailToGmailForwardConfig_(GMAIL_TO_GMAIL_FORWARD_CONFIG);

  const config = GMAIL_TO_GMAIL_FORWARD_CONFIG;
  const doneLabel = getOrCreateForwardDoneLabel_(config.doneLabelName);
  const query = buildGmailToGmailForwardQuery_(config);
  const threads = GmailApp.search(query, 0, config.maxThreads);

  threads.forEach(function(thread) {
    const message = getLatestMessageFromThread_(thread);
    if (!message) return;

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

function validateGmailToGmailForwardConfig_(config) {
  if (!config.destinationEmail || config.destinationEmail === "TO_ADDRESS@gmail.com") {
    throw new Error("Set GMAIL_TO_GMAIL_FORWARD_CONFIG.destinationEmail before running.");
  }

  if (config.destinationEmail.indexOf("@") === -1) {
    throw new Error("destinationEmail must be an email address.");
  }

  const query = config.searchQueryParts.join(" ");
  if (query.indexOf("REPLACE_WITH_SENDER") !== -1) {
    throw new Error("Set a specific Gmail search condition before running.");
  }

  if (!config.maxThreads || config.maxThreads < 1) {
    throw new Error("maxThreads must be 1 or greater.");
  }
}
