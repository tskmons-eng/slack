const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

for (const file of ['gmail_to_slack_notification.js', 'mail.js']) {
  function harness(value = '2026-10-01T12:00:00.500Z') {
    const properties = { SLACK_WEBHOOK_URL: 'https://example.invalid/webhook' };
    if (value !== null) properties.GMAIL_TO_SLACK_START_AT = value;
    const events = [], threads = [], candidates = [], triggers = [];
    const context = vm.createContext({
      PropertiesService: { getScriptProperties: () => ({
        getProperty: key => properties[key] || null,
        setProperty: (key, val) => { properties[key] = val; }
      }) },
      Session: { getActiveUser: () => ({ getEmail: () => 'seemore.co.ltd@gmail.com' }) },
      GmailApp: {
        getUserLabelByName: name => ({ name, getThreads: () => threads }),
        createLabel: () => { throw Error('Unexpected label creation'); },
        search: query => { events.push(['search', query]); return candidates; }
      },
      UrlFetchApp: { fetch: (_, options) => {
        events.push(['send', JSON.parse(options.payload).text]);
        return { getResponseCode: () => 200 };
      } },
      Utilities: { formatDate: date => date.toISOString() },
      Logger: { log: () => {} },
      ScriptApp: {
        getProjectTriggers: () => triggers.slice(),
        deleteTrigger: trigger => triggers.splice(triggers.indexOf(trigger), 1),
        newTrigger: handler => ({ timeBased: () => ({ everyMinutes: minutes => ({
          create: () => triggers.push({ getHandlerFunction: () => handler, minutes })
        }) }) })
      }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    function thread(date, subject) {
      const message = { getDate: () => new Date(date), getSubject: () => subject,
        getFrom: () => 'sender@example.invalid', getPlainBody: () => 'body' };
      return { getMessages: () => [message], getId: () => subject,
        addLabel: label => events.push(['add', subject, label.name]),
        removeLabel: label => events.push(['remove', subject, label.name]) };
    }
    return { context, properties, events, threads, candidates, triggers, thread };
  }

  test(file + ': old and boundary mail never sends, new mail keeps label flow', () => {
    const h = harness();
    h.threads.push(h.thread('2026-09-30', 'old'),
      h.thread('2026-10-01T12:00:00.500Z', 'boundary'),
      h.thread('2026-10-01T12:00:01Z', 'new'));
    h.context.forwardLabeledGmailToSlack();
    assert.equal(h.events.filter(e => e[0] === 'send').length, 1);
    assert.match(h.events.find(e => e[0] === 'send')[1], /new/);
    assert.deepEqual(h.events.filter(e => e[0] !== 'send'), [
      ['remove', 'new', '転送'], ['add', 'new', 'slack転送済み']
    ]);
  });

  test(file + ': search and label stage exclude pre-start mail', () => {
    const h = harness();
    h.candidates.push(h.thread('2026-09-30', 'old'), h.thread('2026-10-02', 'new'));
    h.context.labelGmailToSlackTargets();
    const query = h.events.find(e => e[0] === 'search')[1];
    assert.ok(query.includes('after:' + Math.floor(Date.parse(h.properties.GMAIL_TO_SLACK_START_AT) / 1000)));
    assert.ok(query.includes('-from:me') && query.includes('-label:slack転送済み'));
    assert.deepEqual(h.events.filter(e => e[0] === 'add'), [['add', 'new', '転送']]);
  });

  test(file + ': missing, malformed, and future start times fail before side effects', () => {
    for (const value of [null, 'bad date', '2099-01-01T00:00:00Z']) {
      const h = harness(value);
      assert.throws(() => h.context.scheduledGmailToSlack(), /GMAIL_TO_SLACK_START_AT/);
      assert.throws(() => h.context.forwardLabeledGmailToSlack(), /GMAIL_TO_SLACK_START_AT/);
      assert.throws(() => h.context.installGmailToSlackTrigger(), /GMAIL_TO_SLACK_START_AT/);
      assert.equal(h.events.length, 0);
      assert.equal(h.triggers.length, 0);
    }
  });

  test(file + ': resume retry keeps cutoff, exactly one 5-minute trigger, and other jobs', () => {
    const h = harness(null);
    const other = { getHandlerFunction: () => 'unrelatedJob' };
    h.triggers.push(other);
    h.context.resumeGmailToSlackFromNow();
    const firstStart = h.properties.GMAIL_TO_SLACK_START_AT;
    h.context.resumeGmailToSlackFromNow();
    assert.equal(h.properties.GMAIL_TO_SLACK_START_AT, firstStart);
    assert.equal(h.triggers.length, 2);
    assert.ok(h.triggers.includes(other));
    assert.equal(h.triggers.find(t => t !== other).minutes, 5);
    assert.equal(h.events.filter(e => e[0] === 'send').length, 0);
  });
}
