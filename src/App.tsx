import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  acknowledgeAlert as acknowledgeAlertApi,
  checkBackend,
  createAuditRecord,
  createSafetyEvent,
  createStudy,
  getAlerts,
  getAuditTrail,
  getSafetyEvents,
  updateSafetyEventStatus,
  getStudies,
} from "./api";
import "./App.css";

type TrialStatus =
  | "RECRUITING"
  | "ACTIVE"
  | "AT RISK"
  | "COMPLETED";

type Trial = {
  id: string;
  title: string;
  investigator: string;
  site: string;
  status: TrialStatus;
  target: number;
  enrolled: number;
  riskScore: number;
  nextMilestone: string;
  ethics: string;
  safety: string;
  factors: string[];
};

type ApiStudy = {
  study_id: string;
  title: string;
  investigator: string;
  site: string;
  status: TrialStatus;
  target_participants: number;
  enrolled_participants: number;
  risk_score: number;
  next_milestone: string;
  ethics_status: string;
  safety_status: string;
};

type ApiAlert = {
  id: number;
  study_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  study_title: string;
};

type Alert = {
  id: number;
  type: "HIGH" | "MEDIUM" | "INFO";
  title: string;
  description: string;
  time: string;
};

type SafetyEvent = {
  id: number;
  event_id: string;
  study_id: string;
  event_type: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
};

type AuditRecord = {
  id: number;
  action: string;
  study_id: string | null;
  user_role: string;
  details: string | null;
  created_at: string;
};

const demoTrials: Trial[] = [
  {
    id: "AIIA-CT-001",
    title: "Ayurvedic Intervention for Chronic Joint Pain",
    investigator: "Dr. Ananya Sharma",
    site: "AIIA New Delhi",
    status: "RECRUITING",
    target: 120,
    enrolled: 68,
    riskScore: 24,
    nextMilestone: "Interim Safety Review",
    ethics: "Approved",
    safety: "No Active Signals",
    factors: [
      "Recruitment is progressing within expected range",
      "Ethics approval is currently valid",
      "No active safety signal detected",
    ],
  },
  {
    id: "AIIA-CT-002",
    title: "Ayurvedic Therapy for Type 2 Diabetes Management",
    investigator: "Dr. Rajesh Kumar",
    site: "AIIA New Delhi",
    status: "ACTIVE",
    target: 200,
    enrolled: 154,
    riskScore: 38,
    nextMilestone: "Data Quality Review",
    ethics: "Approved",
    safety: "No Active Signals",
    factors: [
      "Recruitment is progressing toward target",
      "Data quality review is the next milestone",
      "No active safety signal detected",
    ],
  },
  {
    id: "AIIA-CT-003",
    title: "Ayurvedic Intervention for Osteoarthritis",
    investigator: "Dr. Meera Nair",
    site: "AIIA New Delhi",
    status: "AT RISK",
    target: 150,
    enrolled: 91,
    riskScore: 72,
    nextMilestone: "Safety Review",
    ethics: "Approved",
    safety: "Signal Under Review",
    factors: [
      "Overall study risk is elevated",
      "Safety signal is currently under review",
      "Recruitment remains below the planned target",
    ],
  },
  {
    id: "AIIA-CT-004",
    title: "Ayurvedic Supportive Care in Cancer Patients",
    investigator: "Dr. Priya Singh",
    site: "AIIA New Delhi",
    status: "COMPLETED",
    target: 100,
    enrolled: 100,
    riskScore: 12,
    nextMilestone: "Final Study Report",
    ethics: "Approved",
    safety: "No Active Signals",
    factors: [
      "Participant target has been completed",
      "Final study reporting is in progress",
      "No active safety signal detected",
    ],
  },
  {
    id: "AIIA-CT-005",
    title: "Ayurvedic Management of Chronic Respiratory Symptoms",
    investigator: "Dr. Vikram Patel",
    site: "AIIA New Delhi",
    status: "ACTIVE",
    target: 180,
    enrolled: 103,
    riskScore: 46,
    nextMilestone: "Interim Analysis",
    ethics: "Pending Review",
    safety: "Monitoring",
    factors: [
      "Ethics status requires continued monitoring",
      "Recruitment is below the final participant target",
      "Safety activity is currently being monitored",
    ],
  },
];

const initialAlerts: Alert[] = [
  {
    id: 1,
    type: "HIGH",
    title: "Safety signal under review",
    description:
      "AIIA-CT-003 · A potential safety signal has been identified and requires investigator review.",
    time: "18 min ago",
  },
  {
    id: 2,
    type: "MEDIUM",
    title: "Recruitment below expected pace",
    description:
      "AIIA-CT-005 · Participant enrolment is progressing below the planned recruitment timeline.",
    time: "42 min ago",
  },
  {
    id: 3,
    type: "INFO",
    title: "Interim safety review approaching",
    description:
      "AIIA-CT-001 · The next interim safety review milestone is approaching.",
    time: "1 hr ago",
  },
  {
    id: 4,
    type: "MEDIUM",
    title: "Data quality review required",
    description:
      "AIIA-CT-002 · A scheduled data quality review is due for this study.",
    time: "2 hrs ago",
  },
];

const fallbackSafetyEvents: SafetyEvent[] = [
  {
    id: 1,
    event_id: "AE-1042",
    study_id: "AIIA-CT-001",
    event_type: "AE",
    description: "Mild adverse event record currently under review.",
    severity: "Mild",
    status: "Under Review",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    event_id: "SAE-2081",
    study_id: "AIIA-CT-003",
    event_type: "SAE",
    description:
      "Safety signal requires investigator and pharmacovigilance review.",
    severity: "Serious",
    status: "Pending Action",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    event_id: "AE-1057",
    study_id: "AIIA-CT-005",
    event_type: "AE",
    description: "Safety record awaiting investigator review.",
    severity: "Moderate",
    status: "Under Review",
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    event_id: "AE-1061",
    study_id: "AIIA-CT-005",
    event_type: "AE",
    description: "Follow-up information requested from study site.",
    severity: "Mild",
    status: "Follow-up",
    created_at: new Date().toISOString(),
  },
];

const fallbackAuditRecords: AuditRecord[] = [
  {
    id: 1,
    action: "Study record viewed",
    study_id: "AIIA-CT-003",
    user_role: "Study Coordinator",
    details: "Study details accessed from command center.",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    action: "SAE status updated",
    study_id: "AIIA-CT-003",
    user_role: "Pharmacovigilance",
    details: "Safety event requires review.",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    action: "Recruitment data reviewed",
    study_id: "AIIA-CT-005",
    user_role: "Principal Investigator",
    details: "Recruitment progress reviewed.",
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    action: "Ethics review flagged",
    study_id: "AIIA-CT-005",
    user_role: "Regulatory",
    details: "Ethics status requires monitoring.",
    created_at: new Date().toISOString(),
  },
];

const navigationItems = [
  "Overview",
  "Studies",
  "Recruitment",
  "Safety",
  "Regulatory",
  "Audit Trail",
];

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatAuditTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


function calculateRiskFactors(study: ApiStudy): string[] {
  const factors: string[] = [];

  const progress =
    study.target_participants === 0
      ? 0
      : study.enrolled_participants / study.target_participants;

  if (study.risk_score >= 75) {
    factors.push("Overall study risk is currently in the critical range");
  } else if (study.risk_score >= 50) {
    factors.push("Overall study risk is currently elevated");
  }

  if (progress < 0.5) {
    factors.push("Recruitment is below 50% of the planned target");
  } else if (progress < 0.7) {
    factors.push("Recruitment is below 70% of the planned target");
  } else {
    factors.push("Recruitment is progressing toward the planned target");
  }

  const ethics = study.ethics_status.toLowerCase();

  if (ethics.includes("pending") || ethics.includes("renewal")) {
    factors.push(
      `Ethics status requires attention: ${study.ethics_status}`,
    );
  } else {
    factors.push("Ethics status is currently under control");
  }

  const safety = study.safety_status.toLowerCase();

  if (
    safety.includes("signal") ||
    safety.includes("pending") ||
    safety.includes("monitor")
  ) {
    factors.push(`Safety monitoring: ${study.safety_status}`);
  } else {
    factors.push("No active safety issue is currently indicated");
  }

  return factors.slice(0, 4);
}

function mapStudy(study: ApiStudy): Trial {
  return {
    id: study.study_id,
    title: study.title,
    investigator: study.investigator,
    site: study.site,
    status: study.status,
    target: Number(study.target_participants) || 0,
    enrolled: Number(study.enrolled_participants) || 0,
    riskScore: Number(study.risk_score) || 0,
    nextMilestone: study.next_milestone,
    ethics: study.ethics_status,
    safety: study.safety_status,
    factors: calculateRiskFactors(study),
  };
}

function mapApiAlert(alert: ApiAlert): Alert {
  const severity = alert.severity.toUpperCase();

  let type: Alert["type"] = "INFO";

  if (severity === "HIGH") type = "HIGH";
  else if (severity === "MEDIUM") type = "MEDIUM";

  const createdTime = new Date(alert.created_at);

  return {
    id: alert.id,
    type,
    title: alert.title,
    description: `${alert.study_id} · ${alert.message}`,
    time: Number.isNaN(createdTime.getTime())
      ? "Recent"
      : createdTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
  };
}

function App() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [trials, setTrials] = useState<Trial[]>(demoTrials);

  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [apiAlerts, setApiAlerts] = useState<ApiAlert[]>([]);

  const [safetyEvents, setSafetyEvents] =
    useState<SafetyEvent[]>(fallbackSafetyEvents);

  const [auditRecords, setAuditRecords] =
    useState<AuditRecord[]>(fallbackAuditRecords);

  const [selectedTrialId, setSelectedTrialId] =
    useState("AIIA-CT-003");

  const [showStudyForm, setShowStudyForm] = useState(false);

const [showSafetyForm, setShowSafetyForm] = useState(false);

const [newSafetyEvent, setNewSafetyEvent] = useState({
  study_id: "AIIA-CT-003",
  severity: "Moderate",
  status: "Under Review",
  event_type: "AE",
  description: "",
});
  const [showStudyDetails, setShowStudyDetails] = useState(false);

  const [backendOnline, setBackendOnline] = useState(false);
  const [loadingStudies, setLoadingStudies] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(getCurrentTime());

  const [newStudy, setNewStudy] = useState({
    title: "",
    investigator: "",
    site: "",
    target: "",
    enrolled: "",
    status: "RECRUITING" as TrialStatus,
    ethics: "Approved",
  });

  const selectedTrial =
    trials.find((trial) => trial.id === selectedTrialId) ??
    trials[0];

  const displayAlerts = useMemo(() => {
    if (apiAlerts.length > 0) {
      return apiAlerts.map(mapApiAlert);
    }

    return alerts;
  }, [apiAlerts, alerts]);

  const activeTrials = useMemo(
    () =>
      trials.filter(
        (trial) => trial.status === "ACTIVE",
      ).length,
    [trials],
  );

  const recruitingTrials = useMemo(
    () =>
      trials.filter(
        (trial) => trial.status === "RECRUITING",
      ).length,
    [trials],
  );

  const atRiskTrials = useMemo(
    () =>
      trials.filter(
        (trial) => trial.status === "AT RISK",
      ).length,
    [trials],
  );

  const completedTrials = useMemo(
    () =>
      trials.filter(
        (trial) => trial.status === "COMPLETED",
      ).length,
    [trials],
  );

  const totalTarget = useMemo(
    () =>
      trials.reduce(
        (sum, trial) => sum + trial.target,
        0,
      ),
    [trials],
  );

  const totalEnrolled = useMemo(
    () =>
      trials.reduce(
        (sum, trial) => sum + trial.enrolled,
        0,
      ),
    [trials],
  );

  const recruitmentPercentage =
    totalTarget === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (totalEnrolled / totalTarget) * 100,
          ),
        );

  const updateTimestamp = () =>
    setLastUpdated(getCurrentTime());

  /* ========================================================
     LOAD STUDIES
  ======================================================== */

  const loadStudies = async () => {
    setLoadingStudies(true);
    setErrorMessage("");

    try {
      const data: ApiStudy[] = await getStudies();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid study data received from backend",
        );
      }

      const mappedStudies = data.map(mapStudy);

      setTrials(mappedStudies);
      setUsingDemoData(false);
      setBackendOnline(true);

      if (mappedStudies.length > 0) {
        const selectedStillExists =
          mappedStudies.some(
            (study) => study.id === selectedTrialId,
          );

        if (!selectedStillExists) {
          const atRiskStudy =
            mappedStudies.find(
              (study) => study.status === "AT RISK",
            );

          setSelectedTrialId(
            atRiskStudy?.id ??
              mappedStudies[0].id,
          );
        }
      }

      updateTimestamp();
    } catch (error) {
      console.error(
        "Unable to load studies:",
        error,
      );

      setBackendOnline(false);
      setUsingDemoData(true);

      setErrorMessage(
        "Database unavailable. Showing prototype data.",
      );

      setTrials(demoTrials);

      if (
        !demoTrials.some(
          (study) =>
            study.id === selectedTrialId,
        )
      ) {
        setSelectedTrialId("AIIA-CT-003");
      }
    } finally {
      setLoadingStudies(false);
    }
  };

  /* ========================================================
     LOAD ALERTS
  ======================================================== */

  const loadAlerts = async () => {
    try {
      const data: ApiAlert[] = await getAlerts();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid alert data received from backend",
        );
      }

      setApiAlerts(data);
    } catch (error) {
      console.error(
        "Unable to load alerts:",
        error,
      );

      setApiAlerts([]);
    }
  };

  /* ========================================================
     LOAD SAFETY EVENTS
  ======================================================== */

  const loadSafetyEvents = async () => {
    try {
      const data = await getSafetyEvents();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid safety event data",
        );
      }

      if (data.length > 0) {
        setSafetyEvents(data);
      } else {
        setSafetyEvents(fallbackSafetyEvents);
      }
    } catch (error) {
      console.error(
        "Unable to load safety events:",
        error,
      );

      setSafetyEvents(fallbackSafetyEvents);
    }
  };

  /* ========================================================
     LOAD AUDIT TRAIL
  ======================================================== */

  const loadAuditTrail = async () => {
    try {
      const data = await getAuditTrail();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid audit trail data",
        );
      }

      if (data.length > 0) {
        setAuditRecords(data);
      } else {
        setAuditRecords(fallbackAuditRecords);
      }
    } catch (error) {
      console.error(
        "Unable to load audit trail:",
        error,
      );

      setAuditRecords(fallbackAuditRecords);
    }
  };

  /* ========================================================
     INITIAL LOAD
  ======================================================== */

  useEffect(() => {
    checkBackend()
      .then((data) => {
        console.log(
          "Backend connected:",
          data,
        );

        setBackendOnline(true);
      })
      .catch((error) => {
        console.error(
          "Backend connection failed:",
          error,
        );

        setBackendOnline(false);
      });

    loadStudies();
    loadAlerts();
    loadSafetyEvents();
    loadAuditTrail();
  }, []);

  /* ========================================================
     REFRESH
  ======================================================== */

  const refreshDashboard = async () => {
    await Promise.all([
      loadStudies(),
      loadAlerts(),
      loadSafetyEvents(),
      loadAuditTrail(),
    ]);

    updateTimestamp();
  };

  /* ========================================================
     AUDIT HELPER
  ======================================================== */

  const recordAudit = async (
    action: string,
    studyId?: string,
    details?: string,
    userRole = "System User",
  ) => {
    try {
      const record = await createAuditRecord({
        action,
        study_id: studyId,
        user_role: userRole,
        details,
      });

      setAuditRecords((current) => [
        record,
        ...current,
      ]);
    } catch (error) {
      console.error(
        "Unable to create audit record:",
        error,
      );
    }
  };

  /* ========================================================
     ACKNOWLEDGE ALERT
  ======================================================== */

  const handleAcknowledgeAlert = async (
    alertId: number,
  ) => {
    try {
      if (apiAlerts.length > 0) {
        await acknowledgeAlertApi(alertId);

        setApiAlerts((current) =>
          current.filter(
            (alert) => alert.id !== alertId,
          ),
        );
      } else {
        setAlerts((current) =>
          current.filter(
            (alert) => alert.id !== alertId,
          ),
        );
      }

      await recordAudit(
        "Alert acknowledged",
        undefined,
        `Priority alert ${alertId} was acknowledged from the command center.`,
        "Study Coordinator",
      );

      updateTimestamp();
    } catch (error) {
      console.error(
        "Unable to acknowledge alert:",
        error,
      );

      setErrorMessage(
        "Alert could not be acknowledged. Please check the backend.",
      );
    }
  };

  /* ========================================================
     CREATE STUDY
  ======================================================== */

  const handleCreateStudy = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const target = Number(newStudy.target);
    const enrolled = Number(newStudy.enrolled);

    if (
      !newStudy.title.trim() ||
      !newStudy.investigator.trim() ||
      !newStudy.site.trim() ||
      target <= 0 ||
      enrolled < 0 ||
      enrolled > target
    ) {
      return;
    }

    const progress = enrolled / target;

    let riskScore = 25;

    if (progress < 0.5) {
      riskScore = 72;
    } else if (progress < 0.7) {
      riskScore = 58;
    } else if (progress < 0.85) {
      riskScore = 42;
    }

    if (newStudy.ethics === "Renewal due") {
      riskScore += 8;
    }

    if (newStudy.ethics === "Pending Review") {
      riskScore += 12;
    }

    riskScore = Math.min(95, riskScore);

    const studyNumber =
      Math.max(
        0,
        ...trials.map((trial) => {
          const match =
            trial.id.match(
              /AIIA-CT-(\d+)/,
            );

          return match
            ? Number(match[1])
            : 0;
        }),
      ) + 1;

    const studyId =
      `AIIA-CT-${String(
        studyNumber,
      ).padStart(3, "0")}`;

    const nextMilestone =
      newStudy.ethics === "Renewal due"
        ? "Ethics renewal"
        : "Initial monitoring review";

    try {
      setErrorMessage("");

      const createdStudy: ApiStudy =
        await createStudy({
          study_id: studyId,
          title: newStudy.title.trim(),
          investigator:
            newStudy.investigator.trim(),
          site: newStudy.site.trim(),
          status: newStudy.status,
          target_participants: target,
          enrolled_participants: enrolled,
          risk_score: riskScore,
          next_milestone: nextMilestone,
          ethics_status: newStudy.ethics,
          safety_status: "No Active Signals",
        });

      const mappedStudy =
        mapStudy(createdStudy);

      setTrials((current) => [
        ...current,
        mappedStudy,
      ]);

      setSelectedTrialId(mappedStudy.id);
      setUsingDemoData(false);
      setBackendOnline(true);
      setShowStudyForm(false);

      setNewStudy({
        title: "",
        investigator: "",
        site: "",
        target: "",
        enrolled: "",
        status: "RECRUITING",
        ethics: "Approved",
      });

      await recordAudit(
        "Clinical study created",
        mappedStudy.id,
        `New study "${mappedStudy.title}" was registered in the CTMS.`,
        "Study Coordinator",
      );

      updateTimestamp();
    } catch (error) {
      console.error(
        "Create study failed:",
        error,
      );

      setErrorMessage(
        "Study could not be saved to the database. Check that the backend is running.",
      );
    }
  };
const handleCreateSafetyEvent = async (event: FormEvent) => {
  event.preventDefault();

  try {
    setErrorMessage("");

    const createdEvent = await createSafetyEvent(newSafetyEvent);

    setSafetyEvents((currentEvents) => [
      createdEvent,
      ...currentEvents,
    ]);

    await createAuditRecord({
      action: "Safety event recorded",
      study_id: newSafetyEvent.study_id,
      user_role: "Clinical Safety Officer",
      details: `${newSafetyEvent.event_type} ${createdEvent.event_id} recorded with ${newSafetyEvent.severity} severity.`,
    });

   setAuditRecords((currentRecords) => [
  {
    id: Date.now(),
    action: "Safety event recorded",
    study_id: newSafetyEvent.study_id,
    user_role: "Clinical Safety Officer",
    details: `${newSafetyEvent.event_type} ${createdEvent.event_id} recorded with ${newSafetyEvent.severity} severity.`,
    created_at: new Date().toISOString(),
  },
  ...currentRecords,
]);

    setNewSafetyEvent({
      study_id: "AIIA-CT-003",
      severity: "Moderate",
      status: "Under Review",
      event_type: "AE",
      description: "",
    });

    setShowSafetyForm(false);
    updateTimestamp();
  } catch (error) {
    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Failed to record safety event.",
    );
  }
};
  /* ========================================================
     STATUS / RISK HELPERS
  ======================================================== */

  const getStatusClass = (
    status: TrialStatus,
  ) => {
    switch (status) {
      case "RECRUITING":
        return "status-recruiting";

      case "ACTIVE":
        return "status-active";

      case "AT RISK":
        return "status-risk";

      case "COMPLETED":
        return "status-completed";

      default:
        return "";
    }
  };

  const getRiskClass = (
    score: number,
  ) => {
    if (score >= 75) return "risk-critical";
    if (score >= 50) return "risk-high";
    if (score >= 30) return "risk-medium";

    return "risk-low";
  };

  const getRiskLabel = (
    score: number,
  ) => {
    if (score >= 75) return "Critical";
    if (score >= 50) return "High";
    if (score >= 30) return "Moderate";

    return "Low";
  };

  const getProgress = (
    trial: Trial,
  ) => {
    if (trial.target === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (trial.enrolled /
          trial.target) *
          100,
      ),
    );
  };

  /* ========================================================
     EXPLAINABLE RISK ENGINE
  ======================================================== */

  const getRiskAnalysis = (
    trial: Trial,
  ) => {
    const progress =
      getProgress(trial);

    const factors = [
      {
        key: "overall",
        title: "Overall risk score",
        value: trial.riskScore,
        status:
          trial.riskScore >= 75
            ? "Critical"
            : trial.riskScore >= 50
              ? "Elevated"
              : trial.riskScore >= 30
                ? "Moderate"
                : "Within range",
        detail:
          `System-recorded risk score is ${trial.riskScore}/100.`,
        impact:
          trial.riskScore >= 50
            ? "Primary driver"
            : "Lower contribution",
        action:
          trial.riskScore >= 50
            ? "Continue enhanced monitoring."
            : "Continue routine monitoring.",
      },

      {
        key: "recruitment",
        title: "Recruitment progress",
        value: progress,
        status:
          progress < 50
            ? "Below threshold"
            : progress < 70
              ? "Needs monitoring"
              : "Progressing",
        detail:
          `${trial.enrolled} of ${trial.target} participants enrolled (${progress}%).`,
        impact:
          progress < 50
            ? "High contribution"
            : progress < 70
              ? "Moderate contribution"
              : "Low contribution",
        action:
          progress < 70
            ? "Review recruitment pace and site follow-up."
            : "Maintain recruitment activity.",
      },

      {
        key: "ethics",
        title: "Ethics / regulatory status",
        value:
          trial.ethics
            .toLowerCase()
            .includes("pending") ||
          trial.ethics
            .toLowerCase()
            .includes("renewal")
            ? 60
            : 20,
        status:
          trial.ethics
            .toLowerCase()
            .includes("pending") ||
          trial.ethics
            .toLowerCase()
            .includes("renewal")
            ? "Attention"
            : "Controlled",
        detail:
          `Current ethics status: ${trial.ethics}.`,
        impact:
          trial.ethics
            .toLowerCase()
            .includes("pending") ||
          trial.ethics
            .toLowerCase()
            .includes("renewal")
            ? "Monitoring factor"
            : "Low contribution",
        action:
          trial.ethics
            .toLowerCase()
            .includes("pending") ||
          trial.ethics
            .toLowerCase()
            .includes("renewal")
            ? "Review the pending ethics action."
            : "Maintain current approval record.",
      },

      {
        key: "safety",
        title: "Safety monitoring",
        value:
          trial.safety
            .toLowerCase()
            .includes("signal")
            ? 90
            : trial.safety
                .toLowerCase()
                .includes("monitor")
              ? 55
              : 15,
        status:
          trial.safety
            .toLowerCase()
            .includes("signal")
            ? "Signal under review"
            : trial.safety
                .toLowerCase()
                .includes("monitor")
              ? "Monitoring"
              : "No active signal",
        detail:
          `Current safety status: ${trial.safety}.`,
        impact:
          trial.safety
            .toLowerCase()
            .includes("signal")
            ? "Primary driver"
            : trial.safety
                .toLowerCase()
                .includes("monitor")
              ? "Moderate contribution"
              : "Low contribution",
        action:
          trial.safety
            .toLowerCase()
            .includes("signal")
            ? "Review the safety signal before the next milestone."
            : "Continue routine safety monitoring.",
      },
    ];

    const priorityFactors =
      [...factors]
        .sort(
          (a, b) =>
            b.value - a.value,
        )
        .slice(0, 2);

    const primaryDriver =
      priorityFactors[0];

    const recommendedAction =
      trial.safety
        .toLowerCase()
        .includes("signal")
        ? `Review the safety signal for ${trial.id}.`
        : trial.ethics
            .toLowerCase()
            .includes("pending")
          ? `Complete the pending ethics review for ${trial.id}.`
          : progress < 70
            ? `Review recruitment progress for ${trial.id}.`
            : `Review the ${trial.nextMilestone.toLowerCase()} for ${trial.id}.`;

    return {
      factors,
      primaryDriver,
      recommendedAction,
      progress,
    };
  };

  /* ========================================================
     STUDY DETAILS
  ======================================================== */

  const renderStudyDetails = () => {
    if (!selectedTrial) {
      return (
        <section className="panel">
          <div className="empty-state">
            <strong>No study selected</strong>
            <p>
              Select a clinical study to view
              its details.
            </p>
          </div>
        </section>
      );
    }

    const progress =
      getProgress(selectedTrial);

    const riskLevel =
      getRiskLabel(
        selectedTrial.riskScore,
      );

    const analysis =
      getRiskAnalysis(
        selectedTrial,
      );

    let riskExplanation =
      "Current study indicators remain within a lower-risk monitoring range.";

    if (
      selectedTrial.riskScore >= 75
    ) {
      riskExplanation =
        "This study is currently in a critical risk range and should receive priority operational review.";
    } else if (
      selectedTrial.riskScore >= 50
    ) {
      riskExplanation =
        "This study has elevated monitoring indicators. The factors below show which operational signals are contributing to the current risk level.";
    } else if (
      selectedTrial.riskScore >= 30
    ) {
      riskExplanation =
        "This study has moderate monitoring requirements. The contributing indicators are shown below for traceable review.";
    }

    return (
      <>
        <section className="study-details-header">
          <button
            className="secondary-button"
            onClick={() => {
              setShowStudyDetails(false);

              recordAudit(
                "Study details closed",
                selectedTrial.id,
                "Study detail view closed.",
                "Study Coordinator",
              );
            }}
          >
            ← Back to Studies
          </button>

          <div className="study-details-title">
            <div>
              <span className="eyebrow">
                STUDY DETAILS
              </span>

              <h2>
                {selectedTrial.title}
              </h2>

              <p>
                {selectedTrial.id} ·{" "}
                {selectedTrial.site}
              </p>
            </div>

            <span
              className={`status-badge ${getStatusClass(
                selectedTrial.status,
              )}`}
            >
              {selectedTrial.status}
            </span>
          </div>
        </section>

        <section className="study-detail-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>
                  Study Information
                </h3>

                <p>
                  Core clinical trial
                  registration details
                </p>
              </div>
            </div>

            <div className="detail-info-grid">
              <div>
                <span>Study ID</span>
                <strong>
                  {selectedTrial.id}
                </strong>
              </div>

              <div>
                <span>
                  Principal Investigator
                </span>

                <strong>
                  {selectedTrial.investigator}
                </strong>
              </div>

              <div>
                <span>Study Site</span>

                <strong>
                  {selectedTrial.site}
                </strong>
              </div>

              <div>
                <span>Study Status</span>

                <strong>
                  {selectedTrial.status}
                </strong>
              </div>

              <div>
                <span>Ethics Status</span>

                <strong>
                  {selectedTrial.ethics}
                </strong>
              </div>

              <div>
                <span>Safety Status</span>

                <strong>
                  {selectedTrial.safety}
                </strong>
              </div>

              <div>
                <span>Next Milestone</span>

                <strong>
                  {selectedTrial.nextMilestone}
                </strong>
              </div>

              <div>
                <span>
                  Last System Update
                </span>

                <strong>
                  {lastUpdated}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>
                  Recruitment Status
                </h3>

                <p>
                  Participant enrollment
                </p>
              </div>

              <strong className="detail-percentage">
                {progress}%
              </strong>
            </div>

            <div className="detail-recruitment-number">
              <strong>
                {selectedTrial.enrolled}
              </strong>

              <span>
                / {selectedTrial.target}{" "}
                participants
              </span>
            </div>

            <div className="progress-track large-progress">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="detail-recruitment-meta">
              <span>
                Enrolled
                <strong>
                  {selectedTrial.enrolled}
                </strong>
              </span>

              <span>
                Remaining
                <strong>
                  {Math.max(
                    0,
                    selectedTrial.target -
                      selectedTrial.enrolled,
                  )}
                </strong>
              </span>
            </div>
          </div>
        </section>

        <section className="panel detail-risk-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                DECISION SUPPORT
              </span>

              <h3>
                Explainable Risk Analysis
              </h3>

              <p>
                Evidence-based operational
                indicators behind the current
                study risk level.
              </p>
            </div>

            <span
              className={`risk-label ${getRiskClass(
                selectedTrial.riskScore,
              )}`}
            >
              {riskLevel}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(180px, 0.7fr) minmax(280px, 1.3fr)",
              gap: "24px",
              alignItems: "stretch",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "22px",
                border:
                  "1px solid rgba(0,0,0,0.08)",
                borderRadius: "16px",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing:
                    "0.08em",
                  opacity: 0.65,
                  marginBottom: "8px",
                }}
              >
                CURRENT RISK SCORE
              </span>

              <div className="detail-risk-score">
                <strong>
                  {selectedTrial.riskScore}
                </strong>

                <span>/100</span>
              </div>

              <p className="risk-explanation">
                {riskExplanation}
              </p>
            </div>

            <div
              style={{
                padding: "22px",
                border:
                  "1px solid rgba(0,0,0,0.08)",
                borderRadius: "16px",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing:
                    "0.08em",
                  opacity: 0.65,
                  marginBottom: "8px",
                }}
              >
                PRIMARY RISK DRIVER
              </span>

              <h3
                style={{
                  margin: "0 0 8px",
                }}
              >
                {analysis.primaryDriver.title}
              </h3>

              <p
                style={{
                  margin: "0 0 12px",
                  lineHeight: 1.6,
                }}
              >
                {analysis.primaryDriver.detail}
              </p>

              <strong>
                {analysis.primaryDriver.impact}
              </strong>
            </div>
          </div>

          <div
            className="panel-header"
            style={{
              marginBottom: "12px",
            }}
          >
            <div>
              <h3>
                Contributing Indicators
              </h3>

              <p>
                Each indicator is calculated
                from the current study record.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "14px",
            }}
          >
            {analysis.factors.map(
              (factor, index) => (
                <div
                  key={factor.key}
                  style={{
                    padding: "18px",
                    border:
                      "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      alignItems:
                        "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius:
                          "50%",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontWeight: 800,
                        fontSize: "12px",
                        background:
                          "rgba(0,0,0,0.06)",
                      }}
                    >
                      {index + 1}
                    </span>

                    <strong
                      style={{
                        fontSize: "12px",
                        textAlign:
                          "right",
                      }}
                    >
                      {factor.status}
                    </strong>
                  </div>

                  <h4
                    style={{
                      margin: "0 0 8px",
                    }}
                  >
                    {factor.title}
                  </h4>

                  <p
                    style={{
                      margin:
                        "0 0 12px",
                      fontSize: "14px",
                      lineHeight: 1.55,
                      opacity: 0.78,
                    }}
                  >
                    {factor.detail}
                  </p>

                  <div
                    style={{
                      height: "6px",
                      background:
                        "rgba(0,0,0,0.08)",
                      borderRadius:
                        "999px",
                      overflow: "hidden",
                      marginBottom:
                        "10px",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            8,
                            factor.value,
                          ),
                        )}%`,
                        height: "100%",
                        background:
                          "currentColor",
                        opacity: 0.75,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <span>
                      {factor.impact}
                    </span>

                    <strong>
                      {factor.value}/100
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "12px",
                      borderTop:
                        "1px solid rgba(0,0,0,0.07)",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing:
                          "0.08em",
                        opacity: 0.55,
                        marginBottom:
                          "4px",
                      }}
                    >
                      OPERATIONAL RESPONSE
                    </span>

                    <span
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.45,
                      }}
                    >
                      {factor.action}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>

          <div
            className="recommended-action"
            style={{
              marginTop: "20px",
            }}
          >
            <span>
              RECOMMENDED NEXT ACTION
            </span>

            <strong>
              {analysis.recommendedAction}
            </strong>

            <p>
              This recommendation is based
              on the current monitoring
              indicators recorded for this
              study. It supports review by the
              responsible clinical or
              operational team and does not
              replace investigator or safety
              decision-making.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Study Actions</h3>

              <p>
                Current operational
                checkpoints
              </p>
            </div>
          </div>

          <div className="detail-action-list">
            <div>
              <span>NEXT MILESTONE</span>

              <strong>
                {selectedTrial.nextMilestone}
              </strong>
            </div>

            <div>
              <span>ETHICS</span>

              <strong>
                {selectedTrial.ethics}
              </strong>
            </div>

            <div>
              <span>SAFETY</span>

              <strong>
                {selectedTrial.safety}
              </strong>
            </div>

            <div>
              <span>RECRUITMENT</span>

              <strong>
                {progress < 60 &&
                selectedTrial.status !==
                  "COMPLETED"
                  ? "Requires monitoring"
                  : "On track"}
              </strong>
            </div>
          </div>

          <div className="recommended-action">
            <span>CURRENT ACTION</span>

            <strong>
              {analysis.recommendedAction}
            </strong>

            <p>
              The command center has identified
              this as the next operational
              checkpoint for the study.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>
                Recent Study Activity
              </h3>

              <p>
                Latest recorded monitoring
                events
              </p>
            </div>

            <span className="live-badge">
              TRACEABLE
            </span>
          </div>

          <div className="study-activity-list">
            <div>
              <span>
                {lastUpdated}
              </span>

              <div>
                <strong>
                  Study record viewed
                </strong>

                <p>
                  Study details accessed from
                  the clinical trials command
                  center.
                </p>
              </div>
            </div>

            <div>
              <span>Current</span>

              <div>
                <strong>
                  Risk assessment available
                </strong>

                <p>
                  Risk score and contributing
                  monitoring factors are
                  available for review.
                </p>
              </div>
            </div>

            <div>
              <span>Current</span>

              <div>
                <strong>
                  Recruitment monitoring active
                </strong>

                <p>
                  Participant enrollment is
                  being tracked against the
                  planned target.
                </p>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  };

  /* ========================================================
     OVERVIEW
  ======================================================== */

  const renderOverview = () => {
    if (!selectedTrial) {
      return (
        <section className="panel">
          <div className="empty-state">
            <strong>
              No clinical trials found
            </strong>

            <p>
              Connect the backend and add
              study records to begin
              monitoring.
            </p>
          </div>
        </section>
      );
    }

    const overviewAnalysis =
      getRiskAnalysis(
        selectedTrial,
      );

    return (
      <>
        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Studies</span>

            <strong>
              {trials.length}
            </strong>

            <small>
              {completedTrials} completed
            </small>
          </div>

          <div className="stat-card">
            <span>Active Studies</span>

            <strong>
              {activeTrials}
            </strong>

            <small>
              {recruitingTrials} recruiting
            </small>
          </div>

          <div className="stat-card">
            <span>At Risk</span>

            <strong>
              {atRiskTrials}
            </strong>

            <small>
              Requires attention
            </small>
          </div>

          <div className="stat-card">
            <span>Participants</span>

            <strong>
              {totalEnrolled}
            </strong>

            <small>
              {recruitmentPercentage}% of target
            </small>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Study Portfolio</h3>

              <p>
                Unified view of registered
                clinical trials
              </p>
            </div>

            <span>
              {trials.length} studies
            </span>
          </div>

          <div className="portfolio-table">
            <div className="portfolio-row portfolio-heading">
              <span>Study</span>
              <span>Site</span>
              <span>Status</span>
              <span>Recruitment</span>
              <span>Risk</span>
            </div>

            {trials.map((trial) => (
              <button
                className="portfolio-row"
                key={trial.id}
                onClick={() => {
                  setSelectedTrialId(
                    trial.id,
                  );

                  setActiveSection(
                    "Studies",
                  );

                  setShowStudyDetails(
                    true,
                  );

                  updateTimestamp();

                  recordAudit(
                    "Study record viewed",
                    trial.id,
                    "Study opened from portfolio.",
                    "Study Coordinator",
                  );
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong>
                    {trial.title}
                  </strong>

                  <span>
                    {trial.id}
                  </span>
                </div>

                <div>
                  <strong>
                    {trial.site}
                  </strong>

                  <span>
                    {trial.investigator}
                  </span>
                </div>

                <span
                  className={`status-badge ${getStatusClass(
                    trial.status,
                  )}`}
                >
                  {trial.status}
                </span>

                <span>
                  {trial.enrolled}/
                  {trial.target}
                </span>

                <span
                  className={`risk-score ${getRiskClass(
                    trial.riskScore,
                  )}`}
                >
                  {trial.riskScore}/100
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="two-column">
          <div className="panel risk-panel">
            <div className="panel-header">
              <div>
                <h3>
                  Explainable Trial Risk
                </h3>

                <p>
                  Why this study requires
                  attention
                </p>
              </div>

              <span
                className={`risk-label ${getRiskClass(
                  selectedTrial.riskScore,
                )}`}
              >
                {getRiskLabel(
                  selectedTrial.riskScore,
                )}
              </span>
            </div>

            <span className="selected-label">
              SELECTED STUDY
            </span>

            <h2>
              {selectedTrial.title}
            </h2>

            <p>
              {selectedTrial.id} ·{" "}
              {selectedTrial.site}
            </p>

            <div className="risk-number">
              <strong>
                {selectedTrial.riskScore}
              </strong>

              <span>/100</span>
            </div>

            <p>
              Overall risk score
            </p>

            <div className="risk-factors">
              {overviewAnalysis.factors.map(
                (factor) => (
                  <div
                    key={factor.key}
                  >
                    <span>
                      {factor.title}
                    </span>

                    <strong>
                      {factor.status}
                    </strong>
                  </div>
                ),
              )}
            </div>

            <div className="recommended-action">
              <span>
                RECOMMENDED NEXT ACTION
              </span>

              <strong>
                {
                  overviewAnalysis.recommendedAction
                }
              </strong>
            </div>

            <button
              className="primary-button"
              style={{
                marginTop: "16px",
              }}
              onClick={() => {
                setActiveSection(
                  "Studies",
                );

                setShowStudyDetails(
                  true,
                );

                recordAudit(
                  "Study details opened",
                  selectedTrial.id,
                  "Full study details opened from explainable risk panel.",
                  "Study Coordinator",
                );
              }}
            >
              Open Full Study Details →
            </button>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>
                  Recruitment Monitoring
                </h3>

                <p>
                  Participant enrollment
                  across studies
                </p>
              </div>
            </div>

            <div className="big-number">
              <strong>
                {totalEnrolled}
              </strong>

              <span>
                participants enrolled
              </span>
            </div>

            <div className="recruitment-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${recruitmentPercentage}%`,
                }}
              />
            </div>

            <div className="recruitment-meta">
              <span>
                Portfolio target{" "}
                <strong>
                  {totalTarget}
                </strong>
              </span>

              <span>
                {recruitmentPercentage}%
                overall
              </span>
            </div>

            <p>
              {Math.max(
                0,
                totalTarget -
                  totalEnrolled,
              )}{" "}
              participants remaining
              across the portfolio.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Priority Alerts</h3>

              <p>
                Actions requiring review
              </p>
            </div>

            <strong>
              {displayAlerts.length}
            </strong>
          </div>

          <div className="alert-list">
            {displayAlerts.length ===
            0 ? (
              <div className="empty-state">
                <strong>
                  No outstanding alerts
                </strong>

                <p>
                  All current priority
                  actions have been
                  acknowledged.
                </p>
              </div>
            ) : (
              displayAlerts.map(
                (alert) => (
                  <div
                    className="alert-row"
                    key={alert.id}
                  >
                    <span
                      className={`alert-dot alert-${alert.type.toLowerCase()}`}
                    >
                      !
                    </span>

                    <div>
                      <strong>
                        {alert.title}
                      </strong>

                      <p>
                        {alert.description}
                      </p>

                      <small>
                        {alert.time}
                      </small>
                    </div>

                    <button
                      onClick={() =>
                        handleAcknowledgeAlert(
                          alert.id,
                        )
                      }
                    >
                      Acknowledge
                    </button>
                  </div>
                ),
              )
            )}
          </div>
        </section>
      </>
    );
  };

  /* ========================================================
     STUDIES
  ======================================================== */

  const renderStudies = () => {
    if (showStudyDetails) {
      return renderStudyDetails();
    }

    return (
      <>
        {showStudyForm && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowStudyForm(
                  false,
                );
              }
            }}
          >
            <div
              className="study-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">
                    STUDY REGISTRATION
                  </span>

                  <h2>
                    Create New Clinical
                    Study
                  </h2>

                  <p>
                    Register a new Ayurveda
                    clinical trial in the
                    CTMS.
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowStudyForm(
                      false,
                    )
                  }
                  type="button"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateStudy
                }
              >
                <div className="form-grid">
                  <label>
                    Study Title

                    <input
                      type="text"
                      placeholder="e.g. Ayurveda Hypertension Study"
                      value={
                        newStudy.title
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          title:
                            event.target
                              .value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Principal Investigator

                    <input
                      type="text"
                      placeholder="Dr. Investigator Name"
                      value={
                        newStudy.investigator
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          investigator:
                            event.target
                              .value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Study Site

                    <input
                      type="text"
                      placeholder="AIIA New Delhi"
                      value={
                        newStudy.site
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          site:
                            event.target
                              .value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Target Participants

                    <input
                      type="number"
                      min="1"
                      placeholder="100"
                      value={
                        newStudy.target
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          target:
                            event.target
                              .value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Currently Enrolled

                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={
                        newStudy.enrolled
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          enrolled:
                            event.target
                              .value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Study Status

                    <select
                      value={
                        newStudy.status
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          status:
                            event.target
                              .value as TrialStatus,
                        })
                      }
                    >
                      <option value="RECRUITING">
                        Recruiting
                      </option>

                      <option value="ACTIVE">
                        Active
                      </option>

                      <option value="AT RISK">
                        At Risk
                      </option>

                      <option value="COMPLETED">
                        Completed
                      </option>
                    </select>
                  </label>

                  <label>
                    Ethics Approval

                    <select
                      value={
                        newStudy.ethics
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewStudy({
                          ...newStudy,
                          ethics:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option value="Approved">
                        Approved
                      </option>

                      <option value="Pending Review">
                        Pending Review
                      </option>

                      <option value="Renewal due">
                        Renewal due
                      </option>

                      <option value="Closed">
                        Closed
                      </option>
                    </select>
                  </label>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setShowStudyForm(
                        false,
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    Create Study
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="panel full-panel">
          <div className="panel-header">
            <div>
              <h3>
                Clinical Study Registry
              </h3>

              <p>
                All studies registered in
                the CTMS
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setShowStudyForm(true)
              }
            >
              + New Study
            </button>
          </div>

          <div className="study-cards">
            {trials.map((trial) => (
              <div
                className="study-card"
                key={trial.id}
              >
                <div className="study-card-top">
                  <div>
                    <span>
                      {trial.id}
                    </span>

                    <h3>
                      {trial.title}
                    </h3>
                  </div>

                  <span
                    className={`status-badge ${getStatusClass(
                      trial.status,
                    )}`}
                  >
                    {trial.status}
                  </span>
                </div>

                <div className="study-meta">
                  <div>
                    <span>
                      Investigator
                    </span>

                    <strong>
                      {trial.investigator}
                    </strong>
                  </div>

                  <div>
                    <span>Site</span>

                    <strong>
                      {trial.site}
                    </strong>
                  </div>

                  <div>
                    <span>Ethics</span>

                    <strong>
                      {trial.ethics}
                    </strong>
                  </div>

                  <div>
                    <span>Safety</span>

                    <strong>
                      {trial.safety}
                    </strong>
                  </div>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setSelectedTrialId(
                      trial.id,
                    );

                    setShowStudyDetails(
                      true,
                    );

                    updateTimestamp();

                    recordAudit(
                      "Study record viewed",
                      trial.id,
                      "Study opened from study registry.",
                      "Study Coordinator",
                    );
                  }}
                >
                  View Study →
                </button>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  };

  /* ========================================================
     RECRUITMENT
  ======================================================== */

  const renderRecruitment = () => {
    const recruitingStudies =
      trials.filter(
        (trial) =>
          trial.status ===
          "RECRUITING",
      );

    const attentionStudies =
      trials.filter(
        (trial) =>
          getProgress(trial) < 60 &&
          trial.status !==
            "COMPLETED",
      );

    return (
      <section className="module-grid">
        <div className="panel module-main">
          <div className="panel-header">
            <div>
              <h3>
                Recruitment Monitoring
              </h3>

              <p>
                Track participant enrollment
                and identify recruitment
                delays across study sites.
              </p>
            </div>

            <span className="live-badge">
              LIVE
            </span>
          </div>

          <div className="recruitment-summary">
            <div>
              <span>
                Portfolio Target
              </span>

              <strong>
                {totalTarget}
              </strong>

              <small>
                participants
              </small>
            </div>

            <div>
              <span>Enrolled</span>

              <strong>
                {totalEnrolled}
              </strong>

              <small>
                participants
              </small>
            </div>

            <div>
              <span>Remaining</span>

              <strong>
                {Math.max(
                  0,
                  totalTarget -
                    totalEnrolled,
                )}
              </strong>

              <small>
                participants
              </small>
            </div>

            <div>
              <span>
                Overall Progress
              </span>

              <strong>
                {recruitmentPercentage}%
              </strong>

              <small>
                of portfolio target
              </small>
            </div>
          </div>

          <div className="portfolio-progress">
            <div className="portfolio-progress-header">
              <strong>
                Overall recruitment
                progress
              </strong>

              <span>
                {totalEnrolled} /{" "}
                {totalTarget}
              </span>
            </div>

            <div className="progress-track large-progress">
              <div
                className="progress-fill"
                style={{
                  width: `${recruitmentPercentage}%`,
                }}
              />
            </div>
          </div>

          <div className="module-table">
            <div className="table-heading">
              <span>Study</span>
              <span>Progress</span>
              <span>Status</span>
            </div>

            {trials.map((trial) => {
              const progress =
                getProgress(trial);

              return (
                <div
                  className="recruitment-row"
                  key={trial.id}
                >
                  <div>
                    <strong>
                      {trial.title}
                    </strong>

                    <span>
                      {trial.id} ·{" "}
                      {trial.site}
                    </span>
                  </div>

                  <div className="module-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <span>
                      {trial.enrolled}/
                      {trial.target}
                    </span>
                  </div>

                  <div className="recruitment-status">
                    <strong>
                      {progress}%
                    </strong>

                    <span
                      className={`status-badge ${
                        progress < 60 &&
                        trial.status !==
                          "COMPLETED"
                          ? "status-risk"
                          : getStatusClass(
                              trial.status,
                            )
                      }`}
                    >
                      {progress < 60 &&
                      trial.status !==
                        "COMPLETED"
                        ? "LAGGING"
                        : trial.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel insight-panel">
          <h3>
            Recruitment Insights
          </h3>

          <p>
            Automated portfolio-level
            observations
          </p>

          <div className="insight">
            <span className="insight-number">
              {
                recruitingStudies.length
              }
            </span>

            <div>
              <strong>
                Studies recruiting
              </strong>

              <p>
                Active participant
                enrollment is underway.
              </p>
            </div>
          </div>

          <div className="insight">
            <span className="insight-number">
              {
                attentionStudies.length
              }
            </span>

            <div>
              <strong>
                Studies needing attention
              </strong>

              <p>
                Recruitment progress is
                below the monitoring
                threshold.
              </p>
            </div>
          </div>

          <div className="insight">
            <span className="insight-number">
              {recruitmentPercentage}%
            </span>

            <div>
              <strong>
                Portfolio completion
              </strong>

              <p>
                Overall enrollment against
                planned targets.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  };

  /* ========================================================
     SAFETY
  ======================================================== */

  const renderSafety = () => {
    const openAEs =
      safetyEvents.filter(
        (event) =>
          event.event_type === "AE" &&
          !event.status
            .toLowerCase()
            .includes("resolved"),
      ).length;

    const openSAEs =
      safetyEvents.filter(
        (event) =>
          event.event_type === "SAE" &&
          !event.status
            .toLowerCase()
            .includes("resolved"),
      ).length;

    const pendingReview =
      safetyEvents.filter((event) =>
        event.status
          .toLowerCase()
          .includes("review"),
      ).length;

    return (
      <section className="module-grid">
        <div className="panel module-main">
          <div className="panel-header">
            <div>
              <h3>
                Safety & Pharmacovigilance
              </h3>

              <p>
                Monitor adverse events,
                serious adverse events and
                safety-reporting actions
                across studies.
              </p>
            </div>

    <button
  className="primary-button"
  onClick={() => {
    setErrorMessage("");
    setShowSafetyForm(true);
  }}
>
  + Record Event
</button>
          </div>

          <div className="safety-stats">
            <div>
              <span>Open AEs</span>

              <strong>{openAEs}</strong>

              <small>
                Across active studies
              </small>
            </div>

            <div>
              <span>Open SAEs</span>

              <strong className="danger-text">{openSAEs}</strong>

              <small>
                Requires action
              </small>
            </div>

            <div>
              <span>Resolved</span>

             <strong>
  {safetyEvents.filter(
    (event) =>
      event.status.toLowerCase().includes("resolved"),
  ).length}
</strong>

              <small>
                Closed records
              </small>
            </div>

            <div>
              <span>
                Pending Review
              </span>

              <strong>{pendingReview}</strong>

              <small>
                Investigator action
              </small>
            </div>
          </div>

          <div className="panel-section-title">
            <h3>
              Safety Event Register
            </h3>

            <p>
              Recent adverse event activity
            </p>
          </div>
{showSafetyForm && (
  <form
    className="study-form"
    onSubmit={handleCreateSafetyEvent}
  >
    <div className="form-grid">
      <label>
        Study ID
        <select
          value={newSafetyEvent.study_id}
          onChange={(e) =>
            setNewSafetyEvent({
              ...newSafetyEvent,
              study_id: e.target.value,
            })
          }
        >
          <option value="AIIA-CT-001">
            AIIA-CT-001
          </option>
          <option value="AIIA-CT-002">
            AIIA-CT-002
          </option>
          <option value="AIIA-CT-003">
            AIIA-CT-003
          </option>
          <option value="AIIA-CT-004">
            AIIA-CT-004
          </option>
          <option value="AIIA-CT-005">
            AIIA-CT-005
          </option>
        </select>
      </label>

      <label>
        Event Type
        <select
          value={newSafetyEvent.event_type}
          onChange={(e) =>
            setNewSafetyEvent({
              ...newSafetyEvent,
              event_type: e.target.value,
            })
          }
        >
          <option value="AE">
            Adverse Event (AE)
          </option>
          <option value="SAE">
            Serious Adverse Event (SAE)
          </option>
        </select>
      </label>

      <label>
        Severity
        <select
          value={newSafetyEvent.severity}
          onChange={(e) =>
            setNewSafetyEvent({
              ...newSafetyEvent,
              severity: e.target.value,
            })
          }
        >
          <option value="Mild">Mild</option>
          <option value="Moderate">Moderate</option>
          <option value="Severe">Severe</option>
        </select>
      </label>

      <label>
        Status
        <select
          value={newSafetyEvent.status}
          onChange={(e) =>
            setNewSafetyEvent({
              ...newSafetyEvent,
              status: e.target.value,
            })
          }
        >
          <option value="Under Review">
            Under Review
          </option>
          <option value="Pending Action">
            Pending Action
          </option>
          <option value="Resolved">
            Resolved
          </option>
        </select>
      </label>
    </div>

    <label>
      Event Description
      <textarea
        value={newSafetyEvent.description}
        onChange={(e) =>
          setNewSafetyEvent({
            ...newSafetyEvent,
            description: e.target.value,
          })
        }
        placeholder="Describe the adverse event..."
        rows={4}
        required
      />
    </label>

    <div className="form-actions">
      <button
        type="submit"
        className="primary-button"
      >
        Save Safety Event
      </button>

      <button
        type="button"
        className="secondary-button"
        onClick={() => setShowSafetyForm(false)}
      >
        Cancel
      </button>
    </div>
  </form>
)}
          <div className="event-list">
            {safetyEvents.map(
              (event) => (
                <div
                  className="event-row"
                  key={event.event_id}
                >
                  <span
                    className={`event-type ${
                      event.event_type ===
                      "SAE"
                        ? "serious"
                        : ""
                    }`}
                  >
                    {event.event_type}
                  </span>

                  <div className="event-details">
                    <div className="event-title-row">
                      <strong>
                        {event.study_id}
                      </strong>

                      <span className="event-id">
                        {event.event_id}
                      </span>
                    </div>

                    <p>
                      {event.description}
                    </p>

                    <div className="event-meta">
                      <span>
                        Severity:{" "}
                        <strong>
                          {event.severity}
                        </strong>
                      </span>

                      <span>
                       <span>Recorded</span>
                      </span>
                    </div>
                  </div>

         <select
  className="event-status"
  value={event.status}
  onChange={async (e) => {
    try {
      const updatedEvent = await updateSafetyEventStatus(
        event.id,
        e.target.value,
      );

      setSafetyEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === updatedEvent.id
            ? updatedEvent
            : currentEvent,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update safety event.",
      );
    }
  }}
>
  <option value="Under Review">
    Under Review
  </option>

  <option value="Pending Action">
    Pending Action
  </option>

  <option value="Resolved">
    Resolved
  </option>
</select>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="panel insight-panel">
          <h3>
            Safety Monitoring
          </h3>

          <p>
            Priority safety actions
          </p>

          <div className="safety-message danger">
            <span className="message-label">
  {openSAEs > 0
    ? "HIGH PRIORITY"
    : pendingReview > 0
      ? "REVIEW REQUIRED"
      : "MONITORING"}
</span>

           <strong>
  {openSAEs} SAE requires action
</strong>

           <p>
  {openSAEs > 0
    ? "A serious adverse event is awaiting safety review."
    : pendingReview > 0
      ? "Safety events are currently awaiting review."
      : "No safety events are currently awaiting review."}
</p>

            <button
              className="secondary-button"
              onClick={() => {
                setSelectedTrialId(
  safetyEvents.find(
    (event) =>
      event.event_type === "SAE" &&
      !event.status.toLowerCase().includes("resolved"),
  )?.study_id || "AIIA-CT-003",
);

                setActiveSection(
                  "Studies",
                );

                setShowStudyDetails(
                  true,
                );

                recordAudit(
                  "Safety review opened",
                  "AIIA-CT-003",
                  "SAE review opened from safety monitoring.",
                  "Pharmacovigilance",
                );
              }}
            >
              Review SAE
            </button>
          </div>

          <div className="safety-message">
            <span className="message-label">
              FOLLOW-UP
            </span>

            <strong>
              {pendingReview || 2} events
              pending review
            </strong>

            <p>
              Investigator review is required
              before these records can be
              closed.
            </p>
          </div>

          <div className="safety-message">
            <span className="message-label">
              AUDIT READY
            </span>

            <strong>
              Safety records retained
            </strong>

            <p>
              Safety records remain
              available through the audit
              trail.
            </p>
          </div>
        </div>
      </section>
    );
  };

  /* ========================================================
     REGULATORY
  ======================================================== */

  const renderRegulatory =
    () => (
      <section className="module-grid">
        <div className="panel module-main">
          <div className="panel-header">
            <div>
              <h3>
                Regulatory & Ethics
              </h3>

              <p>
                Track ethics approvals,
                renewals, amendments and
                regulatory milestones.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setErrorMessage(
                  "Regulatory record creation is represented by the study ethics and milestone records currently connected to PostgreSQL.",
                )
              }
            >
              + Add Regulatory Record
            </button>
          </div>

          <div className="regulatory-list">
            {trials.map((trial) => (
              <div
                className="regulatory-row"
                key={trial.id}
              >
                <div>
                  <strong>
                    {trial.id}
                  </strong>

                  <h3>
                    {trial.title}
                  </h3>

                  <span>
                    {trial.site}
                  </span>
                </div>

                <div>
                  <span>
                    Ethics status
                  </span>

                  <strong>
                    {trial.ethics}
                  </strong>
                </div>

                <div>
                  <span>
                    Next milestone
                  </span>

                  <strong>
                    {trial.nextMilestone}
                  </strong>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setSelectedTrialId(
                      trial.id,
                    );

                    setActiveSection(
                      "Studies",
                    );

                    setShowStudyDetails(
                      true,
                    );

                    updateTimestamp();

                    recordAudit(
                      "Regulatory study reviewed",
                      trial.id,
                      "Study opened from regulatory review.",
                      "Regulatory",
                    );
                  }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel insight-panel">
          <h3>
            Regulatory Alerts
          </h3>

          <p>
            Upcoming compliance actions
          </p>

          <div className="safety-message danger">
            <span className="message-label">
              MONITOR
            </span>

            <strong>
              Ethics review required
            </strong>

            <p>
              Studies with pending or
              renewal-related ethics statuses
              should be reviewed before their
              next milestone.
            </p>
          </div>

          <div className="safety-message">
            <span className="message-label">
              PORTFOLIO
            </span>

            <strong>
              {trials.length} study records
            </strong>

            <p>
              Regulatory and ethics
              information is being tracked
              across the current portfolio.
            </p>
          </div>
        </div>
      </section>
    );

  /* ========================================================
     AUDIT TRAIL
  ======================================================== */

  const renderAuditTrail =
    () => (
      <section className="module-grid">
        <div className="panel module-main">
          <div className="panel-header">
            <div>
              <h3>
                Audit Trail
              </h3>

              <p>
                Timestamped record of important
                clinical trial system actions.
              </p>
            </div>

            <span className="live-badge">
              TRACEABLE
            </span>
          </div>

          <div className="audit-list">
            {auditRecords
              .slice(0, 20)
              .map((record) => (
                <div
                  className="audit-row"
                  key={record.id}
                >
                  <span>
                    {formatAuditTime(
                      record.created_at,
                    )}
                  </span>

                  <strong>
                    {record.action}
                  </strong>

                  <span>
                    {record.study_id ??
                      "SYSTEM"}
                  </span>

                  <span>
                    {record.user_role}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="panel insight-panel">
          <h3>
            Data Integrity
          </h3>

          <p>
            Database-backed audit controls
          </p>

          <div className="integrity-score">
            <strong>100%</strong>

            <span>
              Audit coverage
            </span>
          </div>

          <div className="integrity-item">
            <span>
              Timestamped actions
            </span>

            <strong>ON</strong>
          </div>

          <div className="integrity-item">
            <span>
              User attribution
            </span>

            <strong>ON</strong>
          </div>

          <div className="integrity-item">
            <span>
              Record traceability
            </span>

            <strong>ON</strong>
          </div>

          <div className="safety-message">
            <strong>
              ALCOA+ foundation
            </strong>

            <p>
              The prototype demonstrates
              traceability controls that can
              support stronger regulated
              data-integrity workflows.
            </p>
          </div>
        </div>
      </section>
    );

  /* ========================================================
     CONTENT ROUTER
  ======================================================== */

  const renderContent = () => {
    switch (activeSection) {
      case "Studies":
        return renderStudies();

      case "Recruitment":
        return renderRecruitment();

      case "Safety":
        return renderSafety();

      case "Regulatory":
        return renderRegulatory();

      case "Audit Trail":
        return renderAuditTrail();

      case "Overview":
      default:
        return renderOverview();
    }
  };

  /* ========================================================
     FINAL PAGE
  ======================================================== */

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <div className="brand-mark">
            A
          </div>

          <div>
            <h1>
              AIIA Clinical Trials
              Command Center
            </h1>

            <p>
              Real-Time Ayurveda Clinical
              Trial Management System
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="live-monitoring">
            <span
              className={`live-dot ${
                backendOnline
                  ? ""
                  : "offline-dot"
              }`}
            />

            {backendOnline
              ? "LIVE MONITORING"
              : "DEMO MONITORING"}
          </span>

          <button
            className="refresh-button"
            onClick={
              refreshDashboard
            }
            disabled={loadingStudies}
          >
            {loadingStudies
              ? "↻ Loading..."
              : "↻ Refresh"}
          </button>
        </div>
      </header>

      <div className="main-layout">
        <aside
          className={`sidebar ${
            sidebarOpen
              ? ""
              : "sidebar-closed"
          }`}
        >
          <button
            className="sidebar-toggle"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close sidebar"
          >
            ‹
          </button>

          <div className="sidebar-label">
            COMMAND CENTER
          </div>

          <nav>
            {navigationItems.map(
              (item) => (
                <button
                  key={item}
                  className={`nav-item ${
                    activeSection ===
                    item
                      ? "nav-item-active"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveSection(
                      item,
                    );

                    if (
                      item !==
                      "Studies"
                    ) {
                      setShowStudyDetails(
                        false,
                      );
                    }
                  }}
                >
                  <span>
                    {item}
                  </span>

                  {item ===
                    "Safety" && (
                    <span className="nav-count">
                      {safetyEvents.length}
                    </span>
                  )}
                </button>
              ),
            )}
          </nav>

          <div className="sidebar-status">
            <div>
              <span
                className={
                  backendOnline
                    ? "status-online"
                    : "status-offline"
                }
              />

              <strong>
                {backendOnline
                  ? "System Online"
                  : "Demo Mode"}
              </strong>
            </div>

            <p>
              {backendOnline
                ? "PostgreSQL services connected"
                : "Backend connection unavailable"}
            </p>

            <div className="prototype-note">
              <strong>
                {usingDemoData
                  ? "Prototype Demo"
                  : "Database Connected"}
              </strong>

              <span>
                {usingDemoData
                  ? "Fallback synthetic data"
                  : "Live PostgreSQL study data"}
              </span>
            </div>
          </div>
        </aside>

        {!sidebarOpen && (
          <button
            className="sidebar-open"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open sidebar"
          >
            ›
          </button>
        )}

        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {showStudyDetails &&
                activeSection ===
                  "Studies"
                  ? "STUDY DETAILS"
                  : activeSection}
              </span>

              <h2>
                {showStudyDetails &&
                activeSection ===
                  "Studies"
                  ? "Clinical Study Details"
                  : activeSection ===
                      "Overview"
                    ? "Clinical Trials Overview"
                    : activeSection ===
                        "Studies"
                      ? "Study Management"
                      : activeSection ===
                          "Recruitment"
                        ? "Recruitment Management"
                        : activeSection ===
                            "Safety"
                          ? "Safety & Pharmacovigilance"
                          : activeSection ===
                              "Regulatory"
                            ? "Regulatory & Ethics"
                            : "Audit & Data Integrity"}
              </h2>

              <p>
                {showStudyDetails &&
                activeSection ===
                  "Studies"
                  ? "Detailed monitoring view for the selected clinical trial."
                  : "Centralized monitoring of Ayurveda clinical research operations, safety, recruitment and regulatory activities."}
              </p>
            </div>

            <div className="last-updated">
              <span>
                Last updated
              </span>

              <strong>
                {lastUpdated}
              </strong>
            </div>
          </div>

          {errorMessage && (
            <div className="connection-banner">
              <span>
                {usingDemoData
                  ? "DEMO DATA"
                  : "NOTICE"}
              </span>

              <p>
                {errorMessage}
              </p>

              <button
                onClick={
                  refreshDashboard
                }
              >
                Retry connection
              </button>
            </div>
          )}

          {renderContent()}

          <footer className="app-footer">
            <span>
              AIIA Clinical Trials
              Command Center
            </span>

            <span>
              Tech Thinkerz · DRIEMS
              UNIVERSITY
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;