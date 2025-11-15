import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

const FileCard = ({ file }) => {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <span>{file.name}</span>
        <a href={file.url} download>
          <Download className="h-5 w-5 text-primary" />
        </a>
      </CardContent>
    </Card>
  );
};

export default FileCard;
