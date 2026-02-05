import { prisma } from '../lib/prisma';

type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const UNIT_TO_SECONDS: Record<DurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60
};

export class ProcessStatusService {
  private parseWorkflowDepartments(workflow: unknown): string[] {
    if (!workflow) return [];

    try {
      if (Array.isArray(workflow)) {
        return workflow
          .map((value) => (value == null ? '' : String(value)))
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
      }

      if (typeof workflow === 'string') {
        const trimmed = workflow.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          return this.parseWorkflowDepartments(parsed);
        }
        return trimmed ? [trimmed] : [];
      }

      if (typeof workflow === 'object') {
        return Object.values(workflow as Record<string, unknown>)
          .map((value) => (value == null ? '' : String(value)))
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
      }
    } catch (error) {
      console.error('Error parsing work_flow_id for ProcessStatus:', error);
    }

    return [];
  }

  private getDurationSeconds(durationValue?: number | null, durationUnit?: string | null) {
    if (!durationValue || durationValue <= 0) return 0;
    const unit = ((durationUnit || 'days').toLowerCase() as DurationUnit) || 'days';
    const multiplier = UNIT_TO_SECONDS[unit] ?? UNIT_TO_SECONDS.days;
    return durationValue * multiplier;
  }

  async syncForDocument(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { document_id: documentId },
      select: { document_id: true, process_type_id: true }
    });

    if (!document?.process_type_id) {
      return null;
    }

    const workflowDetail = await prisma.documentAdditionalDetails.findFirst({
      where: { document_id: documentId },
      orderBy: { created_at: 'asc' },
      select: { work_flow_id: true }
    });

    const workflowDepartments = this.parseWorkflowDepartments(
      workflowDetail?.work_flow_id
    );

    const firstReceived = await prisma.documentTrail.findFirst({
      where: { document_id: documentId, status: 'received' },
      orderBy: { action_date: 'asc' },
      select: { action_date: true, created_at: true }
    });

    const startedAt = firstReceived?.action_date || firstReceived?.created_at || null;
    if (!startedAt) {
      return null;
    }

    let completedAt: Date | null = null;
    if (workflowDepartments.length > 0) {
      const completedTrails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
          status: 'completed',
          to_department: { not: null }
        },
        select: {
          to_department: true,
          action_date: true,
          created_at: true
        }
      });

      const completedByDepartment = new Map<string, Date>();
      completedTrails.forEach((trail) => {
        if (!trail.to_department) return;
        const date = trail.action_date || trail.created_at;
        if (!date) return;
        const existing = completedByDepartment.get(trail.to_department);
        if (!existing || date > existing) {
          completedByDepartment.set(trail.to_department, date);
        }
      });

      const allCompleted = workflowDepartments.every((dept) =>
        completedByDepartment.has(dept)
      );
      if (allCompleted) {
        let latest = new Date(0);
        workflowDepartments.forEach((dept) => {
          const date = completedByDepartment.get(dept);
          if (date && date > latest) {
            latest = date;
          }
        });
        if (latest.getTime() > 0) {
          completedAt = latest;
        }
      }
    }

    const processType = await prisma.processType.findUnique({
      where: { process_type_id: document.process_type_id },
      select: { duration_value: true, duration_unit: true }
    });

    const durationSeconds = this.getDurationSeconds(
      processType?.duration_value ?? null,
      processType?.duration_unit ?? null
    );

    const existing = await prisma.processStatus.findUnique({
      where: { document_id: documentId }
    });

    const resolvedStartedAt = existing?.started_at || startedAt;
    const resolvedCompletedAt = completedAt || existing?.completed_at || null;

    let status: 'ongoing' | 'delayed' | 'completed' = 'ongoing';
    if (resolvedCompletedAt) {
      status = 'completed';
    } else if (
      durationSeconds > 0 &&
      resolvedStartedAt &&
      Date.now() > resolvedStartedAt.getTime() + durationSeconds * 1000
    ) {
      status = 'delayed';
    }

    if (existing) {
      return prisma.processStatus.update({
        where: { document_id: documentId },
        data: {
          status,
          started_at: resolvedStartedAt,
          completed_at: resolvedCompletedAt
        }
      });
    }

    return prisma.processStatus.create({
      data: {
        document_id: documentId,
        status,
        started_at: resolvedStartedAt,
        completed_at: resolvedCompletedAt
      }
    });
  }
}
