// Plaid API related types used in our application

// Plaid Account type
export interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
    limit: number | null;
    unofficial_currency_code: string | null;
  };
  mask: string | null;
  name: string;
  official_name: string | null;
  subtype: string | null;
  type: string;
}

// Plaid Transaction type
export interface PlaidTransaction {
  account_id: string;
  amount: number;
  date: string;
  category: string[] | null;
  category_id: string | null;
  location: {
    address: string | null;
    city: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
    postal_code: string | null;
    region: string | null;
    store_number: string | null;
  };
  name: string;
  merchant_name: string | null;
  original_description: string | null;
  payment_channel: string;
  pending: boolean;
  pending_transaction_id: string | null;
  transaction_id: string;
}

// Plaid Error response
export interface PlaidErrorResponse {
  error_code: string;
  error_message: string;
  error_type: string;
  display_message: string | null;
  request_id: string;
  causes: unknown[];
  status?: number;
  statusText?: string;
  data?: {
    error_code: string;
    error_message: string;
    error_type: string;
    display_message: string | null;
  };
}
