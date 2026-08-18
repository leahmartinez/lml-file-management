/**
 * Session-wide file "clipboard" - copy or cut a file while browsing one stage/project,
 * paste it while browsing a completely different one (or a different folder within the
 * same stage). Mirrors how copy/paste and cut/paste work in a real OS file explorer
 * (SharePoint, Windows Explorer, Finder), rather than being scoped to a single component.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { FileMetadata } from '@/services/graphService';

type ClipboardMode = 'copy' | 'move';

interface ClipboardItem {
  item: FileMetadata;
  sourceFolderPath: string;
  mode: ClipboardMode;
}

interface FileClipboardContextType {
  clipboard: ClipboardItem | null;
  copy: (item: FileMetadata, sourceFolderPath: string) => void;
  cut: (item: FileMetadata, sourceFolderPath: string) => void;
  clear: () => void;
}

const FileClipboardContext = createContext<FileClipboardContextType | undefined>(undefined);

export const FileClipboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const copy = useCallback((item: FileMetadata, sourceFolderPath: string) => {
    setClipboard({ item, sourceFolderPath, mode: 'copy' });
  }, []);

  const cut = useCallback((item: FileMetadata, sourceFolderPath: string) => {
    setClipboard({ item, sourceFolderPath, mode: 'move' });
  }, []);

  const clear = useCallback(() => setClipboard(null), []);

  return (
    <FileClipboardContext.Provider value={{ clipboard, copy, cut, clear }}>
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
