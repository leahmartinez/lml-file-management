/**
 * Projects Handler (List, Create, Update)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/PUT)
 * - Input validated with Zod schema for POST/PUT
 * - Requires authentication
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createProject, createSite, deleteStagesNotIn, getAllProjects, getSiteById, getStagesByProject, updateProject, updateSite, upsertStages, createAlert } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error, forbidden } from "../utils/response";
import { getAuthenticatedUser, canUserSetPricing } from "../utils/auth";
import { validateRequestBody, createProjectSchema, updateProjectSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';
import { safeParseJsonArray } from '../utils/json';
import { UserRole } from "../../shared/constants/roles";
import { getVisibleJobs, getVisibleConsultantEmails } from "../../shared/utils/pairingLogic";

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
  const consultantEmails = safeParseJsonArray(stage.consultantEmails, []);
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

/**
 * Create alerts for newly assigned consultants on a stage
 * Compares old and new consultant lists and creates alerts for new assignments
 */
async function createAlertsForNewAssignments(
  projectCode: string,
  stageId: string,
  stageName: string,
  oldConsultantEmails: string[],
  newConsultantEmails: string[],
  context: InvocationContext
): Promise<void> {
  // Find newly added consultants (in new but not in old)
  const newlyAssigned = newConsultantEmails.filter(
    email => !oldConsultantEmails.includes(email)
  );

  if (newlyAssigned.length === 0) {
    return; // No new assignments
  }

  // Fetch project and site data for the alert message
  try {
    const project = await getAllProjects();
    const projectData = project.find(p => p.projectCode === projectCode);

    if (!projectData) {
      context.warn(`Project ${projectCode} not found when creating alerts`);
      return;
    }

    const siteName = projectData.building || 'Unknown Site';
    const siteId = projectData.siteId || '';

    // Create an alert for each newly assigned consultant
    for (const consultantEmail of newlyAssigned) {
      try {
        await createAlert({
          userId: consultantEmail,
          type: 'STAGE_ASSIGNED',
          title: 'New stage assigned to you',
          message: `You have been assigned to ${stageName} at ${siteName} (${projectCode})`,
          entityType: 'projectStage',
          entityId: stageId,
          projectId: projectCode,
          siteId: siteId,
        });
        context.log(`Alert created for ${consultantEmail} - ${stageName} at ${siteName}`);
      } catch (alertError: any) {
        // Log error but don't fail the stage update
        context.error(`Failed to create alert for ${consultantEmail}:`, alertError);
      }
    }
  } catch (err: any) {
    // Log error but don't fail the stage update
    context.error('Failed to create alerts for stage assignment:', err);
  }
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
      // AUTHORIZATION: Only Admin and Director can create projects
      if (!canUserSetPricing(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to create project`);
        return addCorsHeaders(
          forbidden("Only Admin and Director can create projects"),
          request.headers.get("origin") || undefined
        );
      }

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
        reportTemplatesFolderUrl: body.reportTemplatesFolderUrl || "",
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
        const projectCodes = safeParseJsonArray(site.projectCodes, []);
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
      // AUTHORIZATION: Only Admin and Director can update projects
      if (!canUserSetPricing(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to update project`);
        return addCorsHeaders(
          forbidden("Only Admin and Director can update projects"),
          request.headers.get("origin") || undefined
        );
      }

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
      if (body.reportTemplatesFolderUrl !== undefined) updates.reportTemplatesFolderUrl = body.reportTemplatesFolderUrl;

      const contactEmails = body.contacts || body.contactEmails;
      if (contactEmails !== undefined) {
        updates.contactEmails = JSON.stringify(contactEmails);
      }

      await updateProject(projectCode, updates);

        if (Array.isArray(body.stages) && body.stages.length > 0) {
          // Fetch existing stages to compare consultant assignments
          const existingStages = await getStagesByProject(projectCode);

          const stageEntities = body.stages.map((stage: any) => mapStageToEntity(projectCode, stage));
          await upsertStages(projectCode, stageEntities);
          await deleteStagesNotIn(projectCode, stageEntities.map(stage => stage.stageId));

          // Create alerts for newly assigned consultants
          for (const newStage of body.stages) {
            const stageId = newStage.stageId || newStage.id;
            const newConsultantEmails = Array.isArray(newStage.consultantEmails)
              ? newStage.consultantEmails
              : Array.isArray(newStage.stageConsultantEmails)
                ? newStage.stageConsultantEmails
                : [];

            // Find the existing stage to compare
            const existingStage = existingStages.find(s => s.stageId === stageId || s.rowKey === stageId);
            const oldConsultantEmails = existingStage
              ? safeParseJsonArray(existingStage.consultantEmails, [])
              : [];

            // Create alerts for new assignments
            await createAlertsForNewAssignments(
              projectCode,
              stageId,
              newStage.name || 'Unknown Stage',
              oldConsultantEmails,
              newConsultantEmails,
              context
            );
          }
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

        const contactEmails = safeParseJsonArray(project.contactEmails, []);

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
          reportTemplatesFolderUrl: project.reportTemplatesFolderUrl || "",
        };
      })
    );

    // PAIRING LOGIC: Filter stages based on user role and pairing
    // Admin, Director, AdminStaff see all projects
    // LMLConsultant sees their own work + paired consultant work
    // SubConsultant sees only their own work
    const userWithPairing = {
      email: user.email,
      role: user.role,
      pairedUserId: user.pairedUserId,
    };

    // Filter each project's stages based on consultant pairing
    const filteredPayload = payload.map(project => ({
      ...project,
      stages: getVisibleJobs(userWithPairing, project.stages),
    }));

    // Only return projects that have at least one visible stage
    // (Admin/Director/AdminStaff see all, consultants see only assigned projects)
    const visibleProjects = filteredPayload.filter(project => project.stages.length > 0);

    return addCorsHeaders(success(visibleProjects), request.headers.get("origin") || undefined);
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
