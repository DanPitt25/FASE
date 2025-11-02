import { StepComponentProps } from '../../../lib/registration/types';

interface GWPInputFormProps {
  state: StepComponentProps['state'];
  actions: StepComponentProps['actions'];
}

export default function GWPInputForm({ state, actions }: GWPInputFormProps) {
  const { gwpInputs, gwpCurrency } = state;

  const updateGWPInput = (field: keyof typeof gwpInputs, value: string) => {
    const newInputs = { ...gwpInputs, [field]: value };
    actions.updateField('gwpInputs', newInputs);
    actions.markFieldTouched('grossWrittenPremiums');
  };

  const calculateDisplayTotal = () => {
    const billions = parseFloat(gwpInputs.billions) || 0;
    const millions = parseFloat(gwpInputs.millions) || 0;
    const thousands = parseFloat(gwpInputs.thousands) || 0;
    const ones = parseFloat(gwpInputs.hundreds) || 0; // Renamed for clarity
    const total = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000) + ones;
    return total;
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Portfolio Information</h4>
      
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          Annual Gross Written Premiums *
        </label>
        <div className="space-y-3">
          {/* Currency Selection */}
          <div>
            <label className="block text-xs text-fase-black mb-1">Currency</label>
            <select
              value={gwpCurrency}
              onChange={(e) => actions.updateField('gwpCurrency', e.target.value)}
              className="w-32 px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          
          {/* Amount Builder - Separate inputs for each magnitude */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-fase-black mb-1">Billions</label>
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                value={gwpInputs.billions}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 99)) {
                    updateGWPInput('billions', value);
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-fase-black mb-1">Millions</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={gwpInputs.millions}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                    updateGWPInput('millions', value);
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-fase-black mb-1">Thousands</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={gwpInputs.thousands}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                    updateGWPInput('thousands', value);
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-fase-black mb-1">Ones</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={gwpInputs.hundreds}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                    updateGWPInput('hundreds', value);
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Display Total */}
          <div className="bg-fase-cream/20 p-3 rounded-lg">
            <div className="text-sm text-fase-navy font-medium">
              Total: {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{calculateDisplayTotal().toLocaleString('en-US')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}