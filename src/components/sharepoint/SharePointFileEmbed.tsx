/**
 * SharePoint File Embed Component
 * Embeds Office Online viewer for Word, Excel, and PowerPoint files
 */

import React, { useEffect, useState } from 'react';
import { FileMetadata } from '@/services/graphService';
import { X, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPdf } from '@/utils/fileUtils';

interface SharePointFileEmbedProps {
  file: FileMetadata | null;
  isOpen?: boolean;
  onClose?: () => void;
  embedUrl?: string;
}

export const SharePointFileEmbed: React.FC<SharePointFileEmbedProps> = ({
  file,
  isOpen = true,
  onClose,
  embedUrl: providedEmbedUrl,
}) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(providedEmbedUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use providedEmbedUrl if available, otherwise construct from webUrl
  useEffect(() => {
    if (providedEmbedUrl) {
      setEmbedUrl(providedEmbedUrl);
    } else if (file) {
      // For PDFs and files without embed URL, use webUrl
      if (isPdf(file.name)) {
        setEmbedUrl(file.webUrl);
      } else {
        // For Office documents, construct Office Online embed URL
        // This is a fallback - the service should provide the proper embed URL
        const encodedUrl = encodeURIComponent(file.webUrl);
        setEmbedUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`);
      }
    }
  }, [file, providedEmbedUrl]);

  if (!isOpen || !file) return null;

  const isPdfFile = isPdf(file.name);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate" title={file.name}>
              {file.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Last modified: {new Date(file.lastModifiedDateTime).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(file.webUrl, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement('a');
                a.href = file.webUrl;
                a.download = file.name;
                a.click();
              }}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} title="Close">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <a
                    href={file.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open file in SharePoint
                  </a>
                </p>
              </div>
            </div>
          )}

          {isLoading && !error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Loading file...</p>
              </div>
            </div>
          )}

          {embedUrl && !error && (
            <>
              {isPdfFile ? (
                // PDF viewer using browser's native PDF viewer
                <iframe
                  src={`${embedUrl}#toolbar=1`}
                  className="w-full h-full border-0"
                  onError={() => setError('Failed to load PDF')}
                  onLoad={() => setIsLoading(false)}
                  title={file.name}
                />
              ) : (
                // Office Online embed viewer
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  onError={() => setError('Failed to load file viewer')}
                  onLoad={() => setIsLoading(false)}
                  title={file.name}
                  allowFullScreen
                />
              )}
            </>
          )}

          {!embedUrl && !error && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">No embed URL available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <a
                    href={file.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open in SharePoint
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
