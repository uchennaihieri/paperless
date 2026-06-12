export const ERROR_MESSAGES: Record<string, string> = {
  // ── Authentication ──
  MISSING_CREDENTIALS:   "Please enter your Employee ID and password.",
  INVALID_CREDENTIALS:   "The Employee ID or password you entered is incorrect.",
  PASSWORD_NOT_SET:      "Your account password has not been set up yet. Please contact your administrator.",
  OTP_SEND_FAILED:       "We couldn't send the verification code. Please try again.",
  MISSING_OTP_FIELDS:    "Please enter both your email and the verification code.",
  PASSWORD_TOO_SHORT:    "Your password must be at least 8 characters.",
  OTP_INVALID:           "The code you entered is incorrect or has expired. Please try again.",
  NO_ACTIVE_ACCOUNT:     "No active account was found with that Employee ID.",
  MULTIPLE_ROLES_LOCKED: "Your account has been flagged with multiple roles. Please contact your administrator.",
  AUTH_FAILED:           "We couldn't verify your identity. Please try again.",

  // ── Password Reset ──
  MISSING_RESET_FIELDS:  "Please fill in all fields: Employee ID, new password, and confirm password.",
  PASSWORD_MISMATCH:     "The passwords you entered don't match.",
  NO_EMAIL_ON_FILE:      "There's no email address on your account. Please contact your administrator.",
  ACCOUNT_LOCKED:        "Your account has been locked. Please contact your administrator.",
  RESET_RATE_LIMITED:    "Your account has been locked due to too many reset attempts. Please contact your administrator.",
  USER_NOT_FOUND:        "No user found with that identifier.",

  // ── Workflows & Submissions ──
  SUBMISSION_NOT_FOUND:  "The requested submission could not be found or you do not have access.",
  ALREADY_SIGNED:        "This document has already been signed by the required party.",
  UNASSIGNED_SUBMISSION: "This submission must be assigned to you before you can take action.",
  INVALID_SIGNATURE:     "Your signature token is invalid. Please check and try again.",
  NOT_APPROVER:          "You are not designated as an approver for this step.",
  SIGNATURE_REQUIRED:    "Your signature token is required to proceed.",
  REASON_REQUIRED:       "A reason is required to disapprove or reject a submission.",
  NOT_AWAITING_APPROVAL: "This submission is not currently awaiting final approval.",

  // ── Templates ──
  TEMPLATE_NOT_FOUND:    "The requested template could not be found.",
  TEMPLATE_EXISTS:       "A template with this name already exists. Please choose a different name.",
  MISSING_TEMPLATE_DATA: "Required template information is missing.",

  // ── Documents / Uploads ──
  UPLOAD_FAILED:         "Failed to process the uploaded document.",
  PDF_GENERATION_FAILED: "We couldn't generate the PDF. Please try again.",
  FILE_NOT_FOUND:        "The requested file could not be located.",

  // ── NextAuth internal codes (fallbacks) ──
  CredentialsSignin:     "The login details you provided are incorrect.",
  Configuration:         "There was a problem verifying your identity. Please try again.",

  // ── Generic / Fallbacks ──
  UNKNOWN_SERVER_ERROR:  "Something went wrong on our end. Please try again later.",
  NETWORK_ERROR:         "We couldn't connect to the server. Please check your internet connection.",
  NOT_AUTHENTICATED:     "Your session has expired. Please log in again.",
  NOT_AUTHORIZED:        "You do not have permission to perform this action."
};

export function getErrorMessage(codeOrMessage: string): string {
  // If it's a known code, return friendly message. Otherwise, return the raw message as fallback.
  return ERROR_MESSAGES[codeOrMessage] || codeOrMessage;
}
