"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createClientInvitation } from "@/lib/actions/client-management-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CreateClientInvitationData } from "@/lib/types/invitation";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormData = CreateClientInvitationData;

export function AddClientDialog({ open, onOpenChange, onSuccess }: AddClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    email: "",
    businessName: "",
    accessLevel: "FULL_MANAGEMENT", // MVP: Only full management
    sendNotification: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        clientName: "",
        email: "",
        businessName: "",
        accessLevel: "FULL_MANAGEMENT",
        sendNotification: true,
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Valid email is required";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await createClientInvitation(formData);
      
      if (result.success) {
        toast.success("Invitation sent successfully!");
        onSuccess?.();
        onOpenChange(false);
      } else {
        // Check for specific error types
        if (result.error?.includes("already invited")) {
          toast.error("This client has already been invited to your business");
        } else if (result.error?.includes("existing member")) {
          toast.error("This client is already a member of your business");
        } else {
          toast.error(result.error || "Failed to send invitation");
        }
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Client</DialogTitle>
          <DialogDescription>
            Send an invitation to your client to join SoleLedger. They&apos;ll be able to
            create an account and you&apos;ll manage their bookkeeping.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="John Doe"
              value={formData.clientName}
              onChange={(e) => handleInputChange("clientName", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.clientName && (
              <p className="text-sm text-destructive">{errors.clientName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Client Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              placeholder="Acme Inc."
              value={formData.businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The business name that will appear in their dashboard
            </p>
          </div>

          {/* Access Level - Hidden for MVP as all users have full management */}
          <input type="hidden" name="accessLevel" value="FULL_MANAGEMENT" />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendNotification"
              checked={formData.sendNotification}
              onCheckedChange={(checked) => handleInputChange("sendNotification", checked as boolean)}
              disabled={isSubmitting}
            />
            <Label htmlFor="sendNotification" className="text-sm font-normal">
              Send email invitation to client
            </Label>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your client will receive full access to manage their business data.
              If they already have an account with a business, they&apos;ll need to approve your access request.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}