/**
 * Compact inline "type a name, confirm" control.
 * Shared by rename, "New Folder", and "New file" (Word/Excel/PowerPoint) flows so the
 * interaction (and validation) is written once instead of three times.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

// Characters SharePoint/Graph API reject in file and folder names.
const INVALID_NAME_CHARS = /[*"\\/:?<>|]/;

interface InlineNameInputProps {
  initialValue?: string;
  placeholder?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  className?: string;
}

export function validateItemName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required";
  if (INVALID_NAME_CHARS.test(trimmed)) return 'Name cannot contain * " \\ / : ? < > |';
  return null;
}

export const InlineNameInput: React.FC<InlineNameInputProps> = ({
  initialValue = "",
  placeholder = "Enter a name",
  onConfirm,
  onCancel,
  className,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const validationError = validateItemName(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    onConfirm(value.trim());
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          onFocus={(e) => e.target.select()}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleConfirm} title="Confirm">
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancel} title="Cancel">
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};
