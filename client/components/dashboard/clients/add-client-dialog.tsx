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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createClientBusiness, sendClientInvitation } from "@/lib/actions/client-management-actions";
import { type CreateClientBusinessData } from "@/lib/types/client-management";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (businessId: string) => void;
}

type FormData = CreateClientBusinessData;

export function AddClientDialog({ open, onOpenChange, onSuccess }: AddClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendInvitation, setSendInvitation] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    description: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({ name: "", email: "", description: "" });
      setErrors({});
      setIsSubmitting(false);
      setSendInvitation(true);
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    // Manual validation to avoid Zod import issues
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "Business name is required";
    }
    
    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = "Email is required";
    } else {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Valid email is required";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createClientBusiness(formData);
      if (result.success && result.businessId) {
        // Send invitation if requested
        if (sendInvitation) {
          const inviteResult = await sendClientInvitation(
            result.businessId,
            formData.email,
            formData.name
          );
          
          if (inviteResult.success) {
            toast.success("Client business created and invitation sent!");
          } else {
            toast.success("Client business created successfully!");
            toast.warning("Failed to send invitation: " + (inviteResult.error || "Unknown error"));
          }
        } else {
          toast.success("Client business created successfully!");
        }
        
        setFormData({ name: "", email: "", description: "" });
        setErrors({});
        onOpenChange(false);
        onSuccess?.(result.businessId);
      } else {
        toast.error(result.error || "Failed to create client business");
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Simple real-time validation without using Zod pick method
    if (value.trim() && field !== "description") {
      let fieldError = "";
      
      if (field === "name" && value.length < 1) {
        fieldError = "Business name is required";
      } else if (field === "email" && value.length > 0) {
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          fieldError = "Valid email is required";
        }
      }
      
      if (fieldError) {
        setErrors(prev => ({ ...prev, [field]: fieldError }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new business for your client. They&apos;ll be able to access their own dashboard once set up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Inc."
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
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
            <p className="text-xs text-muted-foreground">
              This email will be used to create the client&apos;s account if they don&apos;t already have one.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the business..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvitation"
              checked={sendInvitation}
              onCheckedChange={(checked) => setSendInvitation(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label htmlFor="sendInvitation" className="text-sm font-normal">
              Send invitation notification to client
            </Label>
          </div>

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
              Create Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}