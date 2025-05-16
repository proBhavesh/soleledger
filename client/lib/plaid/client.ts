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

// Additional products that are used but don't need to be included in initial Link token
export const PLAID_ADDITIONAL_PRODUCTS = {
  ENRICH: true, // For enhanced transaction data
  TRANSACTIONS_REFRESH: true, // For on-demand transaction refreshes
  RECURRING_TRANSACTIONS: true, // For detecting recurring payments
};

// Country codes for which Plaid will be enabled - now including Canada
export const PLAID_COUNTRY_CODES = [
  CountryCode.Us,
  CountryCode.Ca, // Adding Canada
] as const;

// Get redirect URI from environment variables
export const PLAID_REDIRECT_URI =
  process.env.PLAID_REDIRECT_URI ||
  "http://localhost:3000/api/plaid/oauth-return";

// Transaction sync options
// Note: Type these carefully to match what API expects
// Some options may need to be passed differently or may not be in the Types yet
export const TRANSACTION_SYNC_OPTIONS = {
  include_personal_finance_category: true, // Enable enhanced categorization from ENRICH
  include_original_description: true, // Get original transaction descriptions
  // include_logo_and_merchant_information is commented out as it's not in the TypeScript types
  // We pass it directly in the syncing code with a type assertion when needed
};

// Max number of days for transaction history
export const TRANSACTION_HISTORY_DAYS = 90; // Fetch up to 90 days of transactions
