/**
 * Create File Dialog Component
 * Supports three creation modes:
 * 1. Create Blank - Word, Excel, or PowerPoint
 * 2. From Template - Copy from template library
 * 3. From Project - Copy from another project stage
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, FileSpreadsheet, FilePresentation } from 'lucide-react';

type CreationMode = 'blank' | 'template' | 'project';
type FileType = 'docx' | 'xlsx' | 'pptx';

interface CreateFileDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCreateBlank?: (fileName: string, fileType: FileType) => Promise<void>;
  onCopyTemplate?: (templateId: string, fileName: string) => Promise<void>;
  onCopyFromProject?: (fileId: string, fileName: string) => Promise<void>;
  defaultFileName?: string;
}

export const CreateFileDialog: React.FC<CreateFileDialogProps> = ({
  isOpen = false,
  onClose,
  onCreateBlank,
  onCopyTemplate,
  onCopyFromProject,
  defaultFileName = '',
}) => {
  const [mode, setMode] = useState<CreationMode>('blank');
  const [fileName, setFileName] = useState(defaultFileName);
  const [fileType, setFileType] = useState<FileType>('docx');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectFile, setSelectedProjectFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      if (!fileName.trim()) {
        setError('File name is required');
        return;
      }

      setError(null);
      setIsLoading(true);

      switch (mode) {
        case 'blank':
          if (onCreateBlank) {
            await onCreateBlank(fileName, fileType);
          }
          break;
        case 'template':
          if (!selectedTemplate) {
            setError('Please select a template');
            return;
          }
          if (onCopyTemplate) {
            await onCopyTemplate(selectedTemplate, fileName);
          }
          break;
        case 'project':
          if (!selectedProjectFile) {
            setError('Please select a file to copy');
            return;
          }
          if (onCopyFromProject) {
            await onCopyFromProject(selectedProjectFile, fileName);
          }
          break;
      }

      // Reset and close
      setFileName(defaultFileName);
      setFileType('docx');
      setSelectedTemplate('');
      setSelectedProject('');
      setSelectedProjectFile('');
      onClose?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>
            Choose how you want to create your file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as CreationMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="blank">Blank</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>

          {/* Blank File Tab */}
          <TabsContent value="blank" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blank-file-type">File Type</Label>
              <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docx">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Word Document
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      Excel Spreadsheet
                    </div>
                  </SelectItem>
                  <SelectItem value="pptx">
                    <div className="flex items-center gap-2">
                      <FilePresentation className="h-4 w-4 text-orange-500" />
                      PowerPoint Presentation
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                Template browser coming soon. Search and browse templates from SharePoint.
              </div>
            </div>
          </TabsContent>

          {/* Project Tab */}
          <TabsContent value="project" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Project File</Label>
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                Project file browser coming soon. Browse files from other project stages.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* File Name Input */}
        <div className="space-y-2">
          <Label htmlFor="file-name">File Name</Label>
          <Input
            id="file-name"
            placeholder="Enter file name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            disabled={isLoading}
          />
          {mode === 'blank' && (
            <p className="text-xs text-muted-foreground">
              File will be saved as: {fileName}.{fileType}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create File'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
