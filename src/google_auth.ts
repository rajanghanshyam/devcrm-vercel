// Firebase Authentication is completely disabled per user request.
// All Firebase imports have been removed or mocked to prevent runtime connection issues.

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  console.warn("Firebase Auth is disabled per configuration.");
  if (onAuthFailure) {
    onAuthFailure();
  }
  return () => {}; // return empty unsubscribe function
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  console.warn("Firebase Auth is disabled per configuration.");
  alert("Google Drive backup is disabled because Firebase has been disabled.");
  return null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return null;
};

export const logoutGoogle = async () => {
  console.warn("Firebase Auth is disabled per configuration.");
};

