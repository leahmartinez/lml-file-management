import React, { useCallback, useEffect, useState, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot, EditorState, $getSelection, $isRangeSelection, $createParagraphNode, $createTextNode } from 'lexical';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import {
  BeautifulMentionNode,
  BeautifulMentionsPlugin,
} from 'lexical-beautiful-mentions';
import { MentionableUser } from '@/components/MentionAutocomplete';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  onImageUpload?: (imageUrl: string) => void;
  availableUsers?: MentionableUser[];
}

// Enhanced toolbar with Jira/Confluence style
// Custom mention menu component for BeautifulMentionsPlugin
const MentionMenu = React.forwardRef((props: any, ref: any) => {
  const { style, children, loading, ...restProps } = props;
  return (
    <ul
      ref={ref}
      {...restProps}
      style={{
        ...style,
        position: 'absolute',
        zIndex: 50,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '0',
        margin: '0',
        listStyle: 'none',
        minWidth: '320px',
        maxHeight: '300px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {children}
    </ul>
  );
});

MentionMenu.displayName = 'MentionMenu';

const MentionMenuItem = React.forwardRef((props: any, ref: any) => {
  const { item, selected, label, itemValue, loading, ...restProps } = props;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...restProps}
      style={{
        display: 'block',
        width: '100%',
        padding: '0.625rem 1rem',
        margin: 0,
        listStyle: 'none',
        border: 'none',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: isHovered || selected ? '#f3f4f6' : '#ffffff',
        color: '#1f2937',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'background-color 150ms ease',
      }}
    >
      {label}
    </li>
  );
});

MentionMenuItem.displayName = 'MentionMenuItem';

const EditorToolbar = ({ onImageUpload }: { onImageUpload?: (imageUrl: string) => void }) => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Update toolbar state when selection changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          setIsStrikethrough(selection.hasFormat('strikethrough'));
        }
      });
    });
  }, [editor]);

  const toggleFormat = (format: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.toggleFormat(format);
      }
    });
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;

    // Just close the dialog for now - link insertion requires more setup
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;

    if (onImageUpload) {
      onImageUpload(imageUrl);
    }

    setShowImageDialog(false);
    setImageUrl('');
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageUrl(result);
        if (onImageUpload) {
          onImageUpload(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="lexical-toolbar">
        {/* Text Formatting Group */}
        <div className="toolbar-group">
          <Button
            variant={isBold ? 'default' : 'outline'}
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat('bold');
            }}
            title="Bold (Ctrl+B)"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant={isItalic ? 'default' : 'outline'}
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat('italic');
            }}
            title="Italic (Ctrl+I)"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            variant={isUnderline ? 'default' : 'outline'}
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat('underline');
            }}
            title="Underline (Ctrl+U)"
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <Button
            variant={isStrikethrough ? 'default' : 'outline'}
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat('strikethrough');
            }}
            title="Strikethrough"
            className="h-8 w-8 p-0"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat('code');
            }}
            title="Code"
            className="h-8 w-8 p-0"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="toolbar-divider" />

        {/* List Group */}
        <div className="toolbar-group">
          <Button
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.dispatchCommand('TOGGLE_BULLET_LIST', undefined);
            }}
            title="Bullet List"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.dispatchCommand('TOGGLE_ORDERED_LIST', undefined);
            }}
            title="Ordered List"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <div className="toolbar-divider" />

        {/* Additional Features Group */}
        <div className="toolbar-group">
          <Button
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowImageDialog(true);
            }}
            title="Insert Image"
            className="h-8 w-8 p-0"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="image-url">Image URL or File</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">Or upload a file:</div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileSelect}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Content wrapper with toolbar
const RichTextEditorContent = (props: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Apply mention styling using DOM observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Find contenteditable within this specific editor instance
      const editor = editorRef.current?.querySelector('.lexical-content-editable');
      if (!editor) return;

      // Look for elements that might be mentions (spans with @ prefix)
      const allSpans = editor.querySelectorAll('span');
      allSpans.forEach((span) => {
        const text = span.textContent || '';
        // Check if this looks like a mention (starts with @)
        if (text.startsWith('@') && !span.classList.contains('mention')) {
          // Apply mention styling
          span.classList.add('mention');
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  const onChangeCallback = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();

        // Get HTML from the contenteditable element - use ref to get the specific instance
        const contentEditable = editorRef.current?.querySelector('.lexical-content-editable');
        let html = contentEditable?.innerHTML || '';

        // Ensure all mentions have the mention class for proper display when posted
        if (html) {
          // Use regex to find and replace @ mentions with properly classed spans
          // First, wrap any @Name patterns in mention class if not already wrapped
          html = html.replace(
            /(?<!class="[^"]*mention[^"]*")>(@[^\s<]+)/g,
            ' class="mention">$1'
          );

          // Also handle spans that contain mentions but don't have the class yet
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const allElements = tempDiv.querySelectorAll('*');

          allElements.forEach((el) => {
            const text = el.textContent || '';
            // If element contains @ pattern and doesn't have mention class, add it
            if (
              text.includes('@') &&
              !el.classList.contains('mention') &&
              (el.tagName === 'SPAN' || el.tagName === 'EM' || el.tagName === 'STRONG')
            ) {
              // Check if this is a leaf node (mostly text content, no complex structure)
              let textRatio = 0;
              if (el.childNodes.length === 0) {
                textRatio = 1; // Pure text node
              } else {
                const textLength = text.length;
                let directTextLength = 0;
                for (const child of el.childNodes) {
                  if (child.nodeType === 3) {
                    directTextLength += (child.textContent || '').length;
                  }
                }
                textRatio = directTextLength / textLength || 0;
              }

              // If mostly text content, add mention class
              if (textRatio > 0.5) {
                el.classList.add('mention');
              }
            }
          });

          html = tempDiv.innerHTML;
        }

        props.onChange(html, text);
      });
    },
    [props.onChange]
  );

  const handleMentionClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // Check if it's a mention - try multiple selectors
    const isMention =
      target.classList.contains('mention') ||
      target.classList.contains('beautiful-mention') ||
      target.closest('[data-lexical-node-type="beautiful-mention"]');

    if (isMention) {
      const mentionText = target.textContent;
      const user = props.availableUsers?.find(
        (u) => u.name === mentionText || `${u.firstName} ${u.lastName}`.trim() === mentionText
      );
      // Could implement profile navigation here in the future
    }
  }, [props.availableUsers]);

  return (
    <>
      <EditorToolbar onImageUpload={props.onImageUpload} />
      <div ref={editorRef} className="lexical-editor" onClick={handleMentionClick}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="lexical-content-editable" />
          }
          placeholder={
            props.placeholder ? (
              <div className="lexical-placeholder">{props.placeholder}</div>
            ) : null
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <BeautifulMentionsPlugin
          items={{
            '@': props.availableUsers?.map((user) => ({
              value: user.name || `${user.firstName} ${user.lastName}`.trim(),
              email: user.email,
              name: user.name || `${user.firstName} ${user.lastName}`.trim(),
            })) || [],
          }}
          menuComponent={MentionMenu}
          menuItemComponent={MentionMenuItem}
          menuAnchorClassName="mention-menu-anchor"
        />
        <OnChangePlugin onChange={onChangeCallback} />
      </div>
    </>
  );
};

export const RichTextEditor = (props: RichTextEditorProps) => {
  // Add inline styles for mention and menu styling
  React.useEffect(() => {
    // Mention pill styling
    const mentionStyleId = 'lexical-mention-styles';
    if (!document.getElementById(mentionStyleId)) {
      const style = document.createElement('style');
      style.id = mentionStyleId;
      style.textContent = `
        .mention {
          background-color: #0052cc !important;
          color: #ffffff !important;
          padding: 3px 8px !important;
          border-radius: 3px !important;
          font-weight: 500 !important;
          font-size: 0.95em !important;
          cursor: pointer !important;
          display: inline-block !important;
          white-space: nowrap !important;
        }
        .mention:hover {
          background-color: #0039a6 !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Menu styling override - inject after a short delay to ensure library styles are loaded
    const menuStyleId = 'beautiful-mentions-menu-override';
    if (!document.getElementById(menuStyleId)) {
      setTimeout(() => {
        const style = document.createElement('style');
        style.id = menuStyleId;
        // Use extremely high specificity to override library styles
        style.textContent = `
          ul[class*="beautiful-mentions-menu"] li[class*="beautiful-mentions-menu-item"],
          ul.beautiful-mentions-menu li.beautiful-mentions-menu-item {
            background-color: transparent !important;
            background: transparent !important;
            color: #1f2937 !important;
          }

          ul[class*="beautiful-mentions-menu"] li[class*="beautiful-mentions-menu-item"]:hover,
          ul.beautiful-mentions-menu li.beautiful-mentions-menu-item:hover {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
          }
        `;
        document.head.appendChild(style);
      }, 100);
    }
  }, []);

  const initialConfig = {
    namespace: 'RichTextEditor',
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      QuoteNode,
      CodeNode,
      BeautifulMentionNode,
    ],
    theme: {
      paragraph: 'lexical-paragraph',
      heading: {
        h1: 'lexical-heading-h1',
        h2: 'lexical-heading-h2',
        h3: 'lexical-heading-h3',
      },
      list: {
        nested: {
          listitem: 'lexical-nested-listitem',
        },
        ol: 'lexical-ol',
        ul: 'lexical-ul',
        listitem: 'lexical-listitem',
      },
      link: 'lexical-link',
      quote: 'lexical-quote',
      code: 'lexical-code',
      text: {
        bold: 'lexical-text-bold',
        italic: 'lexical-text-italic',
        underline: 'lexical-text-underline',
        strikethrough: 'lexical-text-strikethrough',
        code: 'lexical-text-code',
      },
      'beautiful-mention': 'mention', // Maps BeautifulMentionNode to .mention CSS class
    },
    onError: (error: Error) => console.error('Lexical Error:', error),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor-wrapper">
        <RichTextEditorContent {...props} />
      </div>
    </LexicalComposer>
  );
};
