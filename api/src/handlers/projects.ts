import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createProject, createSite, getAllProjects, getSiteById, getStagesByProject, updateProject, updateSite, upsertStages } from "../database/tableStorage";
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
    consultantEmails: [],
  }));
}

function mapStageToEntity(projectCode: string, stage: any) {
  const stageId = stage.stageId || stage.id || `${projectCode}-${stage.name}`;
  const consultantEmails = Array.isArray(stage.consultantEmails)
    ? stage.consultantEmails
    : Array.isArray(stage.stageConsultantEmails)
      ? stage.stageConsultantEmails
      : [];

  return {
    partitionKey: projectCode,
    rowKey: stageId,
    stageId,
    projectCode,
    name: stage.name,
    status: stage.status || "Not Started",
    price: stage.price || 0,
    description: stage.description || "",
    plannedSiteVisitDate: stage.plannedSiteVisitDate,
    consultantEmails: JSON.stringify(consultantEmails),
    createdAt: stage.createdAt || new Date().toISOString(),
    createdBy: stage.createdBy,
  };
}

function mapStageFromEntity(stage: any) {
  const consultantEmails = stage.consultantEmails ? JSON.parse(stage.consultantEmails) : [];
  return {
    id: stage.stageId,
    name: stage.name,
    projectCode: stage.projectCode,
    files: [],
    order: DEFAULT_STAGE_ORDER[stage.name] || 0,
    description: stage.description || "",
    status: stage.status,
    price: stage.price || 0,
    createdAt: stage.createdAt,
    plannedSiteVisitDate: stage.plannedSiteVisitDate,
    consultantEmails,
  };
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

    if (request.method === "POST" || request.method === "PUT") {
      const rawBody = await request.json().catch(() => ({}));
      const body = (rawBody && typeof rawBody === "object") ? (rawBody as Record<string, any>) : {};
      const projectCode = (body.projectCode || "").toString().trim();
      const building = (body.building || "").toString().trim();
      const siteId = (body.siteId || building || "").toString().trim();

      if (!projectCode) {
        return addCorsHeaders(error("Project code is required", 400), request.headers.get("origin") || undefined);
      }

      if (!building && request.method === "POST") {
        return addCorsHeaders(error("Building is required", 400), request.headers.get("origin") || undefined);
      }

      const hasContacts = Array.isArray(body.contacts) || Array.isArray(body.contactEmails);
      const contactEmails = Array.isArray(body.contacts)
        ? body.contacts
        : Array.isArray(body.contactEmails)
          ? body.contactEmails
          : [];

      if (request.method === "POST") {
        const entity = {
          partitionKey: "PROJECT",
          rowKey: projectCode,
          projectCode,
          siteId,
          building,
          state: body.state || "",
          status: body.status || "Active",
          invoiceStatus: body.invoiceStatus,
          orderDate: body.orderDate,
          description: body.description || "",
          projectType: body.projectType,
          customProjectType: body.customProjectType,
          createdAt: body.createdAt || new Date().toISOString(),
          createdBy: user.email,
          contactEmails: JSON.stringify(contactEmails),
        };

        await createProject(entity);

        let site = await getSiteById(siteId);
        if (!site) {
          site = await createSite({
            partitionKey: "SITE",
            rowKey: siteId,
            siteId,
            building,
            address: body.address || "",
            city: body.city || "",
            state: body.state || "",
            postcode: body.postcode || "",
            createdAt: new Date().toISOString(),
            createdBy: user.email,
            projectCodes: JSON.stringify([projectCode]),
            contactEmails: JSON.stringify([]),
          });
        } else {
          const projectCodes = site.projectCodes ? JSON.parse(site.projectCodes) : [];
          if (!projectCodes.includes(projectCode)) {
            projectCodes.push(projectCode);
            await updateSite(siteId, { projectCodes: JSON.stringify(projectCodes) });
          }
        }

        if (Array.isArray(body.stages)) {
          if (body.stages.length > 0) {
            const stageEntities = body.stages.map((stage: any) => mapStageToEntity(projectCode, stage));
            await upsertStages(projectCode, stageEntities);
          }
        } else {
          const defaults = buildDefaultStages(projectCode).map(stage => mapStageToEntity(projectCode, stage));
          await upsertStages(projectCode, defaults);
        }

        return addCorsHeaders(success({ projectCode }), request.headers.get("origin") || undefined);
      }

      if (request.method === "PUT") {
        const updates: any = {};
        if (body.building !== undefined) updates.building = body.building;
        if (siteId) updates.siteId = siteId;
        if (body.state !== undefined) updates.state = body.state;
        if (body.status !== undefined) updates.status = body.status;
        if (body.invoiceStatus !== undefined) updates.invoiceStatus = body.invoiceStatus;
        if (body.orderDate !== undefined) updates.orderDate = body.orderDate;
        if (body.description !== undefined) updates.description = body.description;
        if (body.projectType !== undefined) updates.projectType = body.projectType;
        if (body.customProjectType !== undefined) updates.customProjectType = body.customProjectType;

        if (hasContacts) {
          updates.contactEmails = JSON.stringify(contactEmails);
        }

        await updateProject(projectCode, updates);

        if (Array.isArray(body.stages) && body.stages.length > 0) {
          const stageEntities = body.stages.map((stage: any) => mapStageToEntity(projectCode, stage));
          await upsertStages(projectCode, stageEntities);
        }

        return addCorsHeaders(success({ projectCode }), request.headers.get("origin") || undefined);
      }
    }

    const projects = await getAllProjects();

    const payload = await Promise.all(
      projects.map(async project => {
        const stages = await getStagesByProject(project.projectCode);
        const mappedStages = stages.length
          ? stages.map(stage => mapStageFromEntity(stage))
          : buildDefaultStages(project.projectCode);

        const contactEmails = project.contactEmails ? JSON.parse(project.contactEmails) : [];

        return {
          projectCode: project.projectCode,
          building: project.building,
          siteId: project.siteId,
          state: project.state,
          description: project.description || "",
          status: project.status || "Active",
          stages: mappedStages,
          notes: [],
          contacts: contactEmails,
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
