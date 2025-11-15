import { Download, Eye } from "lucide-react";

const FileListItem = ({ file }) => {
  if (!file || !file.name) return null;

  const isPdf = file.name.toLowerCase().endsWith(".pdf");

  return (
    <li className="grid grid-cols-4 p-4 border-b items-center">
      <div>{file.name}</div>
      <div>{file.dateUploaded}</div>
      <div>{file.fileSize}</div>
      <div className="flex justify-end items-center space-x-4">
        {isPdf && (
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <Eye className="h-5 w-5 text-primary" />
          </a>
        )}
        <a href={file.url} download>
          <Download className="h-5 w-5 text-primary" />
        </a>
      </div>
    </li>
  );
};

export default FileListItem;
