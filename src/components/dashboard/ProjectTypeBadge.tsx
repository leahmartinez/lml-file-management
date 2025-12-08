import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ProjectType } from '@/types/data';

interface ProjectTypeBadgeProps {
  type?: ProjectType;
  customType?: string;
}

const ProjectTypeBadgeComponent = ({ type, customType }: ProjectTypeBadgeProps) => {
  const displayText = customType || type || 'Unknown';

  if (!type && !customType) {
    return (
      <Badge variant="outline" className="text-xs font-medium">
        Unspecified
      </Badge>
    );
  }

  // Color coding based on project type - softer, more elegant colors
  let colorClass = 'bg-blue-50 text-blue-700 border-blue-200';

  switch (type) {
    case 'Upgrade':
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'MACA':
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'CMA':
      colorClass = 'bg-pink-50 text-pink-700 border-pink-200';
      break;
    case 'Desktop Review':
      colorClass = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;
    case 'Other':
      colorClass = 'bg-slate-50 text-slate-700 border-slate-200';
      break;
  }

  return (
    <Badge className={`text-xs font-medium ${colorClass}`}>{displayText}</Badge>
  );
};

export const ProjectTypeBadge = memo(ProjectTypeBadgeComponent);
