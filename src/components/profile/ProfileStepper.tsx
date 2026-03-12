import { StepCheckIcon } from "@/components/icons";

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
    <aside className="w-52 shrink-0 pt-2">
      <div className="flex flex-col">
        {steps.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isDone = step.number < currentStep;

          return (
            <div key={step.number} className="flex flex-col">
              {/* Step row */}
              <div className="flex items-center gap-3">
                {/* Circle */}
                {isDone ? (
                  /* Completed: outlined primary circle with checkmark */
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-primary-600 text-primary-600">
                    <StepCheckIcon />
                  </div>
                ) : isActive ? (
                  /* Active: filled blue circle with number */
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary-600 text-white text-sm font-semibold">
                    {step.number}
                  </div>
                ) : (
                  /* Pending: outlined gray circle with number */
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-gray-300 text-gray-400 bg-white text-sm font-semibold">
                    {step.number}
                  </div>
                )}

                {/* Label */}
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-gray-900 font-semibold"
                      : isDone
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
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
