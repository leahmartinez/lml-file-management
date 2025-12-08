import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useProjectManagement } from '@/hooks/useProjectManagement';
import { useSites } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Download, Trash2, Building2, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProjectDetailModal } from '@/components/sites/ProjectDetailModal';
import { POFile, ProjectStatus } from '@/types/data';

const PROJECT_STATUSES: ProjectStatus[] = [
  'Active',
  'On Hold',
  'Completed',
  'Archived',
];

export default function ProjectDetail() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();
  const { projects, deleteProject, updateProject } = useProjectManagement();
  const { data: sites = [] } = useSites();
  const [poFiles, setPoFiles] = useState<POFile[]>([]);
  const [projectDetailModalOpen, setProjectDetailModalOpen] = useState(false);

  // Find the project by code
  const project = projects.find((p) => p.projectCode === projectCode);

  // Find the site associated with this project
  const site = sites.find((s) => s.building === project?.building);

  // Initialize poFiles from project data
  useEffect(() => {
    if (project?.poFiles) {
      setPoFiles(project.poFiles);
    }
  }, [project?.poFiles]);

  const handleAddPOFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPOFile: POFile = {
          id: `po_${Date.now()}`,
          name: file.name,
          url: event.target?.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user',
          fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        };
        const updated = [...poFiles, newPOFile];
        setPoFiles(updated);
        // Update project with new PO files
        if (project) {
          updateProject(project.projectCode, {
            ...project,
            poFiles: updated,
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDeletePOFile = (fileId: string) => {
    const updated = poFiles.filter((f) => f.id !== fileId);
    setPoFiles(updated);
    if (project) {
      updateProject(project.projectCode, {
        ...project,
        poFiles: updated,
      });
    }
  };

  const handleDeleteProject = () => {
    if (project && window.confirm(`Are you sure you want to delete project "${project.projectCode}"? This cannot be undone.`)) {
      if (deleteProject(project.projectCode)) {
        navigate('/dashboard');
      }
    }
  };

  const handleProjectUpdate = (updatedCode: string, updatedProject: any) => {
    if (project) {
      updateProject(updatedCode, updatedProject);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <main className="container mx-auto py-6 px-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The project "{projectCode}" could not be found.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container mx-auto py-6 px-4">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Project Header Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{project.projectCode}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{site?.building || project.building}</span>
                  </div>
                  <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                  {project.invoiceStatus && (
                    <Badge variant="outline">{project.invoiceStatus}</Badge>
                  )}
                </div>
                {project.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-wrap justify-end">
                <Button
                  variant="outline"
                  onClick={() => setProjectDetailModalOpen(true)}
                  className="whitespace-nowrap"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteProject}
                  className="whitespace-nowrap text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          {(project.orderDate || project.invoicedDate || project.projectValue) && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                {project.orderDate && (
                  <div>
                    <span className="text-muted-foreground">Order Date: </span>
                    <span className="font-medium">{project.orderDate}</span>
                  </div>
                )}
                {project.invoicedDate && (
                  <div>
                    <span className="text-muted-foreground">Invoiced Date: </span>
                    <span className="font-medium">{project.invoicedDate}</span>
                  </div>
                )}
                {project.projectValue && (
                  <div>
                    <span className="text-muted-foreground">Project Value: </span>
                    <span className="font-medium">${project.projectValue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Building
                    </label>
                    <p className="mt-2 text-foreground">{project.building}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      State
                    </label>
                    <p className="mt-2 text-foreground">{project.state}</p>
                  </div>
                  {site?.address && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Address
                      </label>
                      <p className="mt-2 text-foreground">{site.address}</p>
                    </div>
                  )}
                  {site?.postcode && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Postcode
                      </label>
                      <p className="mt-2 text-foreground">{site.postcode}</p>
                    </div>
                  )}
                  {project.projectType && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        JW Summary
                      </label>
                      <p className="mt-2 text-foreground">
                        {project.customProjectType || project.projectType}
                      </p>
                    </div>
                  )}
                  {project.createdAt && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Created
                      </label>
                      <p className="mt-2 text-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Stages */}
            <Card>
              <CardHeader>
                <CardTitle>Project Stages</CardTitle>
                <CardDescription>Stages in this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{stage.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
                        {stage.price && (
                          <p className="text-sm font-medium mt-2">
                            Price: ${stage.price.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{stage.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Linked Assets */}
            {site?.units && site.units.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Linked Assets</CardTitle>
                  <CardDescription>Lifts and equipment at this site</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {site.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{unit.name}</p>
                          {unit.description && (
                            <p className="text-sm text-muted-foreground">{unit.description}</p>
                          )}
                        </div>
                        {unit.location && (
                          <span className="text-sm text-muted-foreground">{unit.location}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            {/* Purchase Orders Card */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Project PO files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload PO File */}
                <div>
                  <input
                    type="file"
                    id="po-upload"
                    onChange={handleAddPOFile}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                  />
                  <label
                    htmlFor="po-upload"
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload PO</span>
                  </label>
                </div>

                {/* PO Files List */}
                {poFiles.length > 0 ? (
                  <div className="space-y-2">
                    {poFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileSize || 'Unknown size'}
                            {file.uploadedAt && ` • ${new Date(file.uploadedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          {file.url && (
                            <a
                              href={file.url}
                              download={file.name}
                              className="inline-flex items-center justify-center"
                              title="Download PO"
                            >
                              <Download className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeletePOFile(file.id)}
                            className="inline-flex items-center justify-center"
                            title="Delete PO"
                          >
                            <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80 transition-colors" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No purchase orders uploaded yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Project Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Total Stages
                  </label>
                  <p className="text-2xl font-bold mt-2">{project.stages.length}</p>
                </div>
                {project.stages.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Value
                    </label>
                    <p className="text-2xl font-bold mt-2">
                      $
                      {project.stages
                        .reduce((sum, stage) => sum + (stage.price || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                )}
                {site?.units && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Linked Assets
                    </label>
                    <p className="text-2xl font-bold mt-2">{site.units.length}</p>
                  </div>
                )}
                {poFiles.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      PO Files
                    </label>
                    <p className="text-2xl font-bold mt-2">{poFiles.length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={project}
          isOpen={projectDetailModalOpen}
          onClose={() => setProjectDetailModalOpen(false)}
          onEditCode={(newCode) => {
            // Handle code change
            handleProjectUpdate(newCode, { ...project, projectCode: newCode });
          }}
          onEditDescription={(newDesc) => {
            // Handle description change
            handleProjectUpdate(project.projectCode, { ...project, description: newDesc });
          }}
          onEditStatus={(newStatus) => {
            // Handle status change
            handleProjectUpdate(project.projectCode, { ...project, status: newStatus });
          }}
          onAddPOFile={(poFile) => {
            handleAddPOFile({ target: { files: [new File([poFile.url || ''], poFile.name)] } } as any);
          }}
          onDeletePOFile={(fileId) => {
            handleDeletePOFile(fileId);
          }}
        />
      </main>
    </div>
  );
}
