/**
 * Business context provider for client-side multi-tenant functionality.
 * 
 * This context manages the currently selected business, available businesses,
 * and associated permissions for the current user. It provides a React context
 * that can be consumed by components throughout the application.
 */

"use client";

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useCallback,
  useMemo 
} from "react";
import { useSession } from "next-auth/react";
import { 
  getUserBusinesses, 
  setSelectedBusinessId as setServerBusinessId 
} from "@/lib/actions/business-context-actions";
import type { UserBusiness, BusinessPermissions } from "@/lib/types/business-context";

/**
 * Business context value interface
 */
interface BusinessContextType {
  /** Currently selected business ID */
  selectedBusinessId: string | null;
  /** Function to change the selected business */
  setSelectedBusinessId: (businessId: string) => Promise<void>;
  /** Whether the current user is an accountant */
  isAccountant: boolean;
  /** List of businesses the user has access to */
  availableBusinesses: UserBusiness[];
  /** Function to refresh the list of available businesses */
  setAvailableBusinesses: (businesses: UserBusiness[]) => void;
  /** Loading state for business data */
  isLoading: boolean;
  /** Currently selected business object */
  selectedBusiness: UserBusiness | null;
  /** Permissions for the selected business */
  permissions: BusinessPermissions;
  /** Refresh the business list from the server */
  refreshBusinesses: () => Promise<void>;
}

/**
 * Default permissions (all false) for when no business is selected
 */
const DEFAULT_PERMISSIONS: BusinessPermissions = {
  canViewFinancials: false,
  canManageFinancials: false,
  canViewDocuments: false,
  canManageDocuments: false,
  canManageSettings: false,
};

/**
 * Business context instance
 */
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

/**
 * Props for the BusinessProvider component
 */
interface BusinessProviderProps {
  children: ReactNode;
}

/**
 * Business context provider component.
 * 
 * This component wraps the application and provides business context
 * to all child components. It handles:
 * - Loading available businesses on mount
 * - Persisting business selection to localStorage and server
 * - Managing permissions based on the selected business
 * - Automatic business selection for business owners
 * 
 * @param props - Component props
 */
export function BusinessProvider({ children }: BusinessProviderProps) {
  const { data: session, status } = useSession();
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<UserBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAccountant = session?.user?.role === "ACCOUNTANT";
  
  // Get the currently selected business
  const selectedBusiness = useMemo(
    () => availableBusinesses.find(b => b.id === selectedBusinessId) || null,
    [availableBusinesses, selectedBusinessId]
  );
  
  // Get permissions for the selected business
  const permissions = useMemo(
    () => selectedBusiness?.permissions || DEFAULT_PERMISSIONS,
    [selectedBusiness]
  );

  /**
   * Refresh the list of available businesses from the server
   */
  const refreshBusinesses = useCallback(async () => {
    try {
      const result = await getUserBusinesses();
      if (result.success && result.businesses) {
        setAvailableBusinesses(result.businesses);
        return;
      }
    } catch (error) {
      console.error("Failed to refresh businesses:", error);
    }
  }, []);

  // Initialize business context on mount and when auth status changes
  useEffect(() => {
    if (status === "loading") return;
    
    const initializeBusinessContext = async () => {
      try {
        const result = await getUserBusinesses();
        if (result.success && result.businesses) {
          setAvailableBusinesses(result.businesses);
          
          if (isAccountant) {
            // For accountants, try to load from localStorage first
            try {
              const stored = localStorage.getItem("selectedBusinessId");
              if (stored && result.businesses.find(b => b.id === stored)) {
                setSelectedBusinessIdState(stored);
              }
            } catch (error) {
              // localStorage might not be available (SSR, private browsing, etc.)
              console.warn("Could not access localStorage:", error);
            }
            // Don't auto-select for accountants with multiple businesses
          } else {
            // For business owners, auto-select their business
            const ownedBusiness = result.businesses.find(b => b.role === "BUSINESS_OWNER");
            if (ownedBusiness) {
              setSelectedBusinessIdState(ownedBusiness.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load businesses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBusinessContext();
  }, [isAccountant, status]);

  /**
   * Set the selected business ID and persist to storage
   */
  const setSelectedBusinessId = useCallback(async (businessId: string) => {
    // Validate the business ID exists in available businesses
    const business = availableBusinesses.find(b => b.id === businessId);
    if (!business) {
      console.error(`Business ${businessId} not found in available businesses`);
      return;
    }

    setSelectedBusinessIdState(businessId);
    
    if (isAccountant) {
      try {
        // Persist to localStorage for client-side persistence
        localStorage.setItem("selectedBusinessId", businessId);
        // Also sync to server for server-side rendered pages
        await setServerBusinessId(businessId);
      } catch (error) {
        // localStorage might not be available (SSR, private browsing, etc.)
        console.warn("Could not save business selection:", error);
      }
    }
  }, [availableBusinesses, isAccountant]);

  const value: BusinessContextType = useMemo(
    () => ({
      selectedBusinessId,
      setSelectedBusinessId,
      isAccountant,
      availableBusinesses,
      setAvailableBusinesses,
      isLoading,
      selectedBusiness,
      permissions,
      refreshBusinesses,
    }),
    [
      selectedBusinessId,
      setSelectedBusinessId,
      isAccountant,
      availableBusinesses,
      isLoading,
      selectedBusiness,
      permissions,
      refreshBusinesses,
    ]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

/**
 * Hook to access the business context.
 * 
 * This hook provides access to the current business context including:
 * - Selected business and available businesses
 * - Permission information
 * - Functions to manage business selection
 * 
 * @throws Error if used outside of BusinessProvider
 * @returns The business context value
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedBusiness, permissions } = useBusinessContext();
 *   
 *   if (!permissions.canManageFinancials) {
 *     return <div>You don't have permission to manage finances</div>;
 *   }
 *   
 *   return <div>Business: {selectedBusiness?.name}</div>;
 * }
 * ```
 */
export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusinessContext must be used within a BusinessProvider");
  }
  return context;
}