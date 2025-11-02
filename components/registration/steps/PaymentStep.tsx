import { StepComponentProps } from '../../../lib/registration/types';
import Button from '../../Button';

interface PaymentStepProps extends StepComponentProps {
  paymentMethod: 'stripe' | 'invoice';
  onPaymentMethodChange: (method: 'stripe' | 'invoice') => void;
  onPayment: () => void;
  onInvoiceRequest: () => void;
  processingPayment: boolean;
}

export default function PaymentStep({ 
  state, 
  paymentMethod, 
  onPaymentMethodChange, 
  onPayment, 
  onInvoiceRequest,
  processingPayment 
}: PaymentStepProps) {
  const { 
    membershipType, 
    organizationType, 
    organizationName, 
    firstName, 
    surname, 
    email, 
    members, 
    address, 
    gwpInputs,
    gwpCurrency,
    hasOtherAssociations,
    isAdminTest
  } = state;

  // Calculate total GWP display value
  const calculateDisplayTotal = () => {
    const billions = parseFloat(gwpInputs.billions) || 0;
    const millions = parseFloat(gwpInputs.millions) || 0;
    const thousands = parseFloat(gwpInputs.thousands) || 0;
    const total = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
    return total;
  };

  // Currency conversion rates (approximate modern rates)
  const currencyRates = {
    EUR: 1.0,
    GBP: 1.17, // 1 GBP ≈ 1.17 EUR
    USD: 0.92  // 1 USD ≈ 0.92 EUR
  };

  // Helper function to convert currency to EUR
  const convertToEUR = (value: number, currency: string): number => {
    const rate = currencyRates[currency as keyof typeof currencyRates] || 1;
    return value * rate;
  };

  // Helper function to determine GWP band from EUR value
  const getGWPBand = (eurValue: number): '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+' => {
    const valueInMillions = eurValue / 1000000;
    if (valueInMillions < 10) return '<10m';
    if (valueInMillions < 20) return '10-20m';
    if (valueInMillions < 50) return '20-50m';
    if (valueInMillions < 100) return '50-100m';
    if (valueInMillions < 500) return '100-500m';
    return '500m+';
  };

  const calculateMembershipFee = () => {
    if (isAdminTest) {
      return 0.01; // 1 cent for admin test
    }
    if (membershipType === 'individual') {
      return 500;
    } else if (membershipType === 'corporate' && organizationType === 'MGA') {
      const gwpValue = calculateDisplayTotal();
      if (isNaN(gwpValue) || gwpValue === 0) return 900; // Default if invalid input
      
      // Convert to EUR for band calculation
      const eurValue = convertToEUR(gwpValue, gwpCurrency);
      const band = getGWPBand(eurValue);
      
      switch (band) {
        case '<10m': return 900;
        case '10-20m': return 1100;
        case '20-50m': return 1300;
        case '50-100m': return 1500;
        case '100-500m': return 1700;
        case '500m+': return 2000;
        default: return 900;
      }
    } else {
      // Other corporate types (carrier, provider)
      return 900;
    }
  };

  const getDiscountedFee = () => {
    const baseFee = calculateMembershipFee();
    if (membershipType === 'corporate' && hasOtherAssociations) {
      return Math.round(baseFee * 0.8); // 20% discount
    }
    return baseFee;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Complete Your Membership</h3>
        <p className="text-fase-black text-sm">Review and pay for your FASE membership</p>
      </div>

      {/* Membership Summary */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6 space-y-4">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Membership Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-fase-navy font-medium">Organization:</span>
            <p className="text-fase-black">
              {membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName}
            </p>
          </div>
          
          <div>
            <span className="text-fase-navy font-medium">Membership Type:</span>
            <p className="text-fase-black">
              {membershipType === 'individual' 
                ? 'Individual' 
                : `${organizationType} Corporate`
              }
            </p>
          </div>
          
          <div>
            <span className="text-fase-navy font-medium">Contact Email:</span>
            <p className="text-fase-black">
              {membershipType === 'corporate' 
                ? members.find(m => m.isPrimaryContact)?.email || email
                : email
              }
            </p>
          </div>
          
          <div>
            <span className="text-fase-navy font-medium">Country:</span>
            <p className="text-fase-black">{address.country}</p>
          </div>
          
          {membershipType === 'corporate' && organizationType === 'MGA' && calculateDisplayTotal() > 0 && (
            <div className="md:col-span-2">
              <span className="text-fase-navy font-medium">Gross Written Premiums:</span>
              <p className="text-fase-black">
                {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{calculateDisplayTotal().toLocaleString('en-US')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Annual Membership Fee</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-fase-black">Base Fee</span>
            <span className="text-fase-black">€{calculateMembershipFee()}</span>
          </div>
          
          {membershipType === 'corporate' && hasOtherAssociations && (
            <div className="flex justify-between items-center text-green-600">
              <span>Member Discount (20%)</span>
              <span>-€{calculateMembershipFee() - getDiscountedFee()}</span>
            </div>
          )}
          
          <div className="border-t border-fase-light-gold pt-2 mt-2">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span className="text-fase-navy">Total Annual Fee</span>
              <span className="text-fase-navy">€{getDiscountedFee()}</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-fase-black mt-4">
          * Membership fee is billed annually. You can cancel at any time.
          {membershipType === 'corporate' && hasOtherAssociations && (
            <span> 20% discount applied for members of other European MGA associations.</span>
          )}
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Payment Method</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'stripe' 
                ? 'border-fase-navy bg-fase-light-blue' 
                : 'border-fase-light-gold bg-white hover:border-fase-navy'
            }`}
            onClick={() => onPaymentMethodChange('stripe')}
          >
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                paymentMethod === 'stripe' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
              }`}>
                {paymentMethod === 'stripe' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <span className="font-medium text-fase-navy">Pay Online</span>
            </div>
            <p className="text-sm text-fase-black ml-7">Secure payment via Stripe (Credit/Debit Card)</p>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'invoice' 
                ? 'border-fase-navy bg-fase-light-blue' 
                : 'border-fase-light-gold bg-white hover:border-fase-navy'
            }`}
            onClick={() => onPaymentMethodChange('invoice')}
          >
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                paymentMethod === 'invoice' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
              }`}>
                {paymentMethod === 'invoice' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <span className="font-medium text-fase-navy">Request Invoice</span>
            </div>
            <p className="text-sm text-fase-black ml-7">Pay later via bank transfer</p>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <div className="text-center">
        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={paymentMethod === 'stripe' ? onPayment : onInvoiceRequest}
          disabled={processingPayment}
          className="w-full"
        >
          {processingPayment ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : paymentMethod === 'stripe' ? (
            "Complete Payment"
          ) : (
            "Request Invoice"
          )}
        </Button>
        
        <p className="text-xs text-fase-black mt-3">
          {paymentMethod === 'stripe' 
            ? "Secure payment powered by Stripe. You&apos;ll be redirected to complete your payment."
            : "An invoice will be sent to your email address for payment via bank transfer."
          }
        </p>
      </div>
    </div>
  );
}