import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { InvoiceStatus } from '@/types/data';

interface InvoiceStatusBadgeProps {
  status?: InvoiceStatus;
}

const InvoiceStatusBadgeComponent = ({ status }: InvoiceStatusBadgeProps) => {
  if (!status) {
    return (
      <Badge variant="outline" className="text-xs font-medium">
        Unknown
      </Badge>
    );
  }

  switch (status) {
    case 'Not Ready':
      return (
        <Badge variant="outline" className="text-xs font-medium bg-slate-50 text-slate-700 border-slate-200">
          Not Ready
        </Badge>
      );
    case 'Ready for Invoice':
      return (
        <Badge className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
          Ready
        </Badge>
      );
    case 'Invoiced':
      return (
        <Badge className="text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          ✓ Invoiced
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {status}
        </Badge>
      );
  }
};

export const InvoiceStatusBadge = memo(InvoiceStatusBadgeComponent);
