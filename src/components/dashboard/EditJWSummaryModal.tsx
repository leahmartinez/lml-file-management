/**
 * EditJWSummaryModal Component
 * Allows editing of project-level JW Summary (Project Type)
 * Changes apply to the entire project across all stages
 */

import { useState, useEffect } from 'react';
import { Project, ProjectType } from '@/types/data';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const PROJECT_TYPES: ProjectType[] = ['Upgrade', 'MACA', 'CMA', 'Desktop Review', 'Other'];

interface EditJWSummaryModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectCode: string, projectType: ProjectType, customProjectType?: string) => void;
}

export const EditJWSummaryModal = ({
  project,
  isOpen,
  onClose,
  onSave,
}: EditJWSummaryModalProps) => {
  const { toast } = useToast();
  const [projectType, setProjectType] = useState<ProjectType | 'Other'>('Upgrade');
  const [customProjectType, setCustomProjectType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setProjectType((project.projectType || 'Upgrade') as ProjectType | 'Other');
      setCustomProjectType(project.customProjectType || '');
    }
  }, [project, isOpen]);

  const handleSave = async () => {
    if (!project) return;

    if (projectType === 'Other' && !customProjectType.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a custom project type',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      onSave(
        project.projectCode,
        projectType as ProjectType,
        customProjectType || undefined
      );
      toast({
        title: 'Success',
        description: 'JW Summary updated successfully',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update JW Summary',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit JW Summary</DialogTitle>
          <DialogDescription>
            Update the project type for <span className="font-mono font-semibold">{project?.projectCode}</span>.
            Changes will apply to all stages in this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Code Display */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Project Code
            </Label>
            <div className="font-mono font-bold text-lg text-primary mt-2">{project?.projectCode}</div>
          </div>

          {/* Project Type Selection */}
          <div>
            <Label htmlFor="projectType" className="text-sm font-semibold">
              Project Type (JW Summary)
            </Label>
            <Select
              value={projectType}
              onValueChange={(value) => setProjectType(value as ProjectType | 'Other')}
            >
              <SelectTrigger id="projectType" className="mt-2">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Type Input (shown only when "Other" is selected) */}
          {projectType === 'Other' && (
            <div>
              <Label htmlFor="customType" className="text-sm font-semibold">
                Custom Project Type
              </Label>
              <Input
                id="customType"
                placeholder="Enter custom project type"
                value={customProjectType}
                onChange={(e) => setCustomProjectType(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          {/* Current Value Display */}
          {project && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Current JW Summary
              </div>
              <div className="mt-2 font-medium">
                {project.customProjectType || project.projectType || 'Not set'}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
