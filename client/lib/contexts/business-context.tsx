"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getUserBusinesses, type UserBusiness } from "@/lib/actions/business-context-actions";

interface BusinessContextType {
  selectedBusinessId: string | null;
  setSelectedBusinessId: (businessId: string) => void;
  isAccountant: boolean;
  availableBusinesses: UserBusiness[];
  setAvailableBusinesses: (businesses: UserBusiness[]) => void;
  isLoading: boolean;
  selectedBusiness: UserBusiness | null;
  permissions: {
    canViewFinancials: boolean;
    canManageFinancials: boolean;
    canViewDocuments: boolean;
    canManageDocuments: boolean;
    canManageSettings: boolean;
  };
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const { data: session, status } = useSession();
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<UserBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAccountant = session?.user?.role === "ACCOUNTANT";
  
  // Get the currently selected business
  const selectedBusiness = availableBusinesses.find(b => b.id === selectedBusinessId) || null;
  
  // Get permissions for the selected business
  const permissions = selectedBusiness?.permissions || {
    canViewFinancials: false,
    canManageFinancials: false,
    canViewDocuments: false,
    canManageDocuments: false,
    canManageSettings: false,
  };

  // Fetch available businesses and handle initial setup
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

  // Save selected business to localStorage
  const setSelectedBusinessId = (businessId: string) => {
    setSelectedBusinessIdState(businessId);
    if (isAccountant) {
      try {
        localStorage.setItem("selectedBusinessId", businessId);
      } catch (error) {
        // localStorage might not be available (SSR, private browsing, etc.)
        console.warn("Could not save to localStorage:", error);
      }
    }
  };

  const value: BusinessContextType = {
    selectedBusinessId,
    setSelectedBusinessId,
    isAccountant,
    availableBusinesses,
    setAvailableBusinesses,
    isLoading,
    selectedBusiness,
    permissions,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusinessContext must be used within a BusinessProvider");
  }
  return context;
}