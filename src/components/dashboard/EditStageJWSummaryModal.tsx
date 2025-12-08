/**
 * EditStageJWSummaryModal Component
 * Allows editing of stage-level JW Summary (Project Type)
 * Stage-level type overrides project-level type for that specific stage
 */

import { useState, useEffect } from 'react';
import { ProjectStage, ProjectType } from '@/types/data';
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

interface EditStageJWSummaryModalProps {
  stage: ProjectStage | null;
  projectType?: ProjectType; // Fallback project-level type
  isOpen: boolean;
  onClose: () => void;
  onSave: (stageId: string, projectType: ProjectType, customProjectType?: string) => void;
}

export const EditStageJWSummaryModal = ({
  stage,
  projectType: projectLevelType,
  isOpen,
  onClose,
  onSave,
}: EditStageJWSummaryModalProps) => {
  const { toast } = useToast();
  const [stageProjectType, setStageProjectType] = useState<ProjectType | 'Other'>('Upgrade');
  const [customProjectType, setCustomProjectType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when stage changes
  useEffect(() => {
    if (stage) {
      setStageProjectType((stage.projectType || 'Upgrade') as ProjectType | 'Other');
      setCustomProjectType(stage.customProjectType || '');
    }
  }, [stage, isOpen]);

  const handleSave = async () => {
    if (!stage) return;

    if (stageProjectType === 'Other' && !customProjectType.trim()) {
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
        stage.id,
        stageProjectType as ProjectType,
        customProjectType || undefined
      );
      toast({
        title: 'Success',
        description: `${stage.name} JW Summary updated successfully`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update stage JW Summary',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentDisplay = stage?.customProjectType || stage?.projectType || projectLevelType || 'Not set';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Stage JW Summary</DialogTitle>
          <DialogDescription>
            Update the project type for <span className="font-mono font-semibold">{stage?.name}</span> stage.
            This overrides the project-level JW Summary for this stage only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Code Display */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Project Code
            </Label>
            <div className="font-mono font-bold text-lg text-primary mt-2">{stage?.projectCode}</div>
          </div>

          {/* Stage Name Display */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Stage Name
            </Label>
            <div className="font-medium text-base mt-2">{stage?.name}</div>
          </div>

          {/* Project Type Selection */}
          <div>
            <Label htmlFor="projectType" className="text-sm font-semibold">
              Project Type (JW Summary)
            </Label>
            <Select
              value={stageProjectType}
              onValueChange={(value) => setStageProjectType(value as ProjectType | 'Other')}
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
          {stageProjectType === 'Other' && (
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
          {stage && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Current JW Summary
              </div>
              <div className="mt-2 font-medium">{currentDisplay}</div>
              {stage.projectType && !stage.customProjectType && (
                <div className="text-xs text-muted-foreground mt-1">
                  (Using project-level type)
                </div>
              )}
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
