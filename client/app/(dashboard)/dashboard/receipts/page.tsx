import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  CheckCircle2,
  ClockIcon,
  MoreHorizontal,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  FilterIcon,
  FolderIcon,
  ImageIcon,
  PlusIcon,
  Receipt,
  SearchIcon,
  UploadIcon,
} from "lucide-react";

export default async function ReceiptsPage() {
  const session = await auth();
  const userRole = session?.user?.role || "BUSINESS_OWNER";

  // Mock receipt data
  const receipts = [
    {
      id: "rec_1",
      date: "2023-10-15",
      vendor: "Office Depot",
      category: "Office Supplies",
      total: 249.99,
      status: "processed",
      type: "receipt",
      fileType: "pdf",
    },
    {
      id: "rec_2",
      date: "2023-10-12",
      vendor: "Adobe",
      category: "Software",
      total: 59.99,
      status: "pending",
      type: "receipt",
      fileType: "pdf",
    },
    {
      id: "rec_3",
      date: "2023-10-10",
      vendor: "Shell Gas Station",
      category: "Travel",
      total: 45.5,
      status: "processed",
      type: "receipt",
      fileType: "jpg",
    },
    {
      id: "rec_4",
      date: "2023-10-05",
      vendor: "State Tax Board",
      category: "Taxes",
      total: 1200.0,
      status: "pending",
      type: "document",
      fileType: "pdf",
    },
    {
      id: "rec_5",
      date: "2023-10-03",
      vendor: "Client Contract",
      category: "Legal",
      total: 0,
      status: "pending",
      type: "document",
      fileType: "docx",
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getFileIcon = (fileType: string, type: string) => {
    if (fileType === "pdf")
      return <FileTextIcon className="h-5 w-5 text-red-500" />;
    if (fileType === "jpg" || fileType === "png")
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType === "docx")
      return <FileIcon className="h-5 w-5 text-blue-700" />;
    if (type === "receipt")
      return <Receipt className="h-5 w-5 text-green-500" />;
    return <FolderIcon className="h-5 w-5 text-amber-500" />;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight">
          Receipts & Documents
        </h1>
        <p className="text-muted-foreground">
          Manage your receipts, invoices, and important documents
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
          </TabsList>
          <Button>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>All Files</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
              <CardDescription>
                Manage all your uploaded receipts and documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
                <Input
                  type="search"
                  placeholder="Search files..."
                  className="h-9"
                />
                <Button type="submit" size="sm" variant="ghost">
                  <SearchIcon className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Type</TableHead>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead>Vendor/Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          {getFileIcon(receipt.fileType, receipt.type)}
                        </TableCell>
                        <TableCell>{formatDate(receipt.date)}</TableCell>
                        <TableCell className="font-medium">
                          {receipt.vendor}
                        </TableCell>
                        <TableCell>{receipt.category}</TableCell>
                        <TableCell className="text-right">
                          {receipt.total > 0
                            ? formatCurrency(receipt.total)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                            ${
                              receipt.status === "processed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <span className="flex items-center">
                              {receipt.status === "processed" ? (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              ) : (
                                <ClockIcon className="mr-1 h-3 w-3" />
                              )}
                              {receipt.status === "processed"
                                ? "Processed"
                                : "Pending"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <EyeIcon className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              {receipt.status === "pending" && (
                                <DropdownMenuItem>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Mark as processed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>Edit details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing <strong>5</strong> of <strong>25</strong> files
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>Manage your expense receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                View and manage your uploaded receipts. Receipts are
                automatically categorized and can be linked to transactions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receipts
                  .filter((r) => r.type === "receipt")
                  .map((receipt) => (
                    <Card key={receipt.id} className="overflow-hidden">
                      <div className="h-32 bg-muted flex items-center justify-center">
                        {getFileIcon(receipt.fileType, receipt.type)}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{receipt.vendor}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(receipt.date)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            receipt.status === "processed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                          >
                            {receipt.status === "processed"
                              ? "Processed"
                              : "Pending"}
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm">Amount:</span>
                            <span className="font-medium">
                              {formatCurrency(receipt.total)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Category:</span>
                            <span>{receipt.category}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <EyeIcon className="mr-2 h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button size="sm" variant="ghost" className="px-2">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                <Card className="overflow-hidden border-dashed">
                  <div className="h-32 bg-muted flex items-center justify-center">
                    <Button variant="ghost" className="rounded-full h-16 w-16">
                      <PlusIcon className="h-8 w-8 text-muted-foreground" />
                    </Button>
                  </div>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <h3 className="font-medium text-center">
                      Upload New Receipt
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Drag & drop or click to upload
                    </p>
                    <Button className="mt-3" size="sm">
                      <UploadIcon className="mr-2 h-3.5 w-3.5" />
                      Upload
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage important business documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                View and manage important business documents like contracts, tax
                filings, and legal paperwork.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receipts
                  .filter((r) => r.type === "document")
                  .map((doc) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <div className="h-32 bg-muted flex items-center justify-center">
                        {getFileIcon(doc.fileType, doc.type)}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{doc.vendor}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(doc.date)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            doc.status === "processed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                          >
                            {doc.status === "processed"
                              ? "Processed"
                              : "Pending"}
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm">Category:</span>
                            <span>{doc.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">File Type:</span>
                            <span className="uppercase">{doc.fileType}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <EyeIcon className="mr-2 h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button size="sm" variant="ghost" className="px-2">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                <Card className="overflow-hidden border-dashed">
                  <div className="h-32 bg-muted flex items-center justify-center">
                    <Button variant="ghost" className="rounded-full h-16 w-16">
                      <PlusIcon className="h-8 w-8 text-muted-foreground" />
                    </Button>
                  </div>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <h3 className="font-medium text-center">
                      Upload New Document
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Drag & drop or click to upload
                    </p>
                    <Button className="mt-3" size="sm">
                      <UploadIcon className="mr-2 h-3.5 w-3.5" />
                      Upload
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>
                Documents and receipts awaiting your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mb-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Type</TableHead>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts
                      .filter((r) => r.status === "pending")
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {getFileIcon(item.fileType, item.type)}
                          </TableCell>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell className="font-medium">
                            {item.vendor}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right">
                            {item.total > 0 ? formatCurrency(item.total) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <EyeIcon className="mr-2 h-3.5 w-3.5" />
                                Review
                              </Button>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {userRole === "ACCOUNTANT" && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-amber-800">
                          Accountant Actions
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Review these documents to help your client categorize
                          and process their receipts correctly.
                        </p>
                      </div>
                      <Button className="bg-amber-600 hover:bg-amber-700">
                        Review All Pending
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
