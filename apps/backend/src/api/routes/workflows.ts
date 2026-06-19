import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireTeacher } from "@api/middleware/auth";
import { parseBody, parseParams } from "@api/validators/zod";
import {
  GetWorkflowRunUseCase,
  ListWorkflowRunsUseCase,
  RunWorkflowUseCase,
  WorkflowPlannerUseCase
} from "@app/workflows/workflow-planner.use-case";
import { DrizzleWorkflowStore } from "@infra/repositories/drizzle-workflow-store";
import { getQueue } from "@infra/queue/queue";

const workflowStore = new DrizzleWorkflowStore();

const workflowStepSchema = z.object({
  skill_slug: z.string().min(2).max(180).regex(/^[a-z0-9-]+$/),
  input_mapping: z.record(z.string().min(1)),
  output_key: z.string().min(1).max(80)
});

const createWorkflowSchema = z.object({
  name: z.string().min(3).max(180),
  description: z.string().max(2000).default(""),
  steps: z.array(workflowStepSchema).min(1)
});

const workflowIdParamsSchema = z.object({
  id: z.string().uuid()
});

const runWorkflowBodySchema = z.object({
  input: z.record(z.unknown())
});

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/workflows", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const body = parseBody(request, createWorkflowSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new WorkflowPlannerUseCase(workflowStore);

    const workflow = await useCase.create({
      userId,
      name: body.name,
      description: body.description,
      steps: body.steps.map((step) => ({
        skillSlug: step.skill_slug,
        inputMapping: step.input_mapping,
        outputKey: step.output_key
      }))
    });

    return reply.status(201).success(workflow, "Workflow dibuat", "WORKFLOW_CREATED");
  });

  fastify.get("/workflows", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new WorkflowPlannerUseCase(workflowStore);
    const workflows = await useCase.list(userId);
    return reply.success(workflows, "Daftar workflow", "WORKFLOWS_LIST");
  });

  fastify.get("/workflows/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, workflowIdParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new WorkflowPlannerUseCase(workflowStore);
    const workflow = await useCase.detail({ workflowId: id, userId });
    return reply.success(workflow, "Detail workflow", "WORKFLOW_DETAIL");
  });

  fastify.post("/workflows/:id/run", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, workflowIdParamsSchema);
    const body = parseBody(request, runWorkflowBodySchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new RunWorkflowUseCase(workflowStore, {
      async send(jobName, payload) {
        return getQueue().send(jobName, payload);
      }
    });

    const run = await useCase.execute({
      workflowId: id,
      userId,
      input: body.input
    });

    return reply.status(201).success(run, "Workflow masuk antrean", "WORKFLOW_RUN_QUEUED");
  });

  fastify.get("/workflows/:id/runs", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, workflowIdParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new ListWorkflowRunsUseCase(workflowStore);
    const runs = await useCase.execute({
      workflowId: id,
      userId
    });

    return reply.success(runs, "Riwayat workflow run", "WORKFLOW_RUNS_LIST");
  });

  fastify.get("/workflow-runs/:id", { preHandler: [authenticate, requireTeacher] }, async (request, reply) => {
    const { id } = parseParams(request, workflowIdParamsSchema);
    const userId = z.string().uuid().parse(request.user?.id);
    const useCase = new GetWorkflowRunUseCase(workflowStore);
    const run = await useCase.execute({ workflowRunId: id, userId });
    return reply.success(run, "Detail workflow run", "WORKFLOW_RUN_DETAIL");
  });
};
