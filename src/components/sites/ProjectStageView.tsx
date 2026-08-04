/**
 * Project Stage View - Full screen view for managing a specific stage
 * Allows editing stage description, managing files, and changing status
 * Integrates SharePoint file management with Office Online viewers
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { ProjectStage, ProjectStageStatus, DirectoryContact } from "@/types/data";
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
import { ArrowLeft, Plus, Trash2, Download, Edit2, Check, X, Upload, ExternalLink, Loader2, Calendar, RefreshCw, Copy, ChevronRight, FileText, FileSpreadsheet, FolderPlus, File } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { useSharePointAuth } from "@/hooks/useSharePointAuth";
import { useSharePointFiles } from "@/hooks/useSharePointFiles";
import { useFileClipboard } from "@/contexts/FileClipboardContext";
import { ClipboardPaste } from "lucide-react";
import { SharePointFileBrowser } from "@/components/sharepoint/SharePointFileBrowser";
import { InlineNameInput } from "@/components/sharepoint/InlineNameInput";
import { graphService, FileMetadata } from "@/services/graphService";

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

// Breadcrumb trail for folder navigation - "Root / Drawings / Revisions", each segment
// clickable. Shared by the SharePoint Files tab and the Templates tab.
const FolderBreadcrumb = ({
  rootLabel,
  path,
  onNavigate,
}: {
  rootLabel: string;
  path: string[];
  onNavigate: (index: number) => void;
}) => (
  <div className="flex items-center gap-1 text-sm flex-wrap">
    <button
      onClick={() => onNavigate(-1)}
      className={
        path.length === 0
          ? "font-medium text-foreground cursor-default"
          : "text-blue-600 hover:underline"
      }
      disabled={path.length === 0}
    >
      {rootLabel}
    </button>
    {path.map((segment, index) => (
      <span key={index} className="flex items-center gap-1 text-muted-foreground">
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          onClick={() => onNavigate(index)}
          className={
            index === path.length - 1
              ? "font-medium text-foreground cursor-default"
              : "text-blue-600 hover:underline"
          }
          disabled={index === path.length - 1}
        >
          {segment}
        </button>
      </span>
    ))}
  </div>
);

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

  // Check if SharePoint integration is enabled
  const sharePointEnabled = import.meta.env.VITE_ENABLE_SHAREPOINT !== 'false';

  // SharePoint hooks - always call them (React rule), but they check the flag internally
  const sharePointAuth = useSharePointAuth();
  const { isAuthenticated, login, error: sharePointAuthError } = sharePointAuth || { isAuthenticated: false, login: () => {}, error: null };
  const { clipboard, copy: copyToClipboard, clear: clearClipboard } = useFileClipboard();

  // SharePoint folder path for this stage's root, and the folder currently being
  // browsed within it (nested folder navigation - see currentSubPath below)
  const sharePointFolderPath = `${import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects'}/${projectCode}/${stage.name}`;
  const [currentSubPath, setCurrentSubPath] = useState<string[]>([]);
  const activeFolderPath = currentSubPath.length > 0
    ? `${sharePointFolderPath}/${currentSubPath.join('/')}`
    : sharePointFolderPath;

  // SharePoint file management - bound to whichever folder is currently being browsed
  const {
    files: sharePointFiles,
    isLoading: sharePointLoading,
    error: sharePointError,
    fetchFiles: fetchSharePointFiles,
    deleteFile: deleteSharePointFile,
    uploadFile: uploadSharePointFile,
    renameItem: renameSharePointItem,
    createFolder: createSharePointFolder,
    createBlankFile: createSharePointBlankFile,
    copyItemTo: copyItemToStageFolder,
  } = useSharePointFiles({
    folderPath: activeFolderPath,
    autoFetch: isAuthenticated,
  });

  const [fileTab, setFileTab] = useState<'sharepoint' | 'templates'>('sharepoint');

  // Templates tab - browses the company-wide /Templates library with the exact same
  // breadcrumb navigation pattern as the stage's own files (see currentSubPath above)
  const templatesRootPath = import.meta.env.VITE_SHAREPOINT_TEMPLATE_PATH || '/Templates';
  const [templatesSubPath, setTemplatesSubPath] = useState<string[]>([]);
  const templatesActivePath = templatesSubPath.length > 0
    ? `${templatesRootPath}/${templatesSubPath.join('/')}`
    : templatesRootPath;
  const {
    files: templateFiles,
    isLoading: templateFilesLoading,
    error: templateFilesError,
  } = useSharePointFiles({
    folderPath: templatesActivePath,
    autoFetch: isAuthenticated && fileTab === 'templates',
  });

  // SharePoint folder initialization
  const [folderInitializing, setFolderInitializing] = useState(false);
  // Real folder webUrl from Graph API - do not hand-build SharePoint URLs, they don't
  // match SharePoint's actual document-library URL format (library name, Forms/AllItems.aspx, etc).
  const [stageFolderWebUrl, setStageFolderWebUrl] = useState<string | null>(null);

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
        const stageFolder = await graphService.ensureProjectFolder(projectCode, stage.name);
        setStageFolderWebUrl(stageFolder.webUrl);

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
  const [selectedStatus, setSelectedStatus] = useState<ProjectStageStatus>(
    stage.status || "Not Started"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [copyingTemplateId, setCopyingTemplateId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [creatingFileType, setCreatingFileType] = useState<'docx' | 'xlsx' | 'pptx' | null>(null);
  const [plannedSiteVisitDate, setPlannedSiteVisitDate] = useState<Date | undefined>(
    stage.plannedSiteVisitDate ? new Date(stage.plannedSiteVisitDate) : undefined
  );
  const [siteVisitCalendarOpen, setSiteVisitCalendarOpen] = useState(false);

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

  const handleSiteVisitDateChange = (date: Date | undefined) => {
    setPlannedSiteVisitDate(date);
    const updated: ProjectStage = {
      ...stage,
      plannedSiteVisitDate: date ? date.toISOString() : undefined,
    };
    onStageUpdate?.(updated);
    setSiteVisitCalendarOpen(false);
    toast({
      title: "Success",
      description: date ? `Site visit scheduled for ${format(date, 'PP')}` : "Site visit date cleared",
    });
  };

  // Uploads go straight to the stage's SharePoint folder - no local/base64 copy is kept.
  const handleFileUpload = async (filesToUpload: File[]) => {
    if (!canUpload) {
      toast({
        title: "Error",
        description: "You don't have permission to upload files",
        variant: "destructive",
      });
      return;
    }
    if (!isAuthenticated) {
      toast({
        title: "Error",
        description: "Sign in to SharePoint before uploading",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    let succeeded = 0;
    try {
      for (const file of filesToUpload) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await uploadSharePointFile(file.name, arrayBuffer);
          if (result) succeeded++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Upload failed for ${file.name}:`, errorMessage);
          toast({
            title: "Error",
            description: `Failed to upload ${file.name}: ${errorMessage}`,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsUploading(false);
    }

    if (succeeded > 0) {
      toast({
        title: "Success",
        description: `${succeeded} file(s) uploaded to SharePoint`,
      });
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
      handleFileUpload(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      handleFileUpload(selectedFiles);
    }
    // Allow re-selecting the same file name after a previous upload
    e.target.value = '';
  };

  // Copy a template file from the Templates tab straight into the SharePoint folder
  // currently being browsed in the Files tab (not necessarily the stage root, if the
  // user has navigated into a subfolder).
  const handleCopyTemplateToStage = async (template: FileMetadata) => {
    if (!canUpload) {
      toast({
        title: "Error",
        description: "You don't have permission to add files to this stage",
        variant: "destructive",
      });
      return;
    }
    setCopyingTemplateId(template.id);
    try {
      const copied = await copyItemToStageFolder(template.id, activeFolderPath, template.name);
      if (copied) {
        toast({
          title: "Success",
          description: `${template.name} copied to this stage`,
        });
        setFileTab('sharepoint');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to copy template:', errorMessage);
      toast({
        title: "Error",
        description: `Failed to copy template: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setCopyingTemplateId(null);
    }
  };

  // Breadcrumb navigation - "Stage Root / Drawings / Revisions", each segment clickable.
  // Applies to both the SharePoint Files tab (currentSubPath) and Templates tab (templatesSubPath).
  const navigateStageBreadcrumb = (index: number) => {
    // index === -1 means "go to root"
    setCurrentSubPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };
  const navigateTemplatesBreadcrumb = (index: number) => {
    setTemplatesSubPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };
  const openStageSubfolder = (folder: FileMetadata) => {
    setCurrentSubPath((prev) => [...prev, folder.name]);
  };
  const openTemplatesSubfolder = (folder: FileMetadata) => {
    setTemplatesSubPath((prev) => [...prev, folder.name]);
  };

  const handlePasteFile = async () => {
    if (!clipboard) return;
    try {
      const result = await copyItemToStageFolder(clipboard.item.id, activeFolderPath, clipboard.item.name);
      if (result) {
        toast({ title: "Success", description: `${clipboard.item.name} pasted here` });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Paste failed:', errorMessage);
      toast({ title: "Error", description: `Failed to paste: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleRenameStageItem = async (itemId: string, newName: string) => {
    const result = await renameSharePointItem(itemId, newName);
    if (result) {
      toast({ title: "Success", description: "Renamed" });
    }
  };

  const handleCreateStageFolder = async (name: string) => {
    setIsCreatingFolder(false);
    if (!createSharePointFolder) return;
    const result = await createSharePointFolder(name);
    if (result) {
      toast({ title: "Success", description: `Folder "${name}" created` });
    }
  };

  const handleCreateStageFile = async (name: string) => {
    const fileType = creatingFileType;
    setCreatingFileType(null);
    if (!fileType) return;
    try {
      const result = await createSharePointBlankFile(name, fileType);
      if (result) {
        toast({ title: "Success", description: `${name}.${fileType} created` });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Create file error:', errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
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

          {/* Site Visit Date Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planned Site Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={siteVisitCalendarOpen} onOpenChange={setSiteVisitCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {plannedSiteVisitDate ? format(plannedSiteVisitDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={plannedSiteVisitDate}
                    onSelect={handleSiteVisitDateChange}
                    initialFocus
                  />
                  {plannedSiteVisitDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-destructive"
                        onClick={() => handleSiteVisitDateChange(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
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
              {isAuthenticated && stageFolderWebUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.open(stageFolderWebUrl, '_blank');
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in SharePoint
                </Button>
              )}

              {/* New dropdown - blank Word/Excel/PowerPoint or a folder, named inline (no modal) */}
              {isAuthenticated && canUpload && fileTab === 'sharepoint' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setCreatingFileType('docx')}>
                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                      Word Document
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCreatingFileType('xlsx')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                      Excel Spreadsheet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCreatingFileType('pptx')}>
                      <File className="h-4 w-4 mr-2 text-orange-500" />
                      PowerPoint Presentation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCreatingFolder(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Upload Button */}
              {canUpload && isAuthenticated && fileTab === 'sharepoint' && (
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-2">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Files
                </Button>
              )}

              {/* Refresh Button - picks up files added directly in SharePoint outside the app */}
              {isAuthenticated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    fileTab === 'sharepoint'
                      ? fetchSharePointFiles(activeFolderPath)
                      : undefined
                  }
                  disabled={sharePointLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${sharePointLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}

              {/* Paste Button - shown whenever the clipboard holds a file, regardless of
                  which stage/project it was copied from */}
              {isAuthenticated && canUpload && fileTab === 'sharepoint' && clipboard && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={handlePasteFile} className="gap-2" title={`Paste "${clipboard.item.name}"`}>
                    <ClipboardPaste className="h-4 w-4" />
                    Paste
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={clearClipboard} title="Clear clipboard">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SharePoint Auth Error - shown regardless of which sign-in button was clicked */}
          {!isAuthenticated && sharePointAuthError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive break-words">
                SharePoint sign-in failed: {sharePointAuthError}
              </p>
            </div>
          )}

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

          {/* Tabs for SharePoint Files vs Company Templates */}
          <Tabs value={fileTab} onValueChange={(value) => setFileTab(value as 'sharepoint' | 'templates')}>
            <TabsList>
              <TabsTrigger value="sharepoint">SharePoint Files</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
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
                <>
                  <FolderBreadcrumb
                    rootLabel={stage.name || 'Stage Root'}
                    path={currentSubPath}
                    onNavigate={navigateStageBreadcrumb}
                  />

                  {/* Drag and Drop Zone - uploads straight to the currently-open SharePoint folder */}
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
                      <p className="text-sm font-medium">Drag and drop files here to upload to SharePoint</p>
                      <p className="text-xs text-muted-foreground">or click "Upload Files" button above</p>
                    </div>
                  )}

                  {isCreatingFolder && (
                    <InlineNameInput
                      placeholder="New folder name"
                      onConfirm={handleCreateStageFolder}
                      onCancel={() => setIsCreatingFolder(false)}
                    />
                  )}
                  {creatingFileType && (
                    <InlineNameInput
                      placeholder={`New ${creatingFileType} file name`}
                      onConfirm={handleCreateStageFile}
                      onCancel={() => setCreatingFileType(null)}
                    />
                  )}

                  <SharePointFileBrowser
                    files={sharePointFiles}
                    isLoading={sharePointLoading}
                    error={sharePointError}
                    onOpenFile={(file) => {
                      // Open file in new tab
                      window.open(file.webUrl, '_blank');
                    }}
                    onOpenFolder={openStageSubfolder}
                    onDeleteFile={async (itemId) => {
                      await deleteSharePointFile(itemId);
                    }}
                    onDownloadFile={(file) => {
                      window.open(file.webUrl, '_blank');
                    }}
                    onRenameFile={canUpload ? handleRenameStageItem : undefined}
                    onCopyFile={canUpload ? (file) => {
                      copyToClipboard(file, activeFolderPath);
                      toast({ title: "Copied", description: `${file.name} copied - paste it anywhere` });
                    } : undefined}
                  />
                </>
              )}
            </TabsContent>

            {/* Templates Tab - company-wide /Templates library, same navigation pattern as stage files */}
            <TabsContent value="templates" className="space-y-4">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Sign in to SharePoint to browse templates
                  </p>
                  <Button onClick={login}>Sign in to SharePoint</Button>
                </div>
              ) : (
                <>
                  <FolderBreadcrumb
                    rootLabel="Templates"
                    path={templatesSubPath}
                    onNavigate={navigateTemplatesBreadcrumb}
                  />
                  <SharePointFileBrowser
                    files={templateFiles}
                    isLoading={templateFilesLoading}
                    error={templateFilesError}
                    onOpenFile={(file) => window.open(file.webUrl, '_blank')}
                    onOpenFolder={openTemplatesSubfolder}
                    onDownloadFile={(file) => window.open(file.webUrl, '_blank')}
                    onCopyFile={canUpload ? handleCopyTemplateToStage : undefined}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
