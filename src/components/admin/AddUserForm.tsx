import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SiteSelector from './SiteSelector';
import { toast } from '@/components/ui/use-toast';
import { Mail } from 'lucide-react';

const AddUserForm = () => {
  const { allUsers, refreshUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'national_manager' | 'site_manager' | 'admin' | 'consultant'>('site_manager');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendInvitation = async () => {
    // Validation
    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if email exists (case-insensitive)
    // Note: This is a client-side check - the API will also validate
    const normalizedEmail = email.toLowerCase().trim();
    if (allUsers.some(u => u.email.toLowerCase() === normalizedEmail)) {
      toast({
        title: "Validation Error",
        description: `Email "${email}" already exists in the system`,
        variant: "destructive",
      });
      return;
    }

    if (role === 'site_manager' && selectedSites.length === 0) {
      toast({
        title: "Validation Error",
        description: "Site managers must have at least one site assigned",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.sendInvitation(
        email.trim(),
        role,
        role === 'national_manager' || role === 'admin' || role === 'consultant' ? [] : selectedSites
      );

      // Refresh users list to show the new pending user
      await refreshUsers();

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to "${email}". They can set their own password when they accept.`,
      });

      if (import.meta.env.DEV) {
        console.log('\n🔔 LOCAL DEVELOPMENT MODE:');
        console.log('📧 Invitation email has been logged to the API console');
        console.log('📍 Look for the invitation URL in the terminal where you ran "npm start" in the api folder\n');
      }

      // Reset form
      setEmail('');
      setSelectedSites([]);
      setRole('site_manager');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send User Invitation</CardTitle>
        <CardDescription>Invite a new user to join the platform - they will set their own password</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {import.meta.env.DEV && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Local Development Mode:</strong> Invitation emails are logged to your API console. Check the terminal where you ran <code>npm start</code> in the api folder.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select onValueChange={(value: any) => {
              setRole(value);
              if (value === 'national_manager' || value === 'admin') {
                setSelectedSites([]);
              }
            }} value={role}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="site_manager">Site Manager</SelectItem>
                <SelectItem value="national_manager">National Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="consultant">Consultant (LML)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
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

          <Alert>
            <AlertDescription className="text-xs">
              The user will receive an invitation email with a link to:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Set their own password</li>
                <li>Account will be pending your approval</li>
                <li>You'll approve them before they can log in</li>
              </ol>
              The invitation link expires in 7 days.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSendInvitation}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;
