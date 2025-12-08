/**
 * View Selector Component
 * Radio group for switching between dashboard view types
 */

import React from 'react';
import { VIEW_CONFIGS, ViewType } from '@/components/dashboard/views/viewConfigs';
import { Label } from '@/components/ui/label';

interface ViewSelectorProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ activeView, onViewChange }) => {
  const views = Object.values(VIEW_CONFIGS);

  return (
    <div className="space-y-3 pb-4 border-b border-border/30">
      <Label className="text-sm font-semibold text-foreground">VIEW</Label>
      <div className="space-y-2">
        {views.map((view) => (
          <div key={view.id} className="flex items-start gap-2">
            <input
              type="radio"
              id={`view-${view.id}`}
              name="dashboard-view"
              value={view.id}
              checked={activeView === view.id}
              onChange={() => onViewChange(view.id)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <label htmlFor={`view-${view.id}`} className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-foreground">{view.label}</div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

ViewSelector.displayName = 'ViewSelector';
