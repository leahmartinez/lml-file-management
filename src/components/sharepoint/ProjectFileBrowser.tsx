/**
 * Project File Browser Component
 * Browse and copy files from other project stages
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
import { FileMetadata, FolderMetadata } from '@/services/graphService';
import { Search, Loader2, FolderOpen, ChevronRight, FileText } from 'lucide-react';

interface ProjectFileBrowserProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectFile?: (file: FileMetadata) => void;
  projects?: FolderMetadata[];
  isLoading?: boolean;
}

type BrowserView = 'projects' | 'stages' | 'files';

export const ProjectFileBrowser: React.FC<ProjectFileBrowserProps> = ({
  isOpen = false,
  onClose,
  onSelectFile,
  projects = [],
  isLoading = false,
}) => {
  const [view, setView] = useState<BrowserView>('projects');
  const [selectedProject, setSelectedProject] = useState<FolderMetadata | null>(null);
  const [selectedStage, setSelectedStage] = useState<FolderMetadata | null>(null);
  const [stages, setStages] = useState<FolderMetadata[]>([]);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  // Filter items based on search query
  useEffect(() => {
    let items: any[] = [];

    switch (view) {
      case 'projects':
        items = projects;
        break;
      case 'stages':
        items = stages;
        break;
      case 'files':
        items = files;
        break;
    }

    if (!searchQuery.trim()) {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredItems(items.filter((item) => item.name.toLowerCase().includes(query)));
    }
  }, [searchQuery, view, projects, stages, files]);

  const handleSelectProject = (project: FolderMetadata) => {
    setSelectedProject(project);
    setStages([]); // Will be fetched in parent
    setView('stages');
    setSearchQuery('');
  };

  const handleSelectStage = (stage: FolderMetadata) => {
    setSelectedStage(stage);
    setFiles([]); // Will be fetched in parent
    setView('files');
    setSearchQuery('');
  };

  const handleSelectFile = (file: FileMetadata) => {
    onSelectFile?.(file);
    onClose?.();
  };

  const handleBack = () => {
    if (view === 'files') {
      setView('stages');
      setSelectedStage(null);
      setFiles([]);
    } else if (view === 'stages') {
      setView('projects');
      setSelectedProject(null);
      setStages([]);
    }
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copy from Project</DialogTitle>
          <DialogDescription>
            {view === 'projects' && 'Select a project'}
            {view === 'stages' && `${selectedProject?.name} - Select a stage`}
            {view === 'files' && `${selectedProject?.name} / ${selectedStage?.name}`}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        {view !== 'projects' && (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder={
                view === 'files'
                  ? 'Search files...'
                  : 'Search stages...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              {searchQuery ? 'No matches found' : 'No items available'}
            </p>
          ) : (
            <>
              {/* Back Button */}
              {view !== 'projects' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left mb-2"
                  onClick={handleBack}
                >
                  ← Back
                </Button>
              )}

              {/* Items List */}
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    if (view === 'projects') {
                      handleSelectProject(item);
                    } else if (view === 'stages') {
                      handleSelectStage(item);
                    } else {
                      handleSelectFile(item);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {view === 'files' ? (
                        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FolderOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {view === 'files' && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {view !== 'files' && <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
