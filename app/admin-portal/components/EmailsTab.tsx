'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import EmailEditorModal from './EmailEditorModal';
import { createInvoiceRecord } from '../../../lib/firestore';

interface EmailsTabProps {
  prefilledData?: any;
}

type EmailTemplate = 'invoice' | 'standalone_invoice' | 'member_portal_welcome' | 'reminder' | 'freeform';

export default function EmailsTab({ prefilledData = null }: EmailsTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('invoice');
  const [formData, setFormData] = useState({
    email: prefilledData?.email || '',
    cc: '',
    fullName: prefilledData?.accountAdministrator?.name || prefilledData?.personalName || prefilledData?.fullName || '',
    greeting: '',
    gender: 'm',
    organizationName: prefilledData?.organizationName || '',
    organizationType: prefilledData?.organizationType || 'MGA',
    hasOtherAssociations: prefilledData?.hasOtherAssociations || false,
    userLocale: 'en',
    forceCurrency: '',
    address: {
      line1: prefilledData?.businessAddress?.line1 || prefilledData?.registeredAddress?.line1 || '',
      line2: prefilledData?.businessAddress?.line2 || prefilledData?.registeredAddress?.line2 || '',
      city: prefilledData?.businessAddress?.city || prefilledData?.registeredAddress?.city || '',
      county: prefilledData?.businessAddress?.county || prefilledData?.registeredAddress?.county || '',
      postcode: prefilledData?.businessAddress?.postcode || prefilledData?.registeredAddress?.postcode || '',
      country: prefilledData?.businessAddress?.country || prefilledData?.registeredAddress?.country || ''
    },
    // Freeform email fields
    freeformSubject: '',
    freeformBody: '',
    freeformAttachments: [] as File[],
    freeformSender: 'admin@fasemga.com',
    // Payment reminder fields
    reminderAttachment: null as File | null,
    // Custom line item fields
    customLineItem: {
      description: '',
      amount: 0,
      enabled: false
    },
    testPayment: false
  });

  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [defaultTemplate, setDefaultTemplate] = useState<any>(null);
  const [customizedContent, setCustomizedContent] = useState<any>(null);

  // Update form data when prefilledData changes
  useEffect(() => {
    if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        email: prefilledData.email || '',
        fullName: prefilledData?.accountAdministrator?.name || prefilledData.personalName || prefilledData?.fullName || '',
        organizationName: prefilledData.organizationName || '',
        organizationType: prefilledData.organizationType || 'MGA',
        hasOtherAssociations: prefilledData.hasOtherAssociations || false,
        address: {
          line1: prefilledData.businessAddress?.line1 || prefilledData.registeredAddress?.line1 || '',
          line2: prefilledData.businessAddress?.line2 || prefilledData.registeredAddress?.line2 || '',
          city: prefilledData.businessAddress?.city || prefilledData.registeredAddress?.city || '',
          county: prefilledData.businessAddress?.county || prefilledData.registeredAddress?.county || '',
          postcode: prefilledData.businessAddress?.postcode || prefilledData.registeredAddress?.postcode || '',
          country: prefilledData.businessAddress?.country || prefilledData.registeredAddress?.country || ''
        }
      }));
    }
  }, [prefilledData]);

  // Calculate pricing automatically
  const calculateOriginalAmount = () => {
    if (formData.organizationType === 'MGA') {
      const gwp = prefilledData?.portfolio?.grossWrittenPremiums;
      switch (gwp) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2200;
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 7000;
        default: return 900;
      }
    } else if (formData.organizationType === 'carrier') {
      return 4000;
    } else if (formData.organizationType === 'provider') {
      return 5000;
    }
    return 900;
  };

  const originalAmount = calculateOriginalAmount();
  const baseAmount = formData.hasOtherAssociations ? Math.round(originalAmount * 0.8) : originalAmount;
  const finalAmount = formData.customLineItem.enabled ? baseAmount + formData.customLineItem.amount : baseAmount;

  const emailTemplates = {
    invoice: {
      title: 'Invoice Email',
      description: 'Membership acceptance with Stripe payment link and bank transfer option',
      apiEndpoint: '/api/send-membership-invoice-stripe',
      requiresPricing: true,
      generatesPDF: false
    },
    standalone_invoice: {
      title: 'Standalone Invoice',
      description: 'Clean invoice with PDF attachment and Wise bank details',
      apiEndpoint: '/api/send-invoice-only',
      requiresPricing: true,
      generatesPDF: true
    },
    member_portal_welcome: {
      title: 'Member Portal Welcome',
      description: 'Welcome email with portal access for new members',
      apiEndpoint: '/api/send-member-portal-welcome',
      requiresPricing: false,
      generatesPDF: false
    },
    reminder: {
      title: 'Payment Reminder',
      description: 'Remind about pending payment with PDF attachment',
      apiEndpoint: '/api/send-payment-reminder',
      requiresPricing: true,
      generatesPDF: false
    },
    freeform: {
      title: 'Freeform Email',
      description: 'Send custom email with attachments',
      apiEndpoint: '/api/send-freeform-email',
      requiresPricing: false,
      generatesPDF: false
    }
  };

  // Build payload for API calls
  const buildPayload = (isPreview: boolean) => {
    const template = emailTemplates[selectedTemplate];
    const payload: any = {
      preview: isPreview,
      ...formData,
      greeting: formData.greeting || formData.fullName,
      ...(customizedContent && { customizedEmailContent: customizedContent })
    };

    if (selectedTemplate === 'standalone_invoice') {
      payload.invoiceNumber = `FASE-${Math.floor(10000 + Math.random() * 90000)}`;
      payload.totalAmount = finalAmount;
      payload.originalAmount = originalAmount;
      payload.hasOtherAssociations = formData.hasOtherAssociations;
      payload.discountAmount = formData.hasOtherAssociations ? (originalAmount - baseAmount) : 0;
      payload.discountReason = formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '';
      payload.country = formData.address.country;
      payload.address = formData.address;
      payload.userLocale = formData.userLocale;
      payload.forceCurrency = formData.forceCurrency;
      payload.customLineItem = formData.customLineItem.enabled ? formData.customLineItem : null;
    } else {
      payload.template = selectedTemplate;
      if (template.requiresPricing) {
        payload.totalAmount = finalAmount;
        payload.exactTotalAmount = finalAmount;
        payload.originalAmount = originalAmount.toString();
        payload.discountAmount = formData.hasOtherAssociations ? (originalAmount - baseAmount) : 0;
        payload.discountReason = formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '';
        payload.grossWrittenPremiums = prefilledData?.portfolio?.grossWrittenPremiums || '<10m';
        payload.forceCurrency = formData.forceCurrency;
        payload.customLineItem = formData.customLineItem.enabled ? formData.customLineItem : null;
      }
    }

    return payload;
  };

  // Handle file attachment for reminder emails
  const handleReminderAttachment = async (payload: any) => {
    if (selectedTemplate !== 'reminder' || !formData.reminderAttachment) {
      return payload;
    }

    const fileReader = new FileReader();
    const pdfBase64 = await new Promise<string>((resolve, reject) => {
      fileReader.onload = () => {
        const result = fileReader.result as string;
        resolve(result.split(',')[1]);
      };
      fileReader.onerror = reject;
      fileReader.readAsDataURL(formData.reminderAttachment!);
    });

    return {
      ...payload,
      pdfAttachment: pdfBase64,
      pdfFilename: formData.reminderAttachment.name
    };
  };

  // Unified send/preview function
  const sendOrPreview = async (isPreview: boolean) => {
    if (isPreview) {
      setPreviewing(true);
      setPreview(null);
    } else {
      setSending(true);
      setResult(null);
    }

    try {
      const template = emailTemplates[selectedTemplate];
      let payload = buildPayload(isPreview);
      let response;

      if (selectedTemplate === 'freeform') {
        const formDataObj = new FormData();
        Object.keys(payload).forEach(key => {
          if (key !== 'freeformAttachments') {
            formDataObj.append(key, payload[key]);
          }
        });
        if (!isPreview) {
          formData.freeformAttachments.forEach((file) => {
            formDataObj.append('attachments', file);
          });
        }
        response = await fetch(template.apiEndpoint, {
          method: 'POST',
          body: formDataObj,
        });
      } else if (selectedTemplate === 'reminder' && formData.reminderAttachment) {
        payload = await handleReminderAttachment(payload);
        response = await fetch(template.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(template.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (isPreview) {
        setPreview(data);
      } else {
        setResult(data);

        // Track invoice in Firestore (client-side) for invoice-related templates
        if (data.success && (selectedTemplate === 'standalone_invoice' || selectedTemplate === 'invoice' || selectedTemplate === 'reminder')) {
          try {
            await createInvoiceRecord({
              invoiceNumber: data.invoiceNumber || payload.invoiceNumber,
              recipientEmail: formData.email,
              recipientName: formData.fullName || formData.greeting || 'Client',
              organizationName: formData.organizationName,
              amount: parseFloat(payload.totalAmount) || 0,
              currency: payload.forceCurrency || 'EUR',
              type: selectedTemplate === 'reminder' ? 'reminder' : (selectedTemplate === 'standalone_invoice' ? 'standalone' : 'regular'),
              status: 'sent',
              sentAt: new Date(),
              pdfUrl: data.pdfUrl,
              pdfGenerated: !!data.pdfUrl
            });
            console.log('✅ Invoice tracked in database');
          } catch (trackingError) {
            console.error('❌ Failed to track invoice:', trackingError);
          }
        }
      }
    } catch (error) {
      const errorResult = { error: isPreview ? 'Failed to generate preview' : 'Failed to send email' };
      if (isPreview) {
        setPreview(errorResult);
      } else {
        setResult(errorResult);
      }
    } finally {
      if (isPreview) {
        setPreviewing(false);
      } else {
        setSending(false);
      }
    }
  };

  const handlePreview = () => sendOrPreview(true);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendOrPreview(false);
  };

  const getTemplateKey = (emailTemplate: EmailTemplate): string => {
    const templateKeyMap: Record<EmailTemplate, string> = {
      'invoice': 'membership_acceptance_admin',
      'standalone_invoice': 'invoice_delivery',
      'member_portal_welcome': 'member_portal_welcome',
      'reminder': 'payment_reminder',
      'freeform': 'invoice_delivery'
    };
    return templateKeyMap[emailTemplate] || 'invoice_delivery';
  };

  const handleCustomize = async () => {
    try {
      const templateKey = getTemplateKey(selectedTemplate);
      const response = await fetch(`/api/get-email-template?templateKey=${templateKey}`);

      if (!response.ok) throw new Error('Failed to load template');

      const data = await response.json();
      if (data.success && data.template) {
        setDefaultTemplate(data.template);
        setShowEmailEditor(true);
      }
    } catch (error) {
      console.error('Error loading default template:', error);
    }
  };

  const handleApplyCustomization = (customContent: any) => {
    setCustomizedContent(customContent);
    setTimeout(() => handlePreview(), 100);
  };

  return (
    <div className="space-y-6">
      {/* Email Template Selection */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Email Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(emailTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key as EmailTemplate)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedTemplate === key
                  ? 'border-fase-navy bg-fase-navy bg-opacity-5 text-fase-navy'
                  : 'border-gray-200 hover:border-fase-light-gold text-gray-700'
              }`}
            >
              <h4 className="font-semibold text-sm mb-1">{template.title}</h4>
              <p className="text-xs opacity-75">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Email Form */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-6">
          {emailTemplates[selectedTemplate].title}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedTemplate === 'freeform' ? 'Signature Language' : 'Language'}
            </label>
            <select
              value={formData.userLocale}
              onChange={(e) => setFormData(prev => ({ ...prev, userLocale: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>

          {/* Email Recipients */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Email Recipients</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CC Email</label>
                <input
                  type="email"
                  value={formData.cc}
                  onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Send From *</label>
              <select
                value={formData.freeformSender}
                onChange={(e) => setFormData(prev => ({ ...prev, freeformSender: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              >
                <option value="admin@fasemga.com">FASE Admin &lt;admin@fasemga.com&gt;</option>
                <option value="aline.sullivan@fasemga.com">Aline Sullivan &lt;aline.sullivan@fasemga.com&gt;</option>
                <option value="william.pitt@fasemga.com">William Pitt &lt;william.pitt@fasemga.com&gt;</option>
                <option value="info@fasemga.com">FASE Info &lt;info@fasemga.com&gt;</option>
                <option value="media@fasemga.com">FASE Media &lt;media@fasemga.com&gt;</option>
              </select>
            </div>
          </div>

          {/* Contact Details - Only for non-freeform templates */}
          {selectedTemplate !== 'freeform' && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Contact Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Greeting</label>
                  <input
                    type="text"
                    value={formData.greeting}
                    onChange={(e) => setFormData(prev => ({ ...prev, greeting: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder="Mr., Ms., Dr., etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  >
                    <option value="m">Male</option>
                    <option value="f">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Organization Details - Only for non-freeform templates */}
          {selectedTemplate !== 'freeform' && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Organization Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Type</label>
                  <select
                    value={formData.organizationType}
                    onChange={(e) => setFormData(prev => ({ ...prev, organizationType: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  >
                    <option value="MGA">MGA</option>
                    <option value="carrier">Carrier</option>
                    <option value="provider">Provider</option>
                  </select>
                </div>
              </div>
              {emailTemplates[selectedTemplate].requiresPricing && (
                <div className="mt-4 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasOtherAssociations}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasOtherAssociations: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Has other association memberships (20% discount)</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.testPayment}
                      onChange={(e) => setFormData(prev => ({ ...prev, testPayment: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Test payment (50 cents instead of full amount)</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Override</label>
                    <select
                      value={formData.forceCurrency}
                      onChange={(e) => setFormData(prev => ({ ...prev, forceCurrency: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    >
                      <option value="">Auto-detect from country</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MGA Pricing Tier */}
          {(emailTemplates[selectedTemplate].requiresPricing && formData.organizationType === 'MGA') && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">MGA Pricing Tier</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gross Written Premiums</label>
                <select
                  value={prefilledData?.portfolio?.grossWrittenPremiums || '<10m'}
                  onChange={(e) => {
                    if (prefilledData?.portfolio) {
                      prefilledData.portfolio.grossWrittenPremiums = e.target.value as any;
                    }
                    setFormData(prev => ({ ...prev }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="<10m">&lt;€10M (€900)</option>
                  <option value="10-20m">€10-20M (€1,500)</option>
                  <option value="20-50m">€20-50M (€2,200)</option>
                  <option value="50-100m">€50-100M (€2,800)</option>
                  <option value="100-500m">€100-500M (€4,200)</option>
                  <option value="500m+">€500M+ (€7,000)</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Line Item */}
          {emailTemplates[selectedTemplate].requiresPricing && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Custom Line Item</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableCustomLineItem"
                    checked={formData.customLineItem.enabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customLineItem: { ...prev.customLineItem, enabled: e.target.checked }
                    }))}
                    className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
                  />
                  <label htmlFor="enableCustomLineItem" className="text-sm font-medium text-gray-700">
                    Add custom line item to invoice
                  </label>
                </div>

                {formData.customLineItem.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        value={formData.customLineItem.description}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customLineItem: { ...prev.customLineItem, description: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder="e.g., Additional Services"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount (€)</label>
                      <input
                        type="number"
                        value={formData.customLineItem.amount || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customLineItem: { ...prev.customLineItem, amount: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address - For invoice, standalone invoice, and reminder */}
          {(selectedTemplate === 'invoice' || selectedTemplate === 'standalone_invoice' || selectedTemplate === 'reminder') && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                  <input
                    type="text"
                    value={formData.address.county}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, county: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
                  <input
                    type="text"
                    value={formData.address.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, postcode: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Display */}
          {emailTemplates[selectedTemplate].requiresPricing && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold mb-2 text-fase-navy">Pricing Summary</h4>
              <div className="text-sm space-y-1">
                <div>Base Fee: €{originalAmount}</div>
                {formData.hasOtherAssociations && (
                  <div>Multi-Association Discount (20%): -€{originalAmount - baseAmount}</div>
                )}
                {formData.customLineItem.enabled && formData.customLineItem.amount > 0 && (
                  <div>{formData.customLineItem.description || 'Custom Item'}: €{formData.customLineItem.amount}</div>
                )}
                <div className="font-semibold pt-2 border-t border-gray-300">Total: €{finalAmount}</div>
              </div>
            </div>
          )}

          {/* Freeform Email Fields */}
          {selectedTemplate === 'freeform' && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Email Content</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={formData.freeformSubject}
                    onChange={(e) => setFormData(prev => ({ ...prev, freeformSubject: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                    placeholder="Enter email subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message Body *</label>
                  <textarea
                    value={formData.freeformBody}
                    onChange={(e) => setFormData(prev => ({ ...prev, freeformBody: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    rows={8}
                    required
                    placeholder="Enter your email message..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      setFormData(prev => ({ ...prev, freeformAttachments: [...prev.freeformAttachments, ...newFiles] }));
                      e.target.value = '';
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                  {formData.freeformAttachments.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-600">Selected files ({formData.freeformAttachments.length}):</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, freeformAttachments: [] }))}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-1">
                        {formData.freeformAttachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                freeformAttachments: prev.freeformAttachments.filter((_, i) => i !== index)
                              }))}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Reminder PDF Upload */}
          {selectedTemplate === 'reminder' && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">PDF Attachment</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF Invoice</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData(prev => ({ ...prev, reminderAttachment: file }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
                {formData.reminderAttachment && (
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <span>{formData.reminderAttachment.name} ({(formData.reminderAttachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, reminderAttachment: null }))}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              type="button"
              variant="secondary"
              disabled={previewing || sending}
              onClick={handlePreview}
              className="w-full"
            >
              {previewing ? 'Generating Preview...' : 'Preview Email'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={sending || previewing}
              className="w-full"
            >
              {sending ? 'Sending...' : `Send ${emailTemplates[selectedTemplate].title}`}
            </Button>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {result.error ? `Error: ${result.error}` : 'Email sent successfully!'}
            </div>
          )}
        </form>
      </div>

      {/* Email Preview */}
      {preview && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
              Email Preview: {emailTemplates[selectedTemplate].title}
            </h3>
            <Button variant="secondary" size="small" onClick={() => setPreview(null)}>
              Close Preview
            </Button>
          </div>

          {preview.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {preview.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Email Details</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">To:</span> {preview.to}</div>
                        {preview.cc && <div><span className="font-medium">CC:</span> {preview.cc}</div>}
                        <div><span className="font-medium">Subject:</span> {preview.subject}</div>
                        <div><span className="font-medium">Language:</span> {formData.userLocale.toUpperCase()}</div>
                      </div>
                    </div>

                    {preview.pdfUrl && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">PDF Attachment</h4>
                        <a
                          href={preview.pdfUrl}
                          download="invoice-preview.pdf"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download PDF
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Email Content</h4>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                      {preview.htmlContent ? (
                        <div dangerouslySetInnerHTML={{ __html: preview.htmlContent }} className="prose prose-sm max-w-none" />
                      ) : (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{preview.textContent || 'No content available'}</pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  This is a preview - no email has been sent yet.
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="small" onClick={handlePreview} disabled={previewing}>
                    {previewing ? 'Refreshing...' : 'Refresh Preview'}
                  </Button>
                  {selectedTemplate !== 'freeform' && (
                    <>
                      <Button variant="secondary" size="small" onClick={handleCustomize} disabled={sending || previewing}>
                        Customize
                      </Button>
                      {customizedContent && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 font-medium">✓ Customized</span>
                          <button
                            type="button"
                            onClick={() => { setCustomizedContent(null); setTimeout(() => handlePreview(), 100); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => sendOrPreview(false)}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Editor Modal */}
      {showEmailEditor && defaultTemplate && (
        <EmailEditorModal
          isOpen={showEmailEditor}
          onClose={() => setShowEmailEditor(false)}
          onApply={handleApplyCustomization}
          recipientData={{
            email: formData.email,
            fullName: formData.fullName,
            organizationName: formData.organizationName,
            totalAmount: finalAmount.toString()
          }}
          originalTemplate={defaultTemplate}
        />
      )}
    </div>
  );
}
