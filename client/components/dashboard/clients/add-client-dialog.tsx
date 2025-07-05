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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, DollarSign, FileText, Eye, InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createClientInvitation } from "@/lib/actions/client-management-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ACCESS_LEVEL_INFO, 
  type CreateClientInvitationData,
  type AccessLevelKey,
} from "@/lib/types/invitation";

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
    accessLevel: "FULL_MANAGEMENT",
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
        let message = "Client invitation created successfully!";
        
        if (formData.sendNotification) {
          switch (result.invitationType) {
            case "NEW_USER":
              message = "Invitation sent! Your client will receive an email to create their account.";
              break;
            case "EXISTING_NO_BUSINESS":
              message = "Invitation sent! Your client will be asked to set up their business.";
              break;
            case "EXISTING_WITH_BUSINESS":
              message = "Access request sent! Your client will need to approve your access.";
              break;
          }
        }
        
        toast.success(message);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create invitation");
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Failed to create invitation");
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

  const SelectedAccessInfo = ACCESS_LEVEL_INFO[formData.accessLevel];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Client</DialogTitle>
          <DialogDescription>
            Send an invitation to manage your client&apos;s bookkeeping. They&apos;ll receive an email with instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="John Smith"
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

          <div className="space-y-2">
            <Label htmlFor="accessLevel">Access Level</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value) => handleInputChange("accessLevel", value as FormData["accessLevel"])}
              disabled={isSubmitting}
            >
              <SelectTrigger id="accessLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCESS_LEVEL_INFO).map(([value, info]) => {
                  const iconMap = {
                    VIEW_ONLY: Eye,
                    FULL_MANAGEMENT: Shield,
                    FINANCIAL_ONLY: DollarSign,
                    DOCUMENTS_ONLY: FileText,
                  };
                  const Icon = iconMap[value as AccessLevelKey];
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{info.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {SelectedAccessInfo && (
              <Alert className="mt-2">
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  {SelectedAccessInfo.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

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
              If the client already has an account with a business, they&apos;ll need to approve your access request.
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