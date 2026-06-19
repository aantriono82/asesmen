import { startAssessmentGenerationWorker } from "./assessment-generation.worker";
import { startDocumentProcessingWorker } from "./document-processing.worker";
import { startMaintenanceWorkers } from "./maintenance.worker";
import { startSkillExecutionWorker } from "./skill-execution.worker";
import { startWorkflowExecutionWorker } from "./workflow-execution.worker";

export async function startQueueWorkers(): Promise<void> {
  await startSkillExecutionWorker();
  await startWorkflowExecutionWorker();
  await startDocumentProcessingWorker();
  await startAssessmentGenerationWorker();
  await startMaintenanceWorkers();
}
