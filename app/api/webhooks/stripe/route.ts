import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { 
  createSubscriberWithStripe, 
  updateSubscriberStripeStatus,
  getSubscriberByStripeCustomerId 
} from '../../../../lib/firestore';
import { Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook received!');
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    // For development, skip signature verification if no webhook secret
    let event: Stripe.Event;
    
    if (!webhookSecret) {
      console.log('No webhook secret - parsing event without verification (DEV ONLY)');
      event = JSON.parse(body);
    } else {
      if (!signature) {
        console.error('No Stripe signature found');
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
      }

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    console.log('Received Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout session completed:', session.id);
  
  try {
    if (!session.subscription || !session.customer) {
      console.error('Missing subscription or customer in session');
      return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;

    // Extract metadata from session
    const userId = session.metadata?.user_id;
    const organizationName = session.metadata?.organization_name;
    const organizationType = session.metadata?.organization_type as 'MGA' | 'provider' | 'carrier';
    const grossWrittenPremiums = session.metadata?.gross_written_premiums as '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+';

    if (!userId || !organizationName || !organizationType) {
      console.error('Missing required metadata in session:', session.metadata);
      return;
    }

    // Create subscriber in Firestore
    await createSubscriberWithStripe(
      userId,
      organizationName,
      organizationType,
      customer.id,
      subscription.id,
      subscription.status as any,
      subscription.items.data[0].price.id,
      Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
      Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
      (subscription.items.data[0].price as any).unit_amount || 0,
      grossWrittenPremiums
    );

    console.log('Successfully created subscriber for user:', userId);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  try {
    const subscriber = await getSubscriberByStripeCustomerId(subscription.customer as string);
    
    if (subscriber) {
      await updateSubscriberStripeStatus(
        subscriber.uid,
        subscription.status as any,
        Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
        Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000))
      );
      console.log('Successfully updated subscriber status:', subscriber.uid);
    } else {
      console.error('No subscriber found for customer:', subscription.customer);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deleted:', subscription.id);
  
  try {
    const subscriber = await getSubscriberByStripeCustomerId(subscription.customer as string);
    
    if (subscriber) {
      await updateSubscriberStripeStatus(
        subscriber.uid,
        'canceled'
      );
      console.log('Successfully canceled subscriber:', subscriber.uid);
    } else {
      console.error('No subscriber found for customer:', subscription.customer);
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice payment succeeded:', invoice.id);
  
  try {
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
      const subscriber = await getSubscriberByStripeCustomerId(subscription.customer as string);
      
      if (subscriber) {
        await updateSubscriberStripeStatus(
          subscriber.uid,
          'active',
          Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
          Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000))
        );
        console.log('Successfully updated subscriber after payment:', subscriber.uid);
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice payment failed:', invoice.id);
  
  try {
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
      const subscriber = await getSubscriberByStripeCustomerId(subscription.customer as string);
      
      if (subscriber) {
        await updateSubscriberStripeStatus(
          subscriber.uid,
          subscription.status as any
        );
        console.log('Successfully updated subscriber after payment failure:', subscriber.uid);
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}