interface Step {
  number: number;
  label: string;
}

const steps: Step[] = [
  { number: 1, label: "Upload Resume" },
  { number: 2, label: "Basic Details" },
  { number: 3, label: "Skills and Projects" },
];

interface ProfileStepperProps {
  currentStep?: number;
}

export function ProfileStepper({ currentStep = 1 }: ProfileStepperProps) {
  return (
    <aside className="w-full lg:w-52 shrink-0 pt-2">
      <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:hidden">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isDone = step.number < currentStep;

          return (
            <div key={step.number} className="flex items-center gap-2 whitespace-nowrap">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                  isActive || isDone
                    ? "bg-primary-600 text-white"
                    : "border-2 border-gray-300 text-gray-400 bg-white"
                }`}
              >
                {step.number}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isActive || isDone ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:flex lg:flex-col">
        {steps.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isDone = step.number < currentStep;

          return (
            <div key={step.number} className="flex flex-col">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                    isActive || isDone
                      ? "bg-primary-600 text-white"
                      : "border-2 border-gray-300 text-gray-400 bg-white"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive || isDone ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex items-start ml-4 py-1">
                  <div className="w-px h-8 border-l-2 border-dashed border-gray-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
