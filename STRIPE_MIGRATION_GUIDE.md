# Simple Stripe Live Migration

## What You Need to Do

### 1. Get Your Live Keys from Stripe
- Go to Stripe Dashboard
- Switch to **Live** mode (toggle in top left)
- Go to Developers → API Keys
- Copy these 3 keys:
  - **Publishable key** (starts with `pk_live_`)
  - **Secret key** (starts with `sk_live_`)

### 2. Create Live Webhook
- Go to Webhooks in Stripe Dashboard (still in Live mode)
- Click "Add endpoint"
- URL: `https://fasemga.com/api/stripe-webhook`
- Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `payment_intent.payment_failed`
- Copy the **webhook signing secret**

### 3. Update Environment Variables in Vercel
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Update these 3 variables:
  - `STRIPE_PUBLIC_KEY` = your live publishable key
  - `STRIPE_SECRET_KEY` = your live secret key  
  - `STRIPE_WEBHOOK_SECRET` = your live webhook secret

### 4. Deploy
- Redeploy your app in Vercel (or it will auto-deploy)

**That's it. You're now accepting live payments.**

## Quick Test
- Try one real payment with a real card
- Check that the member gets activated in your admin portal
- Check that the webhook shows "delivered" in Stripe dashboard

## GDPR Compliance Requirements

### Data Processing Legal Basis
You need to ensure you have a legal basis for processing payment data:
- **Contract**: Processing is necessary for membership contract performance
- **Legitimate Interest**: Processing for fraud prevention and business operations

### Required Privacy Disclosures
Update your Privacy Policy to include:
- What payment data you collect (card details, billing address, payment history)
- How long you retain payment data (Stripe retains for 7 years for compliance)
- Third parties who process data (Stripe, Firebase)
- User rights (access, rectification, erasure, portability)

### Data Subject Rights Implementation
Ensure you can handle:
- **Right of Access**: Users can request their payment data
- **Right to Rectification**: Users can update billing information
- **Right to Erasure**: Users can request account deletion (with payment history retention for legal compliance)
- **Data Portability**: Users can export their data

### Technical Measures
- ✅ Payment data encrypted in transit (HTTPS)
- ✅ Stripe PCI DSS Level 1 compliant
- ✅ No card details stored on your servers
- ✅ Webhook signature verification prevents tampering

### Required Documentation
1. **Data Processing Agreement** with Stripe (automatically in place)
2. **Privacy Impact Assessment** if processing high-risk data
3. **Record of Processing Activities** including payment processing

### User Consent Requirements
- Clear consent for processing personal data
- Separate consent for marketing communications
- Easy withdrawal of consent mechanism

### Recommended Actions
1. Update Privacy Policy with payment processing details
2. Add data export functionality to member portal
3. Implement data deletion workflow (retaining payment records as legally required)
4. Document your GDPR compliance procedures
5. Consider appointing a Data Protection Officer if required