import { StepComponentProps } from '../../../lib/registration/types';

export default function DataNoticeStep({ state, actions }: StepComponentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Data Notice</h3>
        <p className="text-fase-black text-sm">Please review and consent to our data usage policy</p>
      </div>

      <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm">
        <div className="space-y-4 text-base text-fase-black">
          <h4 className="font-semibold text-fase-navy text-lg">Data Protection Notice</h4>
          
          <div className="space-y-3">
            <p className="mb-3">
              <strong>Data Controller:</strong> Federation of European MGAs (FASE), Herengracht 124-128, 1015 BT Amsterdam, Netherlands. Contact: info@fasemga.com
            </p>
            
            <p className="mb-3">
              FASE collects the personal and business information you provide to manage your membership and operate as an association for Managing General Agents and related insurance professionals.
            </p>
            
            <p className="mb-2">
              <strong>Legal Basis and Purpose:</strong> We process your data based on:
            </p>
            <ul className="list-disc list-inside ml-4 mb-3">
              <li><strong>Contractual necessity:</strong> to process your membership application, provide member services, and fulfill our membership agreement</li>
              <li><strong>Legitimate interests:</strong> to facilitate professional networking, maintain member directories, and promote the insurance industry</li>
              <li><strong>Legal obligations:</strong> to meet regulatory and professional association requirements</li>
              <li><strong>Your consent:</strong> for marketing communications and sharing your details for networking (where you have agreed)</li>
            </ul>
            
            <p className="mb-3">
              <strong>Data Sharing and Confidentiality:</strong> FASE may share basic business contact information with other members for legitimate organisational and networking purposes. However, FASE will not sell, transfer, or otherwise divulge organisationally identifiable information to third parties outside the membership without explicit consent. Commercially sensitive information, including financial data, business strategies, and proprietary information, will be held in strict confidence.
            </p>
            
            <p className="mb-3">
              <strong>International Transfers:</strong> Your data may be transferred to other FASE members across Europe. We ensure appropriate safeguards are in place for any transfers outside the EU/EEA.
            </p>
            
            <p className="mb-3">
              <strong>Retention Period:</strong> We retain your data for the duration of your membership plus 7 years for regulatory compliance, unless you request earlier deletion or we have another legal basis to retain it.
            </p>
            
            <p className="mb-3">
              <strong>Your Rights:</strong> Under GDPR and UK data protection law, you have the right to:
            </p>
            <ul className="list-disc list-inside ml-4 mb-3">
              <li>access your personal data and receive a copy</li>
              <li>rectify inaccurate or incomplete data</li>
              <li>erase your data (where legally permissible)</li>
              <li>restrict or object to processing</li>
              <li>data portability</li>
              <li>withdraw consent (where processing is based on consent)</li>
              <li>lodge a complaint with your local data protection authority</li>
            </ul>
            
            <p className="mb-3">
              <strong>Contact:</strong> To exercise your rights or for data protection queries, contact us at info@fasemga.com or write to FASE Data Protection, Herengracht 124-128, 1015 BT Amsterdam, Netherlands.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-fase-light-gold rounded-lg p-4">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={state.dataNoticeConsent}
            onChange={(e) => actions.updateField('dataNoticeConsent', e.target.checked)}
            className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
          />
          <span className="text-base text-fase-black">
            I have read and understand the data notice above, and I consent to FASE collecting, using, and storing my personal and business information as described. *
          </span>
        </label>
      </div>
    </div>
  );
}