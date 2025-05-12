import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

// Determine the Plaid environment from environment variables
const plaidEnv =
  (process.env.PLAID_ENVIRONMENT as keyof typeof PlaidEnvironments) ||
  "sandbox";
const plaidClientId = process.env.PLAID_CLIENT_ID;
const plaidSecret = process.env.PLAID_SECRET;

// Log the Plaid configuration for debugging (exclude secrets)
console.log("Initializing Plaid Client with:", {
  environment: plaidEnv,
  clientIdExists: !!plaidClientId,
  secretExists: !!plaidSecret,
  basePath: PlaidEnvironments[plaidEnv],
});

// Check for missing credentials
if (!plaidClientId || !plaidSecret) {
  console.error(
    "ERROR: Missing Plaid credentials. Check your .env file for PLAID_CLIENT_ID and PLAID_SECRET."
  );
}

// Initialize Plaid client with environment variables
const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": plaidClientId || "",
      "PLAID-SECRET": plaidSecret || "",
    },
    // Add extended timeout configuration
    timeout: 60000, // 60 seconds timeout
    maxContentLength: Infinity, // Allow larger response sizes
    maxBodyLength: Infinity, // Allow larger request bodies
    timeoutErrorMessage: "Request to Plaid API timed out after 60 seconds",
  },
});

export const plaidClient = new PlaidApi(configuration);

export type PlaidLinkTokenCreateRequest = {
  userId: string;
  businessId: string;
};

export type PlaidLinkTokenResponse = {
  linkToken: string;
  expiration: string;
};

export type PlaidExchangePublicTokenRequest = {
  publicToken: string;
  userId: string;
  businessId: string;
  metadata: {
    institution?: {
      name: string;
      id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
  };
};

// Products that the Plaid integration will request access to
export const PLAID_PRODUCTS = [
  Products.Transactions,
  Products.Auth,
  // Products.Balance, // Removing as it's not supported as an initial product
] as const;

// Country codes for which Plaid will be enabled - now including Canada
export const PLAID_COUNTRY_CODES = [
  CountryCode.Us,
  CountryCode.Ca, // Adding Canada
] as const;

// Get redirect URI from environment variables
export const PLAID_REDIRECT_URI =
  process.env.PLAID_REDIRECT_URI ||
  "http://localhost:3000/api/plaid/oauth-return";
