import { useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useAuth, User } from '@/hooks/useAuth';
import { useProposalTemplates } from '@/hooks/useProposalTemplates';
import { ProposalTemplate } from '@/types/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Shield, Edit, Trash2, UserPlus, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, allUsers, updateUsers, refreshUsers } = useAuth();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useProposalTemplates();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as User['role'],
    sites: [] as string[],
  });

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    stages: [] as Array<{ name: string; price?: number }>,
  });

  const isAdmin = user?.role === 'admin';

  const getRoleBadgeClass = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'user':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      default:
        return '';
    }
  };

  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'user':
        return 'User';
      default:
        return role;
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'user',
      sites: [],
    });
  };

  const handleAddUser = () => {
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    // Check if user already exists
    if (allUsers.find(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      toast({
        title: "Error",
        description: "A user with this email already exists",
        variant: "destructive",
      });
      return;
    }

    const newUser: User = {
      email: formData.email,
      role: formData.role,
      sites: formData.sites,
      createdAt: new Date().toISOString(),
      createdBy: user?.email,
    };

    // Add user to localStorage (mock implementation)
    const updatedUsers = [...allUsers, newUser];
    localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));

    // Refresh users list
    refreshUsers();

    toast({
      title: "Success",
      description: `User ${formData.email} has been added`,
    });

    resetForm();
    setIsAddModalOpen(false);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;

    const updatedUsers = allUsers.map(u =>
      u.email === selectedUser.email
        ? { ...u, role: formData.role, sites: formData.sites }
        : u
    );

    // Update in localStorage
    localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));

    // Refresh users list
    refreshUsers();

    toast({
      title: "Success",
      description: `User ${selectedUser.email} has been updated`,
    });

    setIsEditModalOpen(false);
    setSelectedUser(null);
    resetForm();
  };

  const openEditModal = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      role: userToEdit.role,
      sites: userToEdit.sites || [],
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.email === user?.email) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user ${userToDelete.email}?`)) {
      const updatedUsers = allUsers.filter(u => u.email !== userToDelete.email);

      // Update in localStorage
      localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));

      // Refresh users list
      refreshUsers();

      toast({
        title: "Success",
        description: `User ${userToDelete.email} has been deleted`,
      });
    }
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      stages: [],
    });
  };

  const handleAddTemplate = () => {
    if (!templateFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (templateFormData.stages.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one stage is required",
        variant: "destructive",
      });
      return;
    }

    const newTemplate = addTemplate({
      name: templateFormData.name,
      description: templateFormData.description,
      stages: templateFormData.stages,
      createdBy: user?.email || 'unknown',
    });

    if (newTemplate) {
      toast({
        title: "Success",
        description: `Template "${templateFormData.name}" has been created`,
      });
      resetTemplateForm();
      setIsAddTemplateModalOpen(false);
    }
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;

    if (!templateFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (templateFormData.stages.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one stage is required",
        variant: "destructive",
      });
      return;
    }

    const success = updateTemplate(selectedTemplate.id, {
      name: templateFormData.name,
      description: templateFormData.description,
      stages: templateFormData.stages,
    });

    if (success) {
      toast({
        title: "Success",
        description: `Template "${templateFormData.name}" has been updated`,
      });
      setIsEditTemplateModalOpen(false);
      setSelectedTemplate(null);
      resetTemplateForm();
    }
  };

  const openEditTemplateModal = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description,
      stages: [...template.stages],
    });
    setIsEditTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (template: ProposalTemplate) => {
    if (window.confirm(`Are you sure you want to delete template "${template.name}"?`)) {
      if (deleteTemplate(template.id)) {
        toast({
          title: "Success",
          description: `Template "${template.name}" has been deleted`,
        });
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-600" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground mt-2">
                You need admin privileges to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users and system settings
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Proposal Templates Section */}
        <div className="flex items-center justify-between mt-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Proposal Templates
            </h2>
            <p className="text-muted-foreground mt-1">
              Create and manage proposal templates with pre-defined stages
            </p>
          </div>
          <Button onClick={() => setIsAddTemplateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Templates ({templates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates created yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddTemplateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Stages</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-md truncate text-sm text-muted-foreground">{template.description}</TableCell>
                        <TableCell>
                          <span className="text-sm">{template.stages.length} stage{template.stages.length !== 1 ? 's' : ''}</span>
                        </TableCell>
                        <TableCell>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditTemplateModal(template)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTemplate(template)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Users ({allUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
                      <TableRow key={u.email}>
                        <TableCell className="font-medium">
                          {u.email}
                          {u.email === user?.email && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeClass(u.role)}>
                            {getRoleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.sites && u.sites.length > 0 ? (
                            <span className="text-sm">{u.sites.length} site{u.sites.length !== 1 ? 's' : ''}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">All sites</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(u)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {u.email !== user?.email && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(u)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedUser(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Update user details and permissions' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                disabled={isEditModalOpen}
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as User['role'] })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">
                Role Permissions:
              </Label>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• <strong>User:</strong> Full feature access</li>
                <li>• <strong>Admin:</strong> Full feature access + user management</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedUser(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={isEditModalOpen ? handleEditUser : handleAddUser}>
              {isEditModalOpen ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Template Modal */}
      <Dialog open={isAddTemplateModalOpen || isEditTemplateModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddTemplateModalOpen(false);
          setIsEditTemplateModalOpen(false);
          setSelectedTemplate(null);
          resetTemplateForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditTemplateModalOpen ? 'Edit Template' : 'Create Proposal Template'}</DialogTitle>
            <DialogDescription>
              {isEditTemplateModalOpen ? 'Update template details and stages' : 'Define a new proposal template with pre-configured stages'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                placeholder="e.g., Standard Lift Consultancy"
              />
            </div>

            <div>
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                placeholder="Describe the purpose of this template..."
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-3 block">Stages *</Label>
              <div className="space-y-3">
                {templateFormData.stages.map((stage, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">Stage Name</Label>
                        <Input
                          type="text"
                          value={stage.name}
                          onChange={(e) => {
                            const updatedStages = [...templateFormData.stages];
                            updatedStages[index].name = e.target.value;
                            setTemplateFormData({ ...templateFormData, stages: updatedStages });
                          }}
                          placeholder="e.g., Design, Engineering"
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">Default Price ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stage.price || ''}
                          onChange={(e) => {
                            const updatedStages = [...templateFormData.stages];
                            updatedStages[index].price = e.target.value ? parseFloat(e.target.value) : undefined;
                            setTemplateFormData({ ...templateFormData, stages: updatedStages });
                          }}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTemplateFormData({
                            ...templateFormData,
                            stages: templateFormData.stages.filter((_, i) => i !== index)
                          });
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setTemplateFormData({
                      ...templateFormData,
                      stages: [...templateFormData.stages, { name: '', price: undefined }]
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>

                {templateFormData.stages.length === 0 && (
                  <div className="p-3 border border-dashed rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">No stages added. Click "Add Stage" to create one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddTemplateModalOpen(false);
              setIsEditTemplateModalOpen(false);
              setSelectedTemplate(null);
              resetTemplateForm();
            }}>
              Cancel
            </Button>
            <Button onClick={isEditTemplateModalOpen ? handleEditTemplate : handleAddTemplate}>
              {isEditTemplateModalOpen ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
