import { StepComponentProps } from '../../../lib/registration/types';

export default function CodeOfConductStep({ state, actions }: StepComponentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">FASE Code of Conduct</h3>
        <p className="text-fase-black text-sm">Please review and consent to our Code of Conduct</p>
      </div>

      <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm">
        <div className="text-base text-fase-black">
          <div className="prose prose-base max-w-none">
            <h4 className="font-semibold text-fase-navy text-lg mb-4">FASE Code of Conduct</h4>
            
            <p className="mb-4">
              FASE supports the highest professional and ethical standards, as described in this Code of Conduct, and requires that all members commit annually to upholding these standards as a condition of their membership.
            </p>
            
            <p className="mb-4">
              Members hereby undertake to act in a legal, fair and ethical manner in all their dealings with all parties.
            </p>
            
            <p className="mb-4">
              Members undertake to cooperate fully and at all times with FASE in its enforcement of this Code.
            </p>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">1. Legal responsibilities</h5>
            <p className="mb-3">
              Members will comply with all applicable laws and regulations in the locations in which they do business. Should this legal responsibility conflict with another duty described in this Code, this legal responsibility will take priority.
            </p>
            <p className="mb-3">
              Members will bring to the attention of the FASE Business Conduct Committee any circumstances of which they become aware involving:
            </p>
            <ul className="list-disc list-inside ml-4 mb-3">
              <li>A member being in breach of any regulatory requirement and</li>
              <li>Any circumstance that may reasonably lead to sanctions against the member or a member of their staff or directors by the relevant regulatory authorities</li>
            </ul>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">2. Financial Responsibilities</h5>
            <p className="mb-3">
              Members should always meet their financial obligations on time. This includes, but it not limited to, payment of debts, premium due to insurers, returns due to brokers and insureds, sums due to employees.
            </p>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">3. Inter-organisational Responsibilities</h5>
            <p className="mb-3">
              Members will compete fairly and honourably in the markets in which they operate.
            </p>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">4. Community Responsibilities</h5>
            <p className="mb-3">
              FASE members must conduct themselves in a manner befitting the privileges of membership.
            </p>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">5. Relationships with Insurers</h5>
            <p className="mb-3">
              Members will deal fairly and honestly when acting on behalf of insurers. In particular they should:
            </p>
            <ul className="list-disc list-inside ml-4 mb-3">
              <li>faithfully execute the underwriting guidelines of the insurers they represent;</li>
              <li>act in the utmost good faith and gather all data necessary to make a proper underwriting decision before putting an insurer on risk;</li>
              <li>keep themselves up to date on the laws and regulations in all areas in which they have authority, and advise insurers accordingly of the impact of such laws and regulations as they affect their relationship.</li>
            </ul>
            
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">6. Relationships with Brokers and Agents</h5>
            <p className="mb-3">
              Members should deal fairly and honestly with brokers, agents or insureds (if operating directly), and in so doing will:
            </p>
            <ul className="list-disc list-inside ml-4 mb-3">
              <li>consider at all times the financial stability of insurers with which the Member places business;</li>
              <li>make no false or misleading representation of what coverage is being provided, or the limitations or exclusions to coverage or impose limitations or exclusions such that the policy provides no effective benefit to the insured.</li>
            </ul>
            
            <p className="mt-6 text-sm text-fase-black">
              All notices of potential breach made under this Code should be made to: Chairman of the Business Conduct Committee, FASE, Herengracht, 124-128, 1015 BT Amsterdam, Netherlands.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-fase-light-gold rounded-lg p-4">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={state.codeOfConductConsent}
            onChange={(e) => actions.updateField('codeOfConductConsent', e.target.checked)}
            className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
          />
          <span className="text-base text-fase-black">
            I have read and understand the FASE Code of Conduct above, and I agree to uphold these professional and ethical standards as a condition of my membership. *
          </span>
        </label>
      </div>
    </div>
  );
}