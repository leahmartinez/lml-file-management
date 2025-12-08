import { Editor } from '@tinymce/tinymce-react';
import { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  onImageUpload?: (imageUrl: string) => void;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Add a comment or update...',
  onImageUpload,
}: RichTextEditorProps) => {
  const editorRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const initialValueRef = useRef(value); // Keep initial value constant to prevent cursor jumping

  // Update editor content only when it needs to be cleared (from parent)
  useEffect(() => {
    if (editorRef.current && initializedRef.current) {
      // Only update if the value is empty (clearing after post) to avoid disrupting user input
      if (value === '' && editorRef.current.getContent() !== '') {
        editorRef.current.setContent('');
      }
    }
  }, [value]);

  return (
    <Editor
      ref={editorRef}
      apiKey={import.meta.env.VITE_TINYMCE_API_KEY || "no-api-key"}
      initialValue={initialValueRef.current}
      init={{
        height: 300,
        menubar: false,
        promotion: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'paste', 'help', 'wordcount'
        ],
        toolbar: `
          undo redo | formatselect | bold italic underline strikethrough |
          forecolor backcolor | alignleft aligncenter alignright alignjustify |
          bullist numlist outdent indent | link image media table |
          removeformat | help
        `,
        content_style: `
          body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
          table { border-collapse: collapse; width: 100%; }
          table, th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f5f5f5; }
        `,
        setup: (editor: any) => {
          editor.ui.registry.addButton('insertdate', {
            text: 'Insert Date',
            onAction: () => {
              const date = new Date().toLocaleDateString();
              editor.insertContent(date);
            },
          });
        },
        formats: {
          styleselect: [
            { title: 'Paragraph', format: 'p' },
            { title: 'Heading 1', format: 'h1' },
            { title: 'Heading 2', format: 'h2' },
            { title: 'Heading 3', format: 'h3' },
          ],
        },
        file_picker_callback: (callback: any) => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                callback(imageUrl, { alt: file.name });
                onImageUpload?.(imageUrl);
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
        },
      }}
      onEditorChange={(content) => {
        const text = editorRef.current?.getContent({ format: 'text' }) || '';
        onChange(content, text);
      }}
      onInit={(evt, editor) => {
        editorRef.current = editor;
        initializedRef.current = true;
      }}
    />
  );
};
