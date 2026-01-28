import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getAllProjects, getStagesByProject } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";

const DEFAULT_STAGE_ORDER: Record<string, number> = {
  Feasibility: 1,
  "Technical Specification": 2,
  Tender: 3,
  "Contract Draft": 4,
  "Project Management": 5,
};

function buildDefaultStages(projectCode: string) {
  return Object.entries(DEFAULT_STAGE_ORDER).map(([name, order]) => ({
    id: `${projectCode}-stage-${order}`,
    name,
    projectCode,
    files: [],
    order,
    description: "",
    status: "Not Started",
    price: 0,
    createdAt: new Date().toISOString(),
  }));
}

export async function projectsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    const projects = await getAllProjects();

    const payload = await Promise.all(
      projects.map(async project => {
        const stages = await getStagesByProject(project.projectCode);
        const mappedStages = stages.length
          ? stages.map(stage => ({
              id: stage.stageId,
              name: stage.name,
              projectCode: stage.projectCode,
              files: [],
              order: DEFAULT_STAGE_ORDER[stage.name] || 0,
              description: stage.description || "",
              status: stage.status,
              price: stage.price || 0,
              createdAt: stage.createdAt,
            }))
          : buildDefaultStages(project.projectCode);

        return {
          projectCode: project.projectCode,
          building: project.building,
          state: project.state,
          description: project.description || "",
          status: project.status || "Active",
          stages: mappedStages,
          notes: [],
          contacts: [],
          createdAt: project.createdAt,
          updatedAt: project.createdAt,
          createdBy: project.createdBy,
          orderDate: project.orderDate,
          invoiceStatus: project.invoiceStatus,
          projectType: project.projectType,
          customProjectType: project.customProjectType,
        };
      })
    );

    return addCorsHeaders(success(payload), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Projects fetch error:", err);
    return addCorsHeaders(error("Failed to fetch projects", 500), request.headers.get("origin") || undefined);
  }
}

export default projectsHandler;
