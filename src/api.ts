const API_URL = "https://aiia-clinical-trials-command-center.onrender.com";
async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export async function checkBackend() {
  return request<{
    status: string;
    database: string;
    time: string;
  }>("/api/health");
}

export async function getStudies() {
  return request<any[]>("/api/studies");
}
export async function createSafetyEvent(data: {
  study_id: string;
  severity: string;
  status: string;
  event_type: string;
  description: string;
}) {
  return request<any>("/api/safety-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
export async function getAlerts() {
  return request<any[]>("/api/alerts");
}

export async function acknowledgeAlert(alertId: number) {
  return request<any>(`/api/alerts/${alertId}/acknowledge`, {
    method: "PATCH",
  });
}

export async function getSafetyEvents() {
  return request<any[]>("/api/safety-events");
}
export async function updateSafetyEventStatus(
  id: number,
  status: string,
) {
  return request<any>(
    `/api/safety-events/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );
}
export async function getAuditTrail() {
  return request<any[]>("/api/audit");
}

export async function createAuditRecord(data: {
  action: string;
  study_id?: string;
  user_role?: string;
  details?: string;
}) {
  return request<any>("/api/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function createStudy(data: {
  study_id: string;
  title: string;
  investigator: string;
  site: string;
  status: string;
  target_participants: number;
  enrolled_participants: number;
  risk_score: number;
  next_milestone: string;
  ethics_status: string;
  safety_status: string;
}) {
  return request<any>("/api/studies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}