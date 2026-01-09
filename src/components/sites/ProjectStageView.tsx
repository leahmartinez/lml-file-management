/**
 * Project Stage View - Full screen view for managing a specific stage
 * Allows editing stage description, managing files, and changing status
 * Integrates SharePoint file management with Office Online viewers
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { ProjectStage, ProjectStageStatus, ProjectFile, DirectoryContact } from "@/types/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDetailModal } from "@/components/ContactDetailModal";
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
import { ArrowLeft, Plus, Trash2, Download, Edit2, Check, X, Upload, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSharePointAuth } from "@/hooks/useSharePointAuth";
import { useSharePointFiles } from "@/hooks/useSharePointFiles";
import { SharePointFileBrowser } from "@/components/sharepoint/SharePointFileBrowser";
import { CreateFileDialog } from "@/components/sharepoint/CreateFileDialog";
import { graphService } from "@/services/graphService";

const STAGE_STATUSES: ProjectStageStatus[] = [
  "Not Started",
  "In Progress",
  "Ready for Invoice",
  "Complete",
];

// Helper function to get status badge color
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Not Started':
      return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
    case 'Ready for Invoice':
      return 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200';
    case 'Complete':
    case 'Completed':
      return 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200';
  }
};

interface ProjectStageViewProps {
  stage: ProjectStage;
  projectCode: string;
  onBack: () => void;
  onStageUpdate?: (stage: ProjectStage) => void;
  canUpload?: boolean;
  consultants?: DirectoryContact[]; // LML Lift Consultants only
  stageConsultants?: string[]; // Consultant emails assigned to this stage
  onAssignConsultants?: (stageId: string, consultantEmails: string[]) => void;
}

export const ProjectStageView = ({
  stage,
  projectCode,
  onBack,
  onStageUpdate,
  canUpload = false,
  consultants = [],
  stageConsultants = [],
  onAssignConsultants,
}: ProjectStageViewProps) => {
  const { toast } = useToast();
  const { isAuthenticated, login } = useSharePointAuth();

  // SharePoint folder path for this stage
  const sharePointFolderPath = `${import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects'}/${projectCode}/${stage.name}`;

  // SharePoint file management
  const {
    files: sharePointFiles,
    isLoading: sharePointLoading,
    error: sharePointError,
    fetchFiles: fetchSharePointFiles,
    deleteFile: deleteSharePointFile,
  } = useSharePointFiles({
    folderPath: sharePointFolderPath,
    autoFetch: isAuthenticated,
  });

  // SharePoint folder initialization
  const [folderInitializing, setFolderInitializing] = useState(false);
  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [fileTab, setFileTab] = useState<'sharepoint' | 'uploaded'>('sharepoint');

  const [consultantSearchQuery, setConsultantSearchQuery] = useState("");
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>(stageConsultants);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<DirectoryContact | null>(null);

  // Sync selected consultants when stageConsultants changes
  useEffect(() => {
    setSelectedConsultants(stageConsultants);
  }, [stageConsultants]);

  // Initialize SharePoint folder structure on component mount
  useEffect(() => {
    const initializeFolder = async () => {
      if (!isAuthenticated) return;

      try {
        setFolderInitializing(true);
        await graphService.initialize(import.meta.env.VITE_SHAREPOINT_SITE_URL);
        await graphService.ensureProjectFolder(projectCode, stage.name);

        // Fetch files after folder is created
        await fetchSharePointFiles(sharePointFolderPath);

        toast({
          title: "Success",
          description: "SharePoint folder initialized",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize folder';
        console.error('Folder initialization error:', errorMessage);
        toast({
          title: "Error",
          description: "Failed to initialize SharePoint folder",
          variant: "destructive",
        });
      } finally {
        setFolderInitializing(false);
      }
    };

    initializeFolder();
  }, [isAuthenticated, projectCode, stage.name, sharePointFolderPath, fetchSharePointFiles, toast]);

  // Filter consultants based on search query
  const filteredConsultants = useMemo(() => {
    if (!consultantSearchQuery.trim()) {
      return consultants.slice(0, 15); // Show first 15 if no search
    }
    const query = consultantSearchQuery.toLowerCase();
    return consultants
      .filter(consultant =>
        consultant.firstName.toLowerCase().includes(query) ||
        consultant.lastName.toLowerCase().includes(query) ||
        consultant.email.toLowerCase().includes(query)
      )
      .slice(0, 15);
  }, [consultants, consultantSearchQuery]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescValue, setEditDescValue] = useState(stage.description || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(stage.name || "");
  const [files, setFiles] = useState<ProjectFile[]>(stage.files || []);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ProjectStageStatus>(
    stage.status || "Not Started"
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setEditDescValue(stage.description || "");
    setEditNameValue(stage.name || "");
  }, [stage.description, stage.name]);

  const handleSaveName = () => {
    if (editNameValue.trim()) {
      const updated: ProjectStage = {
        ...stage,
        name: editNameValue.trim(),
      };
      onStageUpdate?.(updated);
      setIsEditingName(false);
      toast({
        title: "Success",
        description: "Stage name updated",
      });
    }
  };

  const handleSaveDescription = () => {
    if (editDescValue.trim()) {
      const updated: ProjectStage = {
        ...stage,
        description: editDescValue.trim(),
      };
      onStageUpdate?.(updated);
      setIsEditingDescription(false);
      toast({
        title: "Success",
        description: "Stage description updated",
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus as ProjectStageStatus);
    const updated: ProjectStage = {
      ...stage,
      status: newStatus as ProjectStageStatus,
    };
    onStageUpdate?.(updated);
    toast({
      title: "Success",
      description: `Stage status changed to ${newStatus}`,
    });
  };

  const handleAddFile = () => {
    if (!newFileName.trim() || !newFileUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter both file name and URL",
        variant: "destructive",
      });
      return;
    }

    const newFile: ProjectFile = {
      id: `file_${Date.now()}`,
      name: newFileName,
      url: newFileUrl,
      sharePointUrl: newFileUrl.includes("sharepoint") ? newFileUrl : undefined,
      stageId: stage.id,
      projectCode,
      dateUploaded: new Date().toISOString(),
      documentType: newFileUrl.includes("sharepoint") ? "sharepoint" : "external_link",
      uploadedBy: "current-user",
    };

    const updated: ProjectStage = {
      ...stage,
      files: [...files, newFile],
    };
    setFiles([...files, newFile]);
    onStageUpdate?.(updated);
    setNewFileName("");
    setNewFileUrl("");
    setIsAddingFile(false);
    toast({
      title: "Success",
      description: "File added to stage",
    });
  };

  const handleDeleteFile = (fileId: string) => {
    const updated: ProjectStage = {
      ...stage,
      files: files.filter((f) => f.id !== fileId),
    };
    setFiles(files.filter((f) => f.id !== fileId));
    onStageUpdate?.(updated);
    toast({
      title: "Success",
      description: "File removed",
    });
  };

  const handleFileUpload = async (filesToUpload: File[]) => {
    if (!canUpload) {
      toast({
        title: "Error",
        description: "You don't have permission to upload files",
        variant: "destructive",
      });
      return;
    }

    const newFiles: ProjectFile[] = [];
    let filesProcessed = 0;

    for (const file of filesToUpload) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const newFile: ProjectFile = {
            id: `file_${Date.now()}_${Math.random()}`,
            name: file.name,
            url: dataUrl,
            stageId: stage.id,
            projectCode,
            dateUploaded: new Date().toISOString(),
            documentType: "uploaded",
            uploadedBy: "current-user",
            fileSize: `${(file.size / 1024).toFixed(2)} KB`,
            fileType: file.type,
          };
          newFiles.push(newFile);
          filesProcessed++;

          // If this is the last file, update the stage
          if (filesProcessed === filesToUpload.length) {
            const updated: ProjectStage = {
              ...stage,
              files: [...files, ...newFiles],
            };
            setFiles([...files, ...newFiles]);
            onStageUpdate?.(updated);
            setIsDragging(false);
            toast({
              title: "Success",
              description: `${newFiles.length} file(s) uploaded`,
            });
          }
        };
        reader.onerror = () => {
          toast({
            title: "Error",
            description: `Failed to read file: ${file.name}`,
            variant: "destructive",
          });
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to upload file: ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles as any);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      handleFileUpload(selectedFiles as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header with Back Button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </div>
          {isEditingName ? (
            <div className="mt-4 space-y-2">
              <Input
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="Enter stage name..."
                className="text-3xl font-bold h-10 py-1"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveName}>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditNameValue(stage.name || "");
                    setIsEditingName(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-4">
              <h1 className="text-3xl font-bold">{stage.name || (stage as any).stage}</h1>
              <Badge variant="outline" className={getStatusBadgeClass(selectedStatus)}>
                {selectedStatus}
              </Badge>
              {canUpload && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description and Status/Consultants - Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Description Section - Left (2/3 width) */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">Description</CardTitle>
              {!isEditingDescription && canUpload && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingDescription ? (
              <div className="space-y-4">
                <RichTextEditor
                  value={editDescValue}
                  onChange={(html, text) => setEditDescValue(html)}
                  placeholder="Enter stage description..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDescription}>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditDescValue(stage.description || "");
                      setIsEditingDescription(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: editDescValue || '<p style="color: var(--muted-foreground); font-style: italic;">No description added yet</p>' }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Status and Consultants (1/3 width, stacked) */}
        <div className="space-y-6">
          {/* Status Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Consultants Section */}
          {consultants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned Consultants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Selected Consultants Display */}
                <div>
                  {selectedConsultants.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">None assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedConsultants.map((consultantEmail) => {
                        const consultant = consultants.find(c => c.email === consultantEmail);
                        return (
                          <div
                            key={consultantEmail}
                            className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full text-sm hover:bg-primary/20 cursor-pointer transition-colors"
                          >
                            <button
                              onClick={() => {
                                if (consultant) {
                                  setSelectedContactDetail(consultant);
                                  setContactDetailOpen(true);
                                }
                              }}
                              className="hover:underline text-left"
                            >
                              {consultant
                                ? `${consultant.firstName} ${consultant.lastName}`
                                : consultantEmail}
                            </button>
                            {canUpload && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = selectedConsultants.filter(e => e !== consultantEmail);
                                  setSelectedConsultants(updated);
                                  onAssignConsultants?.(stage.id, updated);
                                }}
                                className="ml-1 text-xs hover:text-red-600"
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Consultant Search/Add */}
                {canUpload && (
                  <div className="relative">
                    <Input
                      placeholder="Add consultants..."
                      value={consultantSearchQuery}
                      onChange={(e) => {
                        setConsultantSearchQuery(e.target.value);
                        setShowConsultantDropdown(true);
                      }}
                      onFocus={() => setShowConsultantDropdown(true)}
                      className="h-9 text-sm"
                    />
                    {showConsultantDropdown && consultantSearchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filteredConsultants.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            No consultants found
                          </div>
                        ) : (
                          filteredConsultants.map((consultant) => (
                            <button
                              key={consultant.id}
                              onClick={() => {
                                if (!selectedConsultants.includes(consultant.email)) {
                                  const updated = [...selectedConsultants, consultant.email];
                                  setSelectedConsultants(updated);
                                  onAssignConsultants?.(stage.id, updated);
                                }
                                setConsultantSearchQuery("");
                                setShowConsultantDropdown(false);
                              }}
                              disabled={selectedConsultants.includes(consultant.email)}
                              className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm border-b last:border-b-0"
                            >
                              <div className="font-medium">
                                {consultant.firstName} {consultant.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {consultant.email}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Files</CardTitle>
            <div className="flex gap-2">
              {/* SharePoint Auth/Login Button */}
              {!isAuthenticated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={login}
                  className="gap-2"
                >
                  Sign in to SharePoint
                </Button>
              )}

              {/* Open in SharePoint Button */}
              {isAuthenticated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const sharePointUrl = `${import.meta.env.VITE_SHAREPOINT_SITE_URL}/${projectCode}/${stage.name}`;
                    window.open(sharePointUrl, '_blank');
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in SharePoint
                </Button>
              )}

              {/* Create New File Button */}
              {isAuthenticated && (
                <Button
                  size="sm"
                  onClick={() => setCreateFileDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              )}

              {/* Upload/Add Link Buttons (for uploaded files tab) */}
              {canUpload && !isAddingFile && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </Button>
                  <Button size="sm" onClick={() => setIsAddingFile(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Link
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Folder Initialization Indicator */}
          {isAuthenticated && folderInitializing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-600">Initializing SharePoint folder...</p>
            </div>
          )}

          {/* Tabs for SharePoint vs Uploaded Files */}
          <Tabs value={fileTab} onValueChange={(value) => setFileTab(value as 'sharepoint' | 'uploaded')}>
            <TabsList>
              <TabsTrigger value="sharepoint">SharePoint Files</TabsTrigger>
              <TabsTrigger value="uploaded">Uploaded Files</TabsTrigger>
            </TabsList>

            {/* SharePoint Files Tab */}
            <TabsContent value="sharepoint" className="space-y-4">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Sign in to SharePoint to view and manage files
                  </p>
                  <Button onClick={login}>Sign in to SharePoint</Button>
                </div>
              ) : (
                <SharePointFileBrowser
                  files={sharePointFiles}
                  isLoading={sharePointLoading}
                  error={sharePointError}
                  onOpenFile={(file) => {
                    // Open file in new tab
                    window.open(file.webUrl, '_blank');
                  }}
                  onDeleteFile={async (itemId) => {
                    await deleteSharePointFile(itemId);
                  }}
                  onDownloadFile={(file) => {
                    window.open(file.webUrl, '_blank');
                  }}
                />
              )}
            </TabsContent>

            {/* Uploaded Files Tab */}
            <TabsContent value="uploaded" className="space-y-4">
              {/* Drag and Drop Zone */}
              {canUpload && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-muted-foreground/25 bg-muted/25"
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag and drop files here</p>
                  <p className="text-xs text-muted-foreground">or click "Upload Files" button</p>
                </div>
              )}

              {isAddingFile && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="fileName" className="text-sm">
                      File Name *
                    </Label>
                    <Input
                      id="fileName"
                      placeholder="e.g., Feasibility_Study.pdf"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fileUrl" className="text-sm">
                      File URL or SharePoint Link *
                    </Label>
                    <Input
                      id="fileUrl"
                      placeholder="https://..."
                      value={newFileUrl}
                      onChange={(e) => setNewFileUrl(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Can be a direct file link or SharePoint document URL
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddFile}>
                      <Check className="h-4 w-4 mr-2" />
                      Add File
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingFile(false);
                        setNewFileName("");
                        setNewFileUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {files.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {file.documentType === "sharepoint"
                              ? "SharePoint"
                              : file.documentType === "uploaded"
                              ? "Uploaded"
                              : "External Link"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(file.dateUploaded).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            {file.url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (file.url?.startsWith("http")) {
                                    window.open(file.url, "_blank");
                                  }
                                }}
                                className="px-2"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            {canUpload && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFile(file.id)}
                                className="px-2"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  {canUpload ? "No files added yet" : "No files for this stage"}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create File Dialog */}
      <CreateFileDialog
        isOpen={createFileDialogOpen}
        onClose={() => setCreateFileDialogOpen(false)}
        onCreateBlank={async (fileName, fileType) => {
          try {
            await graphService.createBlankFile(sharePointFolderPath, fileName, fileType);
            await fetchSharePointFiles(sharePointFolderPath);
            toast({
              title: "Success",
              description: `${fileName} created successfully`,
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to create file",
              variant: "destructive",
            });
          }
        }}
      />

      <ContactDetailModal
        isOpen={contactDetailOpen}
        onClose={() => {
          setContactDetailOpen(false);
          setSelectedContactDetail(null);
        }}
        contact={selectedContactDetail}
      />
    </div>
  );
};

export default ProjectStageView;
