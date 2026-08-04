/**
 * Session-wide file "clipboard" - copy a file while browsing one stage/project,
 * paste it while browsing a completely different one. Mirrors how copy/paste works
 * in a real OS file explorer (SharePoint, Windows Explorer, Finder), rather than being
 * scoped to a single component instance.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { FileMetadata } from '@/services/graphService';

interface ClipboardItem {
  item: FileMetadata;
  sourceFolderPath: string;
}

interface FileClipboardContextType {
  clipboard: ClipboardItem | null;
  copy: (item: FileMetadata, sourceFolderPath: string) => void;
  clear: () => void;
}

const FileClipboardContext = createContext<FileClipboardContextType | undefined>(undefined);

export const FileClipboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const copy = useCallback((item: FileMetadata, sourceFolderPath: string) => {
    setClipboard({ item, sourceFolderPath });
  }, []);

  const clear = useCallback(() => setClipboard(null), []);

  return (
    <FileClipboardContext.Provider value={{ clipboard, copy, clear }}>
      {children}
    </FileClipboardContext.Provider>
  );
};

export const useFileClipboard = (): FileClipboardContextType => {
  const context = useContext(FileClipboardContext);
  if (!context) {
    throw new Error('useFileClipboard must be used within a FileClipboardProvider');
  }
  return context;
};
