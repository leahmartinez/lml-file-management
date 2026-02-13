import React, { useState } from 'react';
import { useAuth, User } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SiteSelector from './SiteSelector';
import { toast } from '@/components/ui/use-toast';
import { useUpdateUserMutation } from '@/hooks/useQueryHooks';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose }) => {
  const [role, setRole] = useState(user.role);
  const [selectedSites, setSelectedSites] = useState<string[]>(user.sites);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // React Query mutation for updating users - automatically handles loading and cache updates
  const updateMutation = useUpdateUserMutation();

  const handleUpdateUser = async () => {
    // Validation
    if (role === 'site_manager' && selectedSites.length === 0) {
      toast({
        title: "Validation Error",
        description: "Site managers must have at least one site assigned",
        variant: "destructive",
      });
      return;
    }

    if (newPassword && newPassword.length < 4) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 4 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates: any = {
        role,
        sites: role === 'national_manager' || role === 'admin' || role === 'super_admin' || role === 'consultant' ? [] : selectedSites,
      };

      // Only include password if provided
      if (newPassword) {
        updates.password = newPassword;
      }

      await updateMutation.mutateAsync({ email: user.email, updates });

      toast({
        title: "Success",
        description: `User "${user.email}" has been updated successfully`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = (newRole: 'super_admin' | 'national_manager' | 'site_manager' | 'admin' | 'consultant') => {
    setRole(newRole);
    if (newRole === 'national_manager' || newRole === 'admin' || newRole === 'super_admin' || newRole === 'consultant') {
      setSelectedSites([]);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User: {user.email}</DialogTitle>
          <DialogDescription>
            Update user permissions, site access, and password
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permissions">Permissions & Sites</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="permissions" className="space-y-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value: any) => handleRoleChange(value)} value={role}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site_manager">Site Manager</SelectItem>
                  <SelectItem value="national_manager">National Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="consultant">Consultant (LML)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {role === 'super_admin' && 'Super admins have full access plus can edit all user profiles and manage system settings'}
                {role === 'admin' && 'Admins have full access to all sites and features'}
                {role === 'national_manager' && 'National managers can view all sites'}
                {role === 'site_manager' && 'Site managers can only view assigned sites'}
                {role === 'consultant' && 'Consultants can upload files, add sites, and edit site details'}
              </p>
            </div>

            {(role === 'site_manager') && (
              <div>
                <SiteSelector 
                  selectedSites={selectedSites} 
                  onSitesChange={setSelectedSites} 
                />
              </div>
            )}

            {(role === 'national_manager' || role === 'admin' || role === 'super_admin' || role === 'consultant') && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  {role === 'super_admin'
                    ? 'Super admins have access to all sites and can edit all user profiles.'
                    : role === 'admin'
                    ? 'Admins have access to all sites automatically.'
                    : role === 'consultant'
                    ? 'Consultants have access to all sites and can manage them.'
                    : 'National managers have access to all sites automatically.'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank if you don't want to change the password
              </p>
            </div>

            {newPassword && (
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
