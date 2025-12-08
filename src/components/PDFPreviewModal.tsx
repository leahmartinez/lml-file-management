import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

export const PDFPreviewModal = ({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
}: PDFPreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <DialogTitle className="truncate">{fileName}</DialogTitle>
          <a href={pdfUrl} download={fileName}>
            <Button size="sm" variant="outline" title="Download">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
        </DialogHeader>
        <div className="w-full flex-1 overflow-auto">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-[70vh] border-0"
            title={fileName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
