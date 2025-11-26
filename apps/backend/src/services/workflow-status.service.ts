import { prisma } from '../lib/prisma';

type WorkflowStatusEntry = {
  status: string;
  at?: string;
  [key: string]: any;
};

type WorkflowStatusMap = Record<string, WorkflowStatusEntry>;

function parseWorkflowStatus(value: unknown): WorkflowStatusMap {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      return parseWorkflowStatus(JSON.parse(value));
    } catch {
      return {};
    }
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, entry, index) => {
      acc[`entry_${index + 1}`] = typeof entry === 'object' && entry ? { ...(entry as any) } : { status: 'unknown' };
      return acc;
    }, {} as WorkflowStatusMap);
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).reduce((acc, key) => {
      const entry = obj[key];
      if (typeof entry === 'object' && entry) {
        acc[key] = { ...(entry as WorkflowStatusEntry) };
      }
      return acc;
    }, {} as WorkflowStatusMap);
  }

  return {};
}

async function ensureDocumentDetail(documentId: string) {
  let detail = await prisma.documentAdditionalDetails.findFirst({
    where: { document_id: documentId },
    select: { detail_id: true, work_flow_status: true }
  });

  if (!detail) {
    detail = await prisma.documentAdditionalDetails.create({
      data: { document_id: documentId },
      select: { detail_id: true, work_flow_status: true }
    });
  }

  return detail;
}

async function mutateWorkflowStatus(documentId: string, mutator: (current: WorkflowStatusMap) => WorkflowStatusMap) {
  const detail = await ensureDocumentDetail(documentId);
  const currentStatus = parseWorkflowStatus(detail.work_flow_status);
  const nextStatus = mutator({ ...currentStatus });

  await prisma.documentAdditionalDetails.update({
    where: { detail_id: detail.detail_id },
    data: {
      work_flow_status: nextStatus as any,
      updated_at: new Date()
    }
  });
}

export async function recordCreationStatus(documentId: string, payload: { departmentId?: string | null; accountId?: string | null; status?: string }) {
  await mutateWorkflowStatus(documentId, (current) => {
    if (current.created) {
      return current;
    }

    const timestamp = new Date().toISOString();

    return {
      ...current,
      created: {
        status: payload.status ?? 'dispatch',
        at: timestamp,
        department_id: payload.departmentId,
        account_id: payload.accountId,
        action: 'created'
      }
    };
  });
}

export async function recordReleaseStatus(
  documentId: string,
  payload: {
    fromDepartmentId?: string | null;
    toDepartmentId: string;
    userId: string;
    requestAction?: string;
    remarks?: string | null;
  }
) {
  await mutateWorkflowStatus(documentId, (current) => {
    const releaseCount = Object.keys(current).filter((key) => key.startsWith('released_')).length;
    const key = `released_${releaseCount + 1}`;
    const timestamp = new Date().toISOString();

    return {
      ...current,
      [key]: {
        status: 'intransit',
        at: timestamp,
        from_department_id: payload.fromDepartmentId,
        to_department_id: payload.toDepartmentId,
        released_by: payload.userId,
        request_action: payload.requestAction,
        remarks: payload.remarks
      }
    };
  });
}

export async function recordReceiveStatus(
  documentId: string,
  payload: {
    departmentId: string;
    userId: string;
  }
) {
  await mutateWorkflowStatus(documentId, (current) => {
    const timestamp = new Date().toISOString();
    const releaseEntries = Object.entries(current)
      .filter(([key]) => key.startsWith('released_'))
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, undefined, { numeric: true }));

    for (let index = releaseEntries.length - 1; index >= 0; index -= 1) {
      const [key, value] = releaseEntries[index];
      const entry = value || {};
      const targetDepartment = entry.to_department_id || entry.toDepartmentId;
      const alreadyReceived = entry.received_at || entry.receivedAt;

      if (targetDepartment === payload.departmentId && !alreadyReceived) {
        current[key] = {
          ...entry,
          status: 'received',
          received_at: timestamp,
          received_by: payload.userId,
          received_department_id: payload.departmentId
        };
        return current;
      }
    }

    const receiveCount = Object.keys(current).filter((key) => key.startsWith('received_')).length;
    const receiveKey = `received_${receiveCount + 1}`;

    return {
      ...current,
      [receiveKey]: {
        status: 'received',
        at: timestamp,
        department_id: payload.departmentId,
        received_by: payload.userId
      }
    };
  });
}

export async function recordCompletionStatus(documentId: string, payload: { userId: string }) {
  await mutateWorkflowStatus(documentId, (current) => {
    const timestamp = new Date().toISOString();

    return {
      ...current,
      completed: {
        status: 'completed',
        at: timestamp,
        completed_by: payload.userId
      }
    };
  });
}

