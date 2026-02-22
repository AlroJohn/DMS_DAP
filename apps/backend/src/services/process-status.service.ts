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

    const existing = await prisma.processStatus.findUnique({
      where: { document_id: documentId }
    });

    const firstReceived = await prisma.documentTrail.findFirst({
      where: { document_id: documentId, status: 'received' },
      orderBy: { action_date: 'asc' },
      select: { action_date: true, created_at: true }
    });

    const firstCompleted = await prisma.documentTrail.findFirst({
      where: { document_id: documentId, status: 'completed' },
      orderBy: { action_date: 'asc' },
      select: { action_date: true, created_at: true }
    });

    const startedAt =
      firstReceived?.action_date || firstReceived?.created_at || null;
    const completedAt =
      firstCompleted?.action_date || firstCompleted?.created_at || null;

    const processType = await prisma.processType.findUnique({
      where: { process_type_id: document.process_type_id },
      select: { duration_value: true, duration_unit: true }
    });

    const durationSeconds = this.getDurationSeconds(
      processType?.duration_value ?? null,
      processType?.duration_unit ?? null
    );

    const resolvedStartedAt =
      existing?.started_at || startedAt || completedAt || null;
    if (!resolvedStartedAt) {
      return existing ?? null;
    }
    const resolvedCompletedAt = completedAt || existing?.completed_at || null;

    const deadline =
      durationSeconds > 0
        ? resolvedStartedAt.getTime() + durationSeconds * 1000
        : null;
    let status: 'ongoing' | 'delayed' | 'completed' = 'ongoing';
    let delayedAt: Date | null = null;
    let delayedDurationSeconds: number | null = null;

    if (resolvedCompletedAt) {
      let completedLate = false;
      if (deadline && resolvedCompletedAt.getTime() > deadline) {
        completedLate = true;
        delayedAt = new Date(deadline);
        delayedDurationSeconds = Math.max(
          0,
          Math.floor((resolvedCompletedAt.getTime() - deadline) / 1000)
        );
      }

      const hadDelay =
        existing?.status === 'delayed' ||
        Boolean(existing?.delayed_at) ||
        (existing?.delayed_duration_seconds ?? 0) > 0;

      status = completedLate || hadDelay ? 'delayed' : 'completed';

      if (!delayedAt && existing?.delayed_at) {
        delayedAt = existing.delayed_at;
      }
      if (
        delayedDurationSeconds == null &&
        (existing?.delayed_duration_seconds ?? 0) > 0
      ) {
        delayedDurationSeconds = existing!.delayed_duration_seconds!;
      }
    } else if (deadline && Date.now() > deadline) {
      status = 'delayed';
      delayedAt = existing?.delayed_at ?? new Date(deadline);
      delayedDurationSeconds = Math.max(
        0,
        Math.floor((Date.now() - deadline) / 1000)
      );
    }

    if (existing) {
      return prisma.processStatus.update({
        where: { document_id: documentId },
        data: {
          status,
          started_at: resolvedStartedAt,
          completed_at: resolvedCompletedAt,
          delayed_at: delayedAt,
          delayed_duration_seconds: delayedDurationSeconds
        }
      });
    }

    return prisma.processStatus.create({
      data: {
        document_id: documentId,
        status,
        started_at: resolvedStartedAt,
        completed_at: resolvedCompletedAt,
        delayed_at: delayedAt,
        delayed_duration_seconds: delayedDurationSeconds
      }
    });
  }
}
