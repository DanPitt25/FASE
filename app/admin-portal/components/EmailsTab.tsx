'use client';

import { useState } from 'react';
import Button from '../../../components/Button';

interface EmailsTabProps {
  prefilledData?: any;
}

type EmailTemplate = 'invoice' | 'member_portal_welcome' | 'reminder' | 'freeform';

export default function EmailsTab({ prefilledData = null }: EmailsTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('invoice');
  const [formData, setFormData] = useState({
    email: prefilledData?.email || '',
    cc: '',
    fullName: prefilledData?.personalName || '',
    greeting: '',
    gender: 'm',
    organizationName: prefilledData?.organizationName || '',
    membershipType: prefilledData?.membershipType || 'corporate',
    organizationType: prefilledData?.organizationType || 'MGA',
    hasOtherAssociations: prefilledData?.hasOtherAssociations || false,
    userLocale: 'en',
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
    freeformSender: 'admin@fasemga.com'
  });

  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Calculate pricing automatically
  const calculateOriginalAmount = () => {
    if (formData.membershipType === 'individual') {
      return 500;
    } else if (formData.organizationType === 'MGA') {
      // Use prefilledData GWP if available, otherwise default to lowest tier
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
  const finalAmount = formData.hasOtherAssociations ? Math.round(originalAmount * 0.8) : originalAmount;

  const emailTemplates = {
    invoice: {
      title: 'Send Invoice Email',
      description: 'Send membership invoice with payment details',
      apiEndpoint: '/api/test-membership-email',
      previewEndpoint: '/api/test-membership-email',
      requiresPricing: true,
      generatesPDF: true,
      available: true
    },
    member_portal_welcome: {
      title: 'Member Portal Welcome',
      description: 'Welcome email with portal access for new members',
      apiEndpoint: '/api/send-member-portal-welcome',
      previewEndpoint: '/api/send-member-portal-welcome',
      requiresPricing: false,
      generatesPDF: false,
      available: true
    },
    reminder: {
      title: 'Payment Reminder',
      description: 'Remind about pending payment',
      apiEndpoint: '/api/test-membership-email',
      previewEndpoint: '/api/test-membership-email',
      requiresPricing: true,
      generatesPDF: true,
      available: false // API endpoint needs to be created
    },
    freeform: {
      title: 'Freeform Email',
      description: 'Send custom email with attachments',
      apiEndpoint: '/api/send-freeform-email',
      previewEndpoint: '/api/send-freeform-email',
      requiresPricing: false,
      generatesPDF: false,
      available: true
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);

    try {
      const template = emailTemplates[selectedTemplate];
      const payload: any = {
        template: selectedTemplate,
        preview: true,
        ...formData
      };

      // Add pricing data for templates that need it
      if (template.requiresPricing) {
        payload.totalAmount = finalAmount;
        payload.exactTotalAmount = finalAmount;
        payload.originalAmount = originalAmount.toString();
        payload.discountAmount = formData.hasOtherAssociations ? (originalAmount - finalAmount).toString() : '0';
        payload.discountReason = formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '';
        payload.grossWrittenPremiums = prefilledData?.portfolio?.grossWrittenPremiums || '<10m';
      }

      let response;
      if (selectedTemplate === 'freeform') {
        const formDataObj = new FormData();
        Object.keys(payload).forEach(key => {
          if (key !== 'freeformAttachments') {
            formDataObj.append(key, payload[key]);
          }
        });
        // Don't add files for preview
        response = await fetch(template.previewEndpoint, {
          method: 'POST',
          body: formDataObj,
        });
      } else {
        response = await fetch(template.previewEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      setPreview(data);
    } catch (error) {
      setPreview({ error: 'Failed to generate preview' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const template = emailTemplates[selectedTemplate];
      const payload: any = {
        template: selectedTemplate,
        ...formData
      };

      // Add pricing data for templates that need it
      if (template.requiresPricing) {
        payload.totalAmount = finalAmount;
        payload.exactTotalAmount = finalAmount;
        payload.originalAmount = originalAmount.toString();
        payload.discountAmount = formData.hasOtherAssociations ? (originalAmount - finalAmount).toString() : '0';
        payload.discountReason = formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '';
        payload.grossWrittenPremiums = prefilledData?.portfolio?.grossWrittenPremiums || '<10m';
      }

      let response;
      if (selectedTemplate === 'freeform') {
        const formDataObj = new FormData();
        Object.keys(payload).forEach(key => {
          if (key !== 'freeformAttachments') {
            formDataObj.append(key, payload[key]);
          }
        });
        // Add files for actual sending
        formData.freeformAttachments.forEach((file, index) => {
          formDataObj.append(`attachments`, file);
        });
        response = await fetch(template.apiEndpoint, {
          method: 'POST',
          body: formDataObj,
        });
      } else {
        response = await fetch(template.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Template Selection */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Email Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(emailTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key as EmailTemplate)}
              disabled={!template.available}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedTemplate === key
                  ? 'border-fase-navy bg-fase-navy bg-opacity-5 text-fase-navy'
                  : template.available
                    ? 'border-gray-200 hover:border-fase-light-gold text-gray-700'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm">{template.title}</h4>
                {!template.available && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
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
            {/* Sender Selection - Only for freeform template */}
            {selectedTemplate === 'freeform' && (
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
            )}
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
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasOtherAssociations}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasOtherAssociations: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Has other association memberships (20% discount)</span>
                </label>
              </div>
            )}
          </div>
          )}

          {/* MGA Pricing Tier - Only for MGA organization type and pricing templates */}
          {(emailTemplates[selectedTemplate].requiresPricing && formData.organizationType === 'MGA') && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">MGA Pricing Tier</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gross Written Premiums</label>
                <select
                  value={prefilledData?.portfolio?.grossWrittenPremiums || '<10m'}
                  onChange={(e) => {
                    // Update the prefilledData reference for pricing calculation
                    if (prefilledData?.portfolio) {
                      prefilledData.portfolio.grossWrittenPremiums = e.target.value as any;
                    }
                    // Force re-render to update pricing
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

          {/* Address - Only for invoice and reminder emails */}
          {(selectedTemplate === 'invoice' || selectedTemplate === 'reminder') && (
            <div>
              <h4 className="text-md font-semibold mb-4 text-fase-navy">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, line1: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, line2: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                  <input
                    type="text"
                    value={formData.address.county}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, county: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
                  <input
                    type="text"
                    value={formData.address.postcode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, postcode: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, country: e.target.value } 
                    }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Display - Only for invoice and reminder emails */}
          {emailTemplates[selectedTemplate].requiresPricing && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold mb-2 text-fase-navy">Pricing Summary</h4>
              <div className="text-sm space-y-1">
                <div>Base Fee: €{originalAmount}</div>
                {formData.hasOtherAssociations && (
                  <div>Discount (20%): -€{originalAmount - finalAmount}</div>
                )}
                <div className="font-semibold">Total: €{finalAmount}</div>
              </div>
            </div>
          )}

          {/* Freeform Email Fields - Only for freeform template */}
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
                      setFormData(prev => ({ 
                        ...prev, 
                        freeformAttachments: [...prev.freeformAttachments, ...newFiles]
                      }));
                      // Clear the input so the same file can be selected again if needed
                      e.target.value = '';
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.csv,.zip"
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
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  freeformAttachments: prev.freeformAttachments.filter((_, i) => i !== index)
                                }));
                              }}
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
            <div className={`p-4 rounded-lg ${
              result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}>
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
            <Button
              variant="secondary"
              size="small"
              onClick={() => setPreview(null)}
            >
              Close Preview
            </Button>
          </div>

          {preview.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {preview.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Email Content Preview */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Email Details */}
                  <div className="lg:col-span-1 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Email Details</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">To:</span> {preview.to}</div>
                        {preview.cc && <div><span className="font-medium">CC:</span> {preview.cc}</div>}
                        <div><span className="font-medium">Subject:</span> {preview.subject}</div>
                        <div><span className="font-medium">Language:</span> {formData.userLocale.toUpperCase()}</div>
                        {emailTemplates[selectedTemplate].generatesPDF && (
                          <div><span className="font-medium">Attachments:</span> Invoice PDF</div>
                        )}
                      </div>
                    </div>

                    {/* PDF Preview Link */}
                    {preview.pdfUrl && emailTemplates[selectedTemplate].generatesPDF && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">PDF Invoice</h4>
                        <a
                          href={preview.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download PDF Preview
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Email HTML Content */}
                  <div className="lg:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Email Content</h4>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                      {preview.htmlContent ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: preview.htmlContent }}
                          className="prose prose-sm max-w-none"
                        />
                      ) : (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {preview.textContent || 'No content available'}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  This is a preview - no email has been sent yet.
                  {emailTemplates[selectedTemplate].generatesPDF && (
                    <span className="block mt-1">PDF invoice will be generated and attached when sent.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handlePreview}
                    disabled={previewing}
                  >
                    {previewing ? 'Refreshing...' : 'Refresh Preview'}
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true }) as any;
                        handleSubmit(syntheticEvent);
                      }
                    }}
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
    </div>
  );
}