export const APP_NAME = "Ramadan Iftar Fund";

// Google OAuth Client ID from environment variables or .dev.vars
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "863590541870-453so31bng4g8tr228jfa6a2svk09b3p.apps.googleusercontent.com";

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Logistics',
  'Marketing',
  'Other'
];