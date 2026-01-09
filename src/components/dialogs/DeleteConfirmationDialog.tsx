import { useState } from 'react';
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

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  itemName?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Jira-style confirmation dialog for destructive actions
 * Requires user to type "delete" to confirm permanent deletion
 */
export const DeleteConfirmationDialog = ({
  isOpen,
  title,
  description,
  itemName,
  isLoading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) => {
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {itemName && (
            <div className="p-3 bg-destructive/10 rounded border border-destructive/20">
              <p className="text-sm">
                <span className="font-semibold">Item:</span> {itemName}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="delete-confirm" className="text-sm font-medium">
              Type <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded">delete</span> to confirm permanent deletion
            </label>
            <Input
              id="delete-confirm"
              type="text"
              placeholder='Type "delete" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="border-destructive/30 focus:border-destructive"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-xs text-amber-800">
              ⚠️ This action <span className="font-semibold">cannot be undone</span>. All related items will be permanently deleted.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
