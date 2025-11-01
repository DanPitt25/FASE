interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  'Data Notice',
  'Code of Conduct', 
  'Account Creation',
  'Membership Info',
  'Additional Details',
  'Payment'
];

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-fase-navy">
          Step {currentStep + 1} of {totalSteps}
        </div>
        <div className="text-sm text-fase-black">
          {stepLabels[currentStep] || 'Registration'}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-fase-navy h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        ></div>
      </div>
      
      {/* Step Dots */}
      <div className="flex justify-between mt-3">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              index <= currentStep
                ? 'bg-fase-navy'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}