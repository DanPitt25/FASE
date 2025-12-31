# Email Notifications for Alerts

## Implementation Summary

Email notifications have been added to the alert system in the admin portal.

### Features Added:

1. **Email Notification Option**: When creating an alert, admins can now check "Send email notification to affected users" to trigger email sending.

2. **Email API Route**: New endpoint `/api/send-alert-email` handles email sending using the existing Resend API infrastructure.

3. **Email Recipients**: Based on the alert's target audience:
   - **All Users**: Emails sent to all approved members
   - **All Members**: Emails sent to all approved non-admin members  
   - **Admins Only**: Emails sent to admin accounts only
   - **By Organization Type**: Emails sent to members of specific organization types (MGA, Carrier, Provider)
   - **Specific Organizations**: Emails sent to members of selected organizations

4. **Email Template**: Professional HTML email template that includes:
   - FASE logo
   - Alert title and message
   - Alert type styling (info, success, warning, error)
   - Optional action button with custom text
   - Automated footer

5. **Visual Indicator**: Alerts that were sent by email show an "EMAIL SENT" badge in the alerts list.

6. **Batch Processing**: Emails are sent in batches of 50 to avoid rate limits.

### Usage:

1. Navigate to Admin Portal > Alerts
2. Click "New Alert"
3. Fill in alert details and translations
4. Check "Send email notification to affected users"
5. Create the alert

Email notifications will be sent to all users in the selected audience.

### Technical Details:

- Modified files:
  - `/app/admin-portal/components/CreateAlertModal.tsx` - Added email checkbox
  - `/app/admin-portal/page.tsx` - Added email sending logic
  - `/lib/unified-messaging.ts` - Added emailSent field to Alert interface
  - `/app/admin-portal/components/AlertsTab.tsx` - Added email sent indicator
  - `/app/api/send-alert-email/route.ts` - New email sending endpoint

- The system only sends emails for English (en) alerts to avoid sending duplicate emails for multi-language alerts.