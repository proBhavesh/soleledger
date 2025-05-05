import { z } from "zod";

// =======================================================
// User Types
// =======================================================
export const UserRoleEnum = z.enum(["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"]);
export const userAuthSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
});

export const userRegistrationSchema = userAuthSchema.extend({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    role: UserRoleEnum,
    acceptTerms: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms and privacy policy",
    }),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
});

export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

// =======================================================
// Profile Types
// =======================================================
export const businessProfileSchema = z.object({
    businessName: z.string().min(2, { message: "Business name is required" }),
    industry: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
});

export const accountantProfileSchema = z.object({
    firmName: z.string().min(2, { message: "Firm name is required" }),
    certifications: z.string().optional(),
    professionalInfo: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
});

// =======================================================
// Business Types
// =======================================================
export const businessSchema = z.object({
    name: z.string().min(2, { message: "Business name is required" }),
    industry: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
});

// =======================================================
// Team Invitation Types
// =======================================================
export const InvitationStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);

export const teamInvitationSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    role: z.string().min(1, { message: "Role is required" }),
    businessId: z.string().optional(),
});

// =======================================================
// Bank Account Types
// =======================================================
export const bankAccountSchema = z.object({
    name: z.string().min(1, { message: "Account name is required" }),
    institution: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    balance: z.number().optional(),
    currency: z.string().default("USD"),
});

// =======================================================
// Transaction Types
// =======================================================
export const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

export const transactionSchema = z.object({
    type: TransactionTypeEnum,
    amount: z.coerce.number().positive({ message: "Amount must be positive" }),
    date: z.date(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    bankAccountId: z.string().optional(),
    notes: z.string().optional(),
    reference: z.string().optional(),
});

// =======================================================
// Category Types
// =======================================================
export const categorySchema = z.object({
    name: z.string().min(1, { message: "Category name is required" }),
    type: TransactionTypeEnum,
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().optional(),
});

// =======================================================
// Document Types
// =======================================================
export const DocumentTypeEnum = z.enum(["RECEIPT", "INVOICE", "STATEMENT", "OTHER"]);

export const documentSchema = z.object({
    name: z.string().min(1, { message: "Document name is required" }),
    type: DocumentTypeEnum,
    transactionId: z.string().optional(),
    notes: z.string().optional(),
});

// =======================================================
// Report Types
// =======================================================
export const reportSchema = z.object({
    name: z.string().min(1, { message: "Report name is required" }),
    type: z.string().min(1, { message: "Report type is required" }),
    dateRange: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    format: z.string().optional(),
    isScheduled: z.boolean().default(false),
    scheduleFrequency: z.string().optional(),
});

// =======================================================
// Task Types
// =======================================================
export const TaskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]);
export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const taskSchema = z.object({
    title: z.string().min(1, { message: "Task title is required" }),
    description: z.string().optional(),
    status: TaskStatusEnum.default("PENDING"),
    priority: TaskPriorityEnum.default("MEDIUM"),
    dueDate: z.date().optional(),
    assigneeId: z.string().optional(),
});

// =======================================================
// Subscription Types
// =======================================================
export const SubscriptionStatusEnum = z.enum([
    "ACTIVE",
    "INACTIVE",
    "CANCELLED",
    "PAST_DUE",
    "TRIAL",
]);

// =======================================================
// Payment Types
// =======================================================
export const PaymentStatusEnum = z.enum(["SUCCESS", "FAILED", "PENDING"]); 