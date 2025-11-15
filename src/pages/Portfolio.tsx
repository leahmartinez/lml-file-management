import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Calendar, Filter, Search, Eye } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { mockProjects } from "@/test/mockData";
import { useAuth } from "@/hooks/useAuth";
import type { Project, ProjectState, ProjectStatus } from "@/types/data";

const Portfolio = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 9; // 3 columns x 3 rows
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterState, filterStatus]);

  // Memoize filter dropdown options
  const stateOptions = useMemo(() =>
    [...new Set(mockProjects.map(project => project.state))],
    []
  );

  const statusOptions = useMemo(() =>
    [...new Set(mockProjects.map(project => project.status))],
    []
  );

  const filteredProjects = useMemo(() => {
    let projects = mockProjects;

    // Filter by user's site assignments if site_manager
    if (user?.role === "site_manager" && user.sites.length > 0) {
      projects = projects.filter(project => user.sites.includes(project.building));
    }

    return projects.filter(project => {
      const matchesSearch =
        project.projectCode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        project.building.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesState = filterState === "all" || project.state === filterState;
      const matchesStatus = filterStatus === "all" || project.status === filterStatus;

      return matchesSearch && matchesState && matchesStatus;
    });
  }, [debouncedSearch, filterState, filterStatus, user]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  // Generate page numbers for pagination UI
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "Active":
        return "bg-green-50 text-green-700 border-green-200";
      case "On Hold":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Archived":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStateColor = (state: ProjectState) => {
    const colors: Record<ProjectState, string> = {
      Victoria: "bg-blue-50 text-blue-700 border-blue-200",
      NSW: "bg-red-50 text-red-700 border-red-200",
      "South Australia": "bg-orange-50 text-orange-700 border-orange-200",
      Queensland: "bg-teal-50 text-teal-700 border-teal-200",
    };
    return colors[state];
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProject(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects Portfolio</h1>
            <p className="text-muted-foreground">Comprehensive view of all consulting projects</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredProjects.length} of {mockProjects.length} projects
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {stateOptions.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterState("all");
                  setFilterStatus("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredProjects.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} results
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProjects.map((project) => (
            <Card key={project.projectCode} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.projectCode}</CardTitle>
                    <p className="text-sm text-muted-foreground">{project.building}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description provided"}
                </p>

                {/* State Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStateColor(project.state)}>
                    {project.state}
                  </Badge>
                </div>

                {/* Project Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stages:</span>
                    <span className="font-medium">{project.stages.length}/5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Notes:</span>
                    <span className="font-medium">{project.notes.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDetails(project)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Project Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && paginatedProjects.length > 0 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {getPageNumbers()[0] > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {getPageNumbers()[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {getPageNumbers().map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Detail Modal - TODO: Create ProjectDetailModal component */}
      {/* For now, just showing that we'll implement this later */}
      {selectedProject && dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>{selectedProject.projectCode}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedProject.building}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDialog}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{selectedProject.description}</p>
              <p className="text-sm">
                <strong>Status:</strong> {selectedProject.status}
              </p>
              <p className="text-sm">
                <strong>State:</strong> {selectedProject.state}
              </p>
              <p className="text-sm">
                <strong>Created:</strong> {new Date(selectedProject.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
