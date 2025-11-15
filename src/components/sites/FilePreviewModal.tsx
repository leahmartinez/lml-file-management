import { ProjectFile } from "@/types/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, FileSpreadsheet, File } from "lucide-react";
import { useState, useEffect } from "react";

interface FilePreviewModalProps {
  file: ProjectFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FilePreviewModal = ({ file, open, onOpenChange }: FilePreviewModalProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (!file || !open) {
      setPreviewUrl(null);
      setError(null);
      setIframeError(false);
      return;
    }

    const fileName = file.name.toLowerCase();
    const isBlob = file.url.startsWith('blob:');
    const isDataUrl = file.url.startsWith('data:');
    const isExternal = file.url.startsWith('http');

    // Check if blob URL (invalid after page reload) or data URL (valid)
    if (isBlob && !isDataUrl) {
      setPreviewUrl(null);
      setError('File preview is no longer available. This file may need to be re-uploaded after closing the application.');
      setIframeError(false);
      return;
    }

    // For PDF files, use direct URL (blob, data URL, or external)
    if (fileName.endsWith('.pdf')) {
      setPreviewUrl(file.url);
      setError(null);
      setIframeError(false);
      return;
    }

    // For DOCX files, try to use Microsoft Office Online viewer
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      if (isBlob) {
        setPreviewUrl(null);
        setError('Preview not available for uploaded Word documents. Please download to view.');
        setIframeError(false);
        return;
      }
      if (isExternal) {
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;
        setPreviewUrl(officeViewerUrl);
        setError(null);
        setIframeError(false);
        return;
      }
      setPreviewUrl(null);
      setError('Preview not available. Please download to view.');
      setIframeError(false);
      return;
    }

    // For Excel files, try to use Microsoft Office Online viewer
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      if (isBlob) {
        // Blob URLs can't be previewed for Excel files
        setPreviewUrl(null);
        setError('Excel files cannot be previewed in the browser. Please download the file to view it.');
        setIframeError(false);
        return;
      }
      if (isExternal) {
        // Try Microsoft Office Online viewer
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;
        setPreviewUrl(officeViewerUrl);
        setError(null);
        setIframeError(false);
        return;
      }
      setPreviewUrl(null);
      setError('Preview not available. Please download to view.');
      setIframeError(false);
      return;
    }

    // For other file types, show download option
    setPreviewUrl(null);
    setError('Preview not available for this file type. Please download to view.');
    setIframeError(false);
  }, [file, open]);

  if (!file) return null;

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith('.pdf');
  const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  const isExternal = file.url.startsWith('http');

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-8 w-8 text-red-500" />;
    if (isDocx) return <FileText className="h-8 w-8 text-blue-500" />;
    if (isExcel) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon()}
            <span className="truncate">{file.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto min-h-0">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                asChild
                className="mt-4"
              >
                <a
                  href={file.url}
                  download
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            </div>
          ) : previewUrl && !iframeError ? (
            <div className="w-full h-full relative">
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[600px] border rounded"
                title={`Preview of ${file.name}`}
                frameBorder="0"
                onLoad={() => {
                  // Check if iframe loaded successfully
                  setIframeError(false);
                }}
                onError={() => {
                  // If iframe fails to load, show error
                  setIframeError(true);
                  if (isExcel) {
                    setError('Unable to load Excel preview. The file may need to be downloaded to view.');
                  } else {
                    setError('Unable to load preview. Please try downloading the file.');
                  }
                  setPreviewUrl(null);
                }}
              />
              {/* Fallback message if iframe doesn't load (for Excel files especially) */}
              {isExcel && (
                <div className="absolute bottom-4 left-4 right-4 bg-background/95 border rounded p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Note:</p>
                  <p>If the preview doesn't load, the file may require authentication or may not be publicly accessible. Try downloading the file or opening it in a new tab.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Loading preview...</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {file.fileSize && <span>Size: {file.fileSize}</span>}
            {file.dateUploaded && (
              <span className="ml-4">Uploaded: {file.dateUploaded}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
            >
              <a
                href={file.url}
                download
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
            {isExternal && (
              <Button
                variant="outline"
                asChild
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

