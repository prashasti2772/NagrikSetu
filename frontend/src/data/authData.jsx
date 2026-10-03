// Temporary frontend authentication data.
// This file will later be replaced by backend API authentication.

export const demoCitizenCredentials = {
  mobile: "1234567890",
  otp: "1234",
};

export const demoCitizen = {
  id: "CIT-2025-001",
  name: "Demo Citizen",
  mobile: "1234567890",
  role: "citizen",
  ward: "Ward 11",
};

export const signUpDefaults = {
  role: "citizen",
  name: "",
  email: "",
  mobile: "",
  ward: "",
  password: "",
  confirmPassword: "",
};

export const authData = {
  citizen: {
    mobile: "1234567890",
    otp: "1234",
  },

  authority: {
    mobile: "9876543210",
    otp: "9876",
  },
};

export const demoUsers = {
  citizen: {
    id: "CIT-1001",
    name: "Demo Citizen",
    mobile: "1234567890",
    role: "citizen",
  },
  authority: {
    id: "AUTH-1001",
    name: "Demo Authority",
    mobile: "9876543210",
    role: "authority",
  },
};

export const signupWards = ["Ward 11", "Ward 12", "Ward 13", "Ward 14"];

export const signupVerificationBadge = "Ward 11 Verified Resident";