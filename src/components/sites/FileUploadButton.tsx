import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { ProjectFile } from "@/types/data";
import { useToast } from "@/hooks/use-toast";

interface FileUploadButtonProps {
  onFilesUploaded: (files: ProjectFile[]) => void;
  existingFiles?: ProjectFile[];
  projectCode: string;
}

export const FileUploadButton = ({ 
  onFilesUploaded, 
  existingFiles = [],
  projectCode 
}: FileUploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newFiles: ProjectFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Convert file to data URL for persistence across page reloads
        // Blob URLs are temporary and invalid after page reload, causing PDF preview errors
        const fileUrl = await fileToDataUrl(file);

        const projectFile: ProjectFile = {
          id: `${projectCode}-${Date.now()}-${i}`,
          name: file.name,
          url: fileUrl, // Data URL persists across sessions
          dateUploaded: new Date().toISOString().split('T')[0],
          fileSize: formatFileSize(file.size),
          fileType: file.type || getFileTypeFromName(file.name),
          source: 'manual',
        };

        newFiles.push(projectFile);
      }

      // Combine with existing files
      const allFiles = [...existingFiles, ...newFiles];
      onFilesUploaded(allFiles);

      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${newFiles.length} file(s)`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeFromName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
    };
    return typeMap[ext || ''] || 'application/octet-stream';
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id={`file-upload-${projectCode}`}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Uploading...' : 'Upload Files'}
      </Button>
    </div>
  );
};

