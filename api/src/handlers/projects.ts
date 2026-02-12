/**
 * Projects Handler (List, Create, Update)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/PUT)
 * - Input validated with Zod schema for POST/PUT
 * - Requires authentication
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createProject, createSite, deleteStagesNotIn, getAllProjects, getSiteById, getStagesByProject, updateProject, updateSite, upsertStages } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { validateRequestBody, createProjectSchema, updateProjectSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

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
  const stageProjectCode = typeof stage.projectCode === "string" ? stage.projectCode.trim() : "";
  const rawStageId = stage.stageId || stage.id;
  let stageId = rawStageId;
  if (typeof stageId === "string") {
    if (stageId.startsWith(`${projectCode}-`)) {
      // keep as-is
    } else if (stageProjectCode && stageId.startsWith(`${stageProjectCode}-`)) {
      stageId = stageId.replace(stageProjectCode, projectCode);
    } else if (stageProjectCode && stageId.includes(stageProjectCode)) {
      stageId = stageId.replace(stageProjectCode, projectCode);
    } else if (!stageId.includes(projectCode)) {
      stageId = `${projectCode}-${stage.name || "stage"}`;
    }
  } else {
    stageId = `${projectCode}-${stage.name || "stage"}`;
  }
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

async function projectsHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    if (request.method === "POST") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, createProjectSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const projectCode = body.projectCode;
      const building = body.building;
      const siteId = body.siteId || building;

      const contactEmails = body.contacts || body.contactEmails || [];

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

      if (Array.isArray(body.stages) && body.stages.length > 0) {
        const stageEntities = body.stages.map((stage: any) => mapStageToEntity(projectCode, stage));
        await upsertStages(projectCode, stageEntities);
      } else {
        const defaults = buildDefaultStages(projectCode).map(stage => mapStageToEntity(projectCode, stage));
        await upsertStages(projectCode, defaults);
      }

      return addCorsHeaders(success({ projectCode }), request.headers.get("origin") || undefined);
    }

    if (request.method === "PUT") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, updateProjectSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const projectCode = body.projectCode;
      const siteId = body.siteId || body.building || "";

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

      const contactEmails = body.contacts || body.contactEmails;
      if (contactEmails !== undefined) {
        updates.contactEmails = JSON.stringify(contactEmails);
      }

      await updateProject(projectCode, updates);

        if (Array.isArray(body.stages) && body.stages.length > 0) {
          const stageEntities = body.stages.map((stage: any) => mapStageToEntity(projectCode, stage));
          await upsertStages(projectCode, stageEntities);
          await deleteStagesNotIn(projectCode, stageEntities.map(stage => stage.stageId));
        }

        return addCorsHeaders(success({ projectCode }), request.headers.get("origin") || undefined);
      }

    // GET - list all projects
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

// SECURITY: Wrap handler with rate limiting
export const projectsHandler = withRateLimit(
  projectsHandlerImpl,
  RATE_LIMITS.STANDARD
);

export default projectsHandler;
