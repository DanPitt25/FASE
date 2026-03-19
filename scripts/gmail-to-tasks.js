/**
 * FASE Gmail → Tasks Integration
 *
 * Google Apps Script that:
 * 1. Reads unprocessed emails from specified addresses
 * 2. Uses Gemini to classify if email contains action items
 * 3. Creates tasks in Firestore via REST API (with deduplication)
 *
 * SETUP:
 * 1. Go to script.google.com and create a new project
 * 2. Paste this code
 * 3. Add Script Properties (Settings → Script Properties):
 *    - GEMINI_API_KEY: Your Gemini API key from ai.google.dev
 *    - FIREBASE_PROJECT_ID: Your Firebase project ID
 *    - FIREBASE_SERVICE_ACCOUNT: JSON string of your service account
 *    - WEBHOOK_SECRET: A random string for authentication (generate one)
 * 4. Deploy as web app:
 *    - Click Deploy → New deployment
 *    - Select "Web app"
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Copy the web app URL
 * 5. Trigger manually from FASE Admin Portal → Tasks → Email Import
 * 6. Authorize when prompted
 */

// Configuration
const CONFIG = {
  // Email addresses to monitor
  emailAddresses: [
    'daniel.pitt@fasemga.com',
    'admin@fasemga.com'
  ],
  // How many hours back to check for emails
  hoursBack: 12,
  // Label to mark processed emails
  processedLabel: 'FASE-Processed',
  // Gemini model - Pro for better reasoning on email classification
  geminiModel: 'gemini-1.5-pro',
};

/**
 * Main function - run this on a schedule (every 6-12 hours)
 */
function processEmails() {
  const emails = getUnprocessedEmails();
  console.log(`Found ${emails.length} unprocessed emails`);

  for (const email of emails) {
    try {
      const classification = classifyWithGemini(email);

      if (classification.isActionItem) {
        createTask({
          title: classification.taskTitle,
          description: classification.taskDescription,
          priority: classification.priority,
          dueDate: classification.suggestedDueDate,
          sourceEmail: email.from,
          sourceSubject: email.subject,
          sourceDate: email.date,
          emailId: email.id,
        });
        console.log(`Created task: ${classification.taskTitle}`);
      } else {
        console.log(`Skipped (not action item): ${email.subject}`);
      }

      markAsProcessed(email.threadId);
    } catch (error) {
      console.error(`Error processing email ${email.id}:`, error);
    }
  }
}

/**
 * Get unprocessed emails from the last N hours
 * @param {number} hoursBack - How many hours back to check (defaults to CONFIG.hoursBack)
 */
function getUnprocessedEmails(hoursBack) {
  const hours = hoursBack || CONFIG.hoursBack;
  const emails = [];
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Ensure the processed label exists
  let processedLabel = GmailApp.getUserLabelByName(CONFIG.processedLabel);
  if (!processedLabel) {
    processedLabel = GmailApp.createLabel(CONFIG.processedLabel);
  }

  for (const address of CONFIG.emailAddresses) {
    // Search for emails to this address, not already processed
    const query = `to:${address} after:${formatDateForSearch(cutoffDate)} -label:${CONFIG.processedLabel}`;
    const threads = GmailApp.search(query, 0, 50);

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const message of messages) {
        // Only process messages received after cutoff
        if (message.getDate() > cutoffDate) {
          emails.push({
            id: message.getId(),
            threadId: thread.getId(),
            from: message.getFrom(),
            to: message.getTo(),
            subject: message.getSubject(),
            body: message.getPlainBody().substring(0, 3000), // Limit for API
            date: message.getDate().toISOString(),
          });
        }
      }
    }
  }

  return emails;
}

/**
 * Use Gemini to classify if email is an action item
 */
function classifyWithGemini(email) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in Script Properties');
  }

  const prompt = `You are an email classifier for FASE (Fédération des Agences de Souscription Européennes), a trade association for insurance MGAs.

Analyze this email and determine if it contains an action item that requires follow-up.

ACTION ITEMS include:
- Requests for information or documents
- Meeting requests or scheduling needs
- Tasks that need to be completed
- Follow-ups required
- Approvals or decisions needed
- Member inquiries requiring response

NOT action items:
- Newsletters or marketing emails
- Automated notifications (payment confirmations, etc.)
- FYI/informational emails with no required response
- Spam or promotional content

Email:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.body}

Respond with JSON only (no markdown):
{
  "isActionItem": boolean,
  "confidence": number (0-1),
  "taskTitle": string (short, action-oriented title if action item),
  "taskDescription": string (brief summary of what needs to be done),
  "priority": "low" | "medium" | "high",
  "suggestedDueDate": string (ISO date if deadline mentioned, null otherwise),
  "reasoning": string (brief explanation of classification)
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.geminiModel}:generateContent?key=${apiKey}`;

  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      }
    }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(`Gemini API error: ${result.error.message}`);
  }

  const text = result.candidates[0].content.parts[0].text;
  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse Gemini response: ${text}`);
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Check if a task already exists for this email
 */
function taskExistsForEmail(emailId, accessToken, projectId) {
  if (!emailId) return false;

  // Query Firestore for tasks with this emailId
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'tasks' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'emailId' },
          op: 'EQUAL',
          value: { stringValue: emailId }
        }
      },
      limit: 1
    }
  };

  const response = UrlFetchApp.fetch(queryUrl, {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    payload: JSON.stringify(query),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    console.log('Error checking for existing task:', response.getContentText());
    return false; // On error, allow creation
  }

  const results = JSON.parse(response.getContentText());
  // If we get back a document, the task exists
  return results.length > 0 && results[0].document;
}

/**
 * Create a task in Firestore via REST API (with deduplication)
 */
function createTask(taskData) {
  const projectId = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  const serviceAccountJson = PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT');

  if (!projectId || !serviceAccountJson) {
    throw new Error('Firebase credentials not set in Script Properties');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const accessToken = getFirebaseAccessToken(serviceAccount);

  // Check for duplicate before creating
  if (taskData.emailId && taskExistsForEmail(taskData.emailId, accessToken, projectId)) {
    console.log(`Task already exists for email: ${taskData.emailId}`);
    return { skipped: true, reason: 'duplicate' };
  }

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tasks`;

  const document = {
    fields: {
      title: { stringValue: taskData.title },
      description: { stringValue: taskData.description || '' },
      status: { stringValue: 'pending' },
      priority: { stringValue: taskData.priority || 'medium' },
      createdBy: { stringValue: 'gmail-automation' },
      createdByName: { stringValue: 'Email Import' },
      source: { stringValue: 'email' },
      sourceEmail: { stringValue: taskData.sourceEmail || '' },
      sourceSubject: { stringValue: taskData.sourceSubject || '' },
      sourceDate: { stringValue: taskData.sourceDate || '' },
      emailId: { stringValue: taskData.emailId || '' },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    }
  };

  if (taskData.dueDate) {
    document.fields.dueDate = { timestampValue: new Date(taskData.dueDate).toISOString() };
  }

  const response = UrlFetchApp.fetch(firestoreUrl, {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    payload: JSON.stringify(document),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`Firestore error: ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Get Firebase access token using service account
 */
function getFirebaseAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/datastore',
  };

  const signatureInput =
    Utilities.base64EncodeWebSafe(JSON.stringify(header)) + '.' +
    Utilities.base64EncodeWebSafe(JSON.stringify(payload));

  const signature = Utilities.computeRsaSha256Signature(
    signatureInput,
    serviceAccount.private_key
  );

  const jwt = signatureInput + '.' + Utilities.base64EncodeWebSafe(signature);

  const tokenResponse = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });

  const tokenData = JSON.parse(tokenResponse.getContentText());

  if (tokenData.error) {
    throw new Error(`Token error: ${tokenData.error_description}`);
  }

  return tokenData.access_token;
}

/**
 * Mark email thread as processed
 */
function markAsProcessed(threadId) {
  const thread = GmailApp.getThreadById(threadId);
  let label = GmailApp.getUserLabelByName(CONFIG.processedLabel);
  if (!label) {
    label = GmailApp.createLabel(CONFIG.processedLabel);
  }
  thread.addLabel(label);
}

/**
 * Format date for Gmail search
 */
function formatDateForSearch(date) {
  return Utilities.formatDate(date, 'UTC', 'yyyy/MM/dd');
}

/**
 * Remove any existing scheduled triggers
 * Run this if you previously set up triggers and want to remove them
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processEmails') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  }
  console.log(`Removed ${removed} trigger(s). Email import is now manual-only.`);
}

/**
 * Test function - process one email and log result without creating task
 */
function testClassification() {
  const emails = getUnprocessedEmails();
  if (emails.length === 0) {
    console.log('No unprocessed emails found');
    return;
  }

  const email = emails[0];
  console.log(`Testing with: ${email.subject}`);

  const classification = classifyWithGemini(email);
  console.log('Classification result:', JSON.stringify(classification, null, 2));
}

/**
 * Web app entry point - allows triggering via HTTP POST
 * Deploy as web app to get a URL you can call from your site
 */
function doPost(e) {
  try {
    // Verify webhook secret
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    const providedSecret = e?.parameter?.secret || JSON.parse(e?.postData?.contents || '{}').secret;

    if (!secret || providedSecret !== secret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid or missing secret'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Parse request
    const body = JSON.parse(e?.postData?.contents || '{}');
    const action = body.action || 'process';

    // Get hoursBack from request, default to CONFIG value
    const hoursBack = body.hoursBack || CONFIG.hoursBack;

    if (action === 'status') {
      // Return current status without processing
      const emails = getUnprocessedEmails(hoursBack);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        unprocessedCount: emails.length,
        hoursBack: hoursBack,
        emails: emails.slice(0, 5).map(email => ({
          from: email.from,
          subject: email.subject,
          date: email.date
        }))
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'test') {
      // Test classification on first email without creating task
      const emails = getUnprocessedEmails(hoursBack);
      if (emails.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'No unprocessed emails found in the last ' + hoursBack + ' hours'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const email = emails[0];
      const classification = classifyWithGemini(email);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        email: {
          from: email.from,
          subject: email.subject,
          date: email.date
        },
        classification: classification
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'process') {
      // Full processing
      const results = processEmailsWithResults(hoursBack);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        ...results
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Process emails and return results (for webhook)
 * @param {number} hoursBack - How many hours back to check
 */
function processEmailsWithResults(hoursBack) {
  const emails = getUnprocessedEmails(hoursBack);
  const results = {
    totalEmails: emails.length,
    tasksCreated: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
    tasks: []
  };

  for (const email of emails) {
    try {
      const classification = classifyWithGemini(email);

      if (classification.isActionItem) {
        const taskResult = createTask({
          title: classification.taskTitle,
          description: classification.taskDescription,
          priority: classification.priority,
          dueDate: classification.suggestedDueDate,
          sourceEmail: email.from,
          sourceSubject: email.subject,
          sourceDate: email.date,
          emailId: email.id,
        });

        if (taskResult.skipped && taskResult.reason === 'duplicate') {
          results.duplicates++;
        } else {
          results.tasksCreated++;
          results.tasks.push({
            title: classification.taskTitle,
            priority: classification.priority,
            from: email.from
          });
        }
      } else {
        results.skipped++;
      }

      markAsProcessed(email.threadId);
    } catch (error) {
      results.errors.push({
        email: email.subject,
        error: error.toString()
      });
    }
  }

  return results;
}

/**
 * Handle GET requests (for testing the deployment)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'FASE Email Import webhook is running. Use POST to trigger actions.',
    actions: ['status', 'test', 'process']
  })).setMimeType(ContentService.MimeType.JSON);
}
