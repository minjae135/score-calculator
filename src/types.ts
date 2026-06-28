// Represents a single evaluation item (exam, assignment, etc.)
export interface EvaluationItem {
  id: string;
  name: string;
  weight: number;
  max: number;
  score: number | null;
}

// Possible visual states for the result card
export type ResultState =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'easter';

// Icon identifiers used in the result card
export type ResultIconName =
  | 'help-circle'
  | 'check-circle-2'
  | 'alert-circle'
  | 'alert-triangle'
  | 'sparkles';

export type MessagePart =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'break' };

// Output of the grade calculation logic
export interface CalculationResult {
  state: ResultState;
  title: string;
  message: MessagePart[];
  iconName: ResultIconName;
  securedScore: number;
  requiredContrib: number;
  maxPossibleScore: number;
  barSecuredPct: number;
  barRequiredPct: number;
  barRemainingPct: number;
  barSecuredTooltip: string;
  barRequiredTooltip: string;
  barRemainingTooltip: string;
}
