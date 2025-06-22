"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Calendar,
  User,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileBarChart,
  DollarSign,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getReportHistory,
  deleteSavedReport,
} from "@/lib/actions/report-persistence-actions";
import type { SavedReport } from "@/lib/types/reports";

interface ReportHistoryProps {
  onViewReport?: (report: SavedReport) => void;
}

export function ReportHistory({ onViewReport }: ReportHistoryProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const filters = selectedType !== "all" ? { type: selectedType as "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "EXPENSE_CATEGORIES" | "RECONCILIATION_SUMMARY" | "TAX_SUMMARY" | "MONTHLY_SUMMARY" } : {};
      const result = await getReportHistory(filters);
      
      if (result.success && result.reports) {
        setReports(result.reports);
      } else {
        toast.error("Failed to load report history");
      }
    } catch {
      toast.error("Failed to load report history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewReport = async (report: SavedReport) => {
    if (onViewReport) {
      onViewReport(report);
    } else {
      setSelectedReport(report);
      setShowViewDialog(true);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setIsDeleting(reportId);
      const result = await deleteSavedReport(reportId);
      
      if (result.success) {
        toast.success("Report deleted successfully");
        await fetchReports();
      } else {
        toast.error(result.error || "Failed to delete report");
      }
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setIsDeleting(null);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case "PROFIT_LOSS":
        return <TrendingUp className="h-4 w-4" />;
      case "BALANCE_SHEET":
        return <FileBarChart className="h-4 w-4" />;
      case "CASH_FLOW":
        return <DollarSign className="h-4 w-4" />;
      case "EXPENSE_CATEGORIES":
        return <PieChart className="h-4 w-4" />;
      case "RECONCILIATION_SUMMARY":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case "PROFIT_LOSS":
        return "Profit & Loss";
      case "BALANCE_SHEET":
        return "Balance Sheet";
      case "CASH_FLOW":
        return "Cash Flow";
      case "EXPENSE_CATEGORIES":
        return "Expense Categories";
      case "RECONCILIATION_SUMMARY":
        return "Reconciliation Summary";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const formatReportPeriod = (report: SavedReport) => {
    return `${format(new Date(report.startDate), "MMM d, yyyy")} - ${format(
      new Date(report.endDate),
      "MMM d, yyyy"
    )}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Loading report history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                View and manage previously generated reports
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="PROFIT_LOSS">Profit & Loss</SelectItem>
                  <SelectItem value="BALANCE_SHEET">Balance Sheet</SelectItem>
                  <SelectItem value="CASH_FLOW">Cash Flow</SelectItem>
                  <SelectItem value="EXPENSE_CATEGORIES">
                    Expense Categories
                  </SelectItem>
                  <SelectItem value="RECONCILIATION_SUMMARY">
                    Reconciliation Summary
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchReports} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No reports found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate reports and save them to view them here
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReportIcon(report.type)}
                          <div>
                            <div className="font-medium">{report.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {getReportTypeName(report.type)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatReportPeriod(report)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(
                            new Date(report.generatedAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.generatedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            title="Export coming soon"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteReport(report.id)}
                            disabled={isDeleting === report.id}
                          >
                            {isDeleting === report.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
            <DialogDescription>
              Generated on{" "}
              {selectedReport &&
                format(new Date(selectedReport.generatedAt), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedReport && (
              <div className="space-y-4">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedReport.data, null, 2)}
                </pre>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}