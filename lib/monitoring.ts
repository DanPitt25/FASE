import { logSecurityEvent } from './auth-security';

// Monitor error rates and trigger alerts
export class ErrorMonitor {
  private static errorCounts = new Map<string, { count: number; lastReset: number }>();
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly ALERT_THRESHOLDS = {
    '500_errors': 10,
    'auth_failures': 20,
    'rate_limits': 15,
    'suspicious_activity': 5
  };

  static async recordError(type: '500_errors' | 'auth_failures' | 'rate_limits' | 'suspicious_activity') {
    const now = Date.now();
    const key = type;
    
    const current = this.errorCounts.get(key) || { count: 0, lastReset: now };
    
    // Reset window if needed
    if (now - current.lastReset > this.WINDOW_MS) {
      current.count = 0;
      current.lastReset = now;
    }
    
    current.count++;
    this.errorCounts.set(key, current);
    
    // Check if threshold exceeded
    const threshold = this.ALERT_THRESHOLDS[type];
    if (current.count >= threshold) {
      await this.triggerAlert(type, current.count, threshold);
      
      // Reset counter after alert to prevent spam
      current.count = 0;
      current.lastReset = now;
      this.errorCounts.set(key, current);
    }
  }
  
  private static async triggerAlert(type: string, count: number, threshold: number) {
    const alertMessage = `SECURITY ALERT: ${type} threshold exceeded. ${count} incidents in last 15 minutes (threshold: ${threshold})`;
    
    console.error('🚨', alertMessage);
    
    // Log critical security event
    await logSecurityEvent({
      type: 'suspicious_activity',
      details: {
        reason: 'error_threshold_exceeded',
        errorType: type,
        count,
        threshold,
        timeWindow: '15 minutes'
      },
      severity: 'critical'
    });
    
    // In production, integrate with:
    // - Email alerts
    // - Slack notifications  
    // - PagerDuty/other alerting systems
    // - SMS alerts for critical events
    
    try {
      // Example: Send to monitoring webhook (replace with your alerting system)
      // await fetch(process.env.ALERT_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     text: alertMessage,
      //     severity: 'critical',
      //     timestamp: new Date().toISOString()
      //   })
      // });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

// Request frequency monitor for DDoS detection
export class RequestMonitor {
  private static requestCounts = new Map<string, { count: number; lastReset: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly RATE_LIMITS = {
    per_ip: 100,        // 100 requests per IP per minute
    api_calls: 200,     // 200 API calls total per minute
    auth_attempts: 20   // 20 auth attempts per IP per minute
  };

  static async checkRequestRate(ip: string, endpoint: string) {
    const now = Date.now();
    
    // Check per-IP rate
    const ipKey = `ip:${ip}`;
    const ipCurrent = this.requestCounts.get(ipKey) || { count: 0, lastReset: now };
    
    if (now - ipCurrent.lastReset > this.WINDOW_MS) {
      ipCurrent.count = 0;
      ipCurrent.lastReset = now;
    }
    
    ipCurrent.count++;
    this.requestCounts.set(ipKey, ipCurrent);
    
    // Check if suspicious
    if (ipCurrent.count > this.RATE_LIMITS.per_ip) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        details: {
          reason: 'high_request_rate',
          ip,
          endpoint,
          requestCount: ipCurrent.count,
          timeWindow: '1 minute'
        },
        severity: 'high'
      });
      
      return false; // Block request
    }
    
    return true; // Allow request
  }
}

// Stripe-specific monitoring
export class StripeMonitor {
  private static readonly EXPECTED_AMOUNTS = {
    min: 50000,   // €500 minimum (individual)
    max: 640000   // €6400 maximum (largest corporate)
  };
  
  static async validatePaymentAmount(amount: number | null, sessionId: string) {
    if (!amount) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        details: {
          reason: 'payment_without_amount',
          sessionId
        },
        severity: 'high'
      });
      return false;
    }
    
    if (amount < this.EXPECTED_AMOUNTS.min || amount > this.EXPECTED_AMOUNTS.max) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        details: {
          reason: 'unusual_payment_amount',
          amount,
          sessionId,
          expectedRange: this.EXPECTED_AMOUNTS
        },
        severity: 'high'
      });
      
      // Still allow but flag for review
      return true;
    }
    
    return true;
  }
  
  static async checkDuplicateWebhook(eventId: string): Promise<boolean> {
    // In production, store processed webhook IDs in Redis or database
    // For now, just log the check
    console.log('Checking duplicate webhook:', eventId);
    return false; // Assume not duplicate for now
  }
}

// Database activity monitor
export class DatabaseMonitor {
  static async logDatabaseOperation(operation: {
    type: 'read' | 'write' | 'delete';
    collection: string;
    documentId?: string;
    userId?: string;
    changes?: any;
  }) {
    // Log all database operations for audit trail
    await logSecurityEvent({
      type: 'auth_success',
      userId: operation.userId,
      details: {
        action: 'database_operation',
        ...operation
      },
      severity: 'low'
    });
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static responseTimes = new Map<string, number[]>();
  
  static recordResponseTime(endpoint: string, timeMs: number) {
    const times = this.responseTimes.get(endpoint) || [];
    times.push(timeMs);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    this.responseTimes.set(endpoint, times);
    
    // Alert on slow responses
    if (timeMs > 5000) { // 5 seconds
      console.warn(`Slow response detected: ${endpoint} took ${timeMs}ms`);
    }
  }
  
  static getAverageResponseTime(endpoint: string): number {
    const times = this.responseTimes.get(endpoint) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
}