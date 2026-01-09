/**
 * Template Browser Component
 * Browse templates organized by job type (Feasibility, Technical Specification, etc.)
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileMetadata, FolderMetadata } from '@/services/graphService';
import { Search, Loader2, FolderOpen, FileText } from 'lucide-react';

interface TemplateBrowserProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectTemplate?: (template: FileMetadata) => void;
  jobTypes?: FolderMetadata[];
  isLoading?: boolean;
}

export const TemplateBrowser: React.FC<TemplateBrowserProps> = ({
  isOpen = false,
  onClose,
  onSelectTemplate,
  jobTypes = [],
  isLoading = false,
}) => {
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<FileMetadata[]>([]);

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTemplates(
        templates.filter((t) => t.name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, templates]);

  const handleSelectTemplate = (template: FileMetadata) => {
    onSelectTemplate?.(template);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
          <DialogDescription>
            Browse templates organized by job type
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Job Types List */}
          <div className="w-40 border-r overflow-y-auto">
            <div className="space-y-1 p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : jobTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No templates available</p>
              ) : (
                jobTypes.map((jobType) => (
                  <Button
                    key={jobType.id}
                    variant={selectedJobType === jobType.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSelectedJobType(jobType.id);
                      setTemplates([]); // Will be fetched in parent
                      setSearchQuery('');
                    }}
                  >
                    <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{jobType.name}</span>
                  </Button>
                ))
              )}
            </div>
          </div>

          {/* Templates List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedJobType ? (
              <>
                {/* Search */}
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {/* Templates */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">
                      {searchQuery ? 'No templates match your search' : 'No templates in this job type'}
                    </p>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 border rounded hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(template.lastModifiedDateTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a job type to browse templates</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
