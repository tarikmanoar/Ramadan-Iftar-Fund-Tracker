export const APP_NAME = "Ramadan Iftar Fund";

// In a real app, this would be your actual Google Client ID
// Since we are in a demo environment, we will simulate auth if this is not set
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ""; 

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Logistics',
  'Marketing',
  'Other'
];

export const MOCK_USER = {
  id: "mock-user-123",
  name: "Brother Ahmed",
  email: "ahmed@example.com",
  picture: "https://ui-avatars.com/api/?name=Brother+Ahmed&background=047857&color=fff"
};