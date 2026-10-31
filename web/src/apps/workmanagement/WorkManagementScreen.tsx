import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/apps/public/PublicLayout";
import rawData from "@/data/work_management_data.json";

export interface Story {
  id: string;
  type: string;
  title: string;
  status: string;
  description: string;
}

export interface SampleData {
  request?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
}

export interface SampleTest {
  testType: string;
  name: string;
  endpoint?: string;
  payload?: Record<string, unknown> | null;
  expectedStatus?: number;
  assertions?: string[];
}

export interface Feature {
  id: string;
  title: string;
  status: string;
  scope?: string;
  endpoints?: string;
  stories: Story[];
  sampleData?: SampleData;
  sampleTest?: SampleTest;
  reviewComments?: string;
  latestTestResults?: {
    suite?: string;
    status?: string;
    duration?: string;
    video?: string;
  };
}

export interface Epic {
  id: string;
  title: string;
  status: string;
  functionalArea?: string;
  microservice?: string;
  port?: string | number;
  db?: string;
  mdFile?: string;
  features: Feature[];
}

const epicsData: Epic[] = rawData as Epic[];

export function WorkManagementScreen() {
  const [selectedEpicId, setSelectedEpicId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [activeFeatureTabs, setActiveFeatureTabs] = useState<Record<string, "stories" | "data" | "test">>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  // Summary Metrics calculated directly from the Single Source of Truth
  const stats = useMemo(() => {
    let totalFeatures = 0;
    let totalStories = 0;
    let completedStories = 0;
    let inProgressStories = 0;
    let readyStories = 0;
    let featuresWithSampleData = 0;
    let featuresWithSampleTest = 0;

    epicsData.forEach((epic) => {
      totalFeatures += epic.features?.length || 0;
      epic.features?.forEach((f) => {
        if (f.sampleData) featuresWithSampleData++;
        if (f.sampleTest) featuresWithSampleTest++;
        totalStories += f.stories?.length || 0;
        f.stories?.forEach((s) => {
          const st = (s.status || "").toUpperCase();
          if (st === "DONE" || st === "COMPLETED") completedStories++;
          else if (st === "IN_PROGRESS" || st === "IN PROGRESS") inProgressStories++;
          else readyStories++;
        });
      });
    });

    const completionRate = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

    return {
      totalEpics: epicsData.length,
      totalFeatures,
      totalStories,
      completedStories,
      inProgressStories,
      readyStories,
      completionRate,
      featuresWithSampleData,
      featuresWithSampleTest,
    };
  }, []);

  // Filtered Epics
  const filteredEpics = useMemo(() => {
    return epicsData.filter((epic) => {
      if (selectedEpicId !== "ALL" && epic.id !== selectedEpicId) return false;
      if (selectedStatus !== "ALL" && epic.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEpic =
          epic.id.toLowerCase().includes(q) ||
          epic.title.toLowerCase().includes(q) ||
          (epic.microservice && epic.microservice.toLowerCase().includes(q));
        const matchFeature = epic.features?.some(
          (f) =>
            f.id.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            (f.endpoints && f.endpoints.toLowerCase().includes(q))
        );
        return matchEpic || matchFeature;
      }
      return true;
    });
  }, [selectedEpicId, selectedStatus, searchQuery]);

  const toggleFeature = (featId: string) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [featId]: !prev[featId],
    }));
  };

  const setFeatureTab = (featId: string, tab: "stories" | "data" | "test") => {
    setActiveFeatureTabs((prev) => ({
      ...prev,
      [featId]: tab,
    }));
  };

  return (
    <PublicLayout>
      <div className="pub-container">
        {/* Header Section */}
        <div className="pub-section-header" style={{ marginBottom: "2rem" }}>
          <span className="pub-hero-tag">Engineering Traceability</span>
          <h2>Logikchain Work Management Portal</h2>
          <p>
            Official 4-tier Single Source of Truth linking Functional Epics, Microservices, Concrete Features, User Stories, Realistic Functional Payloads, and Automated Test Specifications.
          </p>
        </div>

        {/* Executive Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Epics</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#1b7f3b", marginTop: "0.25rem" }}>
              {stats.totalEpics}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>1:1 Microservices</span>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Features</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#0f172a", marginTop: "0.25rem" }}>
              {stats.totalFeatures}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: "600" }}>
              {stats.featuresWithSampleData}/{stats.totalFeatures} Enriched
            </span>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Test Suites</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#0284c7", marginTop: "0.25rem" }}>
              {stats.featuresWithSampleTest}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#0369a1" }}>Bruno & Playwright</span>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Stories</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#0f172a", marginTop: "0.25rem" }}>
              {stats.totalStories}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>PWA, Native & API</span>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Completed</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#166534", marginTop: "0.25rem" }}>
              {stats.completedStories}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>Production Verified</span>
          </div>

          <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Traceability</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#2563eb", marginTop: "0.25rem" }}>
              {stats.completionRate}%
            </div>
            <span style={{ fontSize: "0.75rem", color: "#3b82f6" }}>Matrix Verified</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "2rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", flex: 1 }}>
            <input
              type="text"
              placeholder="Search Epic, Feature, Microservice, Endpoint, or Payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                minWidth: "260px",
                flex: 1,
              }}
            />

            <select
              value={selectedEpicId}
              onChange={(e) => setSelectedEpicId(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}
            >
              <option value="ALL">All Epics (EPIC 01 - 13)</option>
              {epicsData.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id}: {e.title}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">READY</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DONE">DONE</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link to="/status" className="pub-btn pub-btn-sm pub-btn-outline">
              View Live Telemetry (:8080) →
            </Link>
          </div>
        </div>

        {/* Epics Accordion / Card View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredEpics.map((epic) => {
            const epicFeatures = epic.features || [];
            let epicStoriesCount = 0;
            let epicDoneStories = 0;

            epicFeatures.forEach((f) => {
              epicStoriesCount += f.stories?.length || 0;
              epicDoneStories += f.stories?.filter((s) => (s.status || "").toUpperCase() === "DONE").length || 0;
            });

            const epicPercent = epicStoriesCount > 0 ? Math.round((epicDoneStories / epicStoriesCount) * 100) : 0;
            const isFullyDone = epicStoriesCount > 0 && epicPercent === 100;

            return (
              <div
                key={epic.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: `1px solid ${isFullyDone ? "#86efac" : "#e2e8f0"}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                }}
              >
                {/* Epic Banner */}
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    background: isFullyDone ? "#f0fdf4" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span
                        style={{
                          background: isFullyDone ? "#166534" : "#1b7f3b",
                          color: "#fff",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          fontWeight: "700",
                          fontSize: "0.8rem",
                        }}
                      >
                        {epic.id}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>{epic.title}</h3>
                    </div>
                    <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", fontSize: "0.85rem", color: "#64748b", flexWrap: "wrap" }}>
                      <span>
                        <strong>Microservice:</strong> <code>{epic.microservice}</code>
                      </span>
                      <span>
                        <strong>Port:</strong> <code>:{epic.port}</code>
                      </span>
                      <span>
                        <strong>Database:</strong> <code>{epic.db}</code>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        Progress: <strong>{epicDoneStories}/{epicStoriesCount}</strong> stories
                      </div>
                      <div
                        style={{
                          width: "120px",
                          height: "6px",
                          background: "#e2e8f0",
                          borderRadius: "999px",
                          marginTop: "0.35rem",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${epicPercent}%`,
                            height: "100%",
                            background: isFullyDone ? "#16a34a" : "#2563eb",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: isFullyDone ? "#dcfce7" : epic.status === "IN_PROGRESS" ? "#fef3c7" : "#e0f2fe",
                        color: isFullyDone ? "#15803d" : epic.status === "IN_PROGRESS" ? "#b45309" : "#0369a1",
                      }}
                    >
                      {epic.status}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#334155", marginBottom: "0.75rem" }}>
                    Derived Functional Features ({epicFeatures.length})
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {epicFeatures.map((feat) => {
                      const isExpanded = !!expandedFeatures[feat.id];
                      const activeTab = activeFeatureTabs[feat.id] || "stories";
                      const featDone = feat.stories?.filter((s) => (s.status || "").toUpperCase() === "DONE").length || 0;
                      const featTotal = feat.stories?.length || 0;

                      return (
                        <div
                          key={feat.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            overflow: "hidden",
                            background: "#ffffff",
                          }}
                        >
                          {/* Feature Header Row */}
                          <div
                            onClick={() => toggleFeature(feat.id)}
                            style={{
                              padding: "0.85rem 1rem",
                              background: isExpanded ? "#fbfcfe" : "#ffffff",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              userSelect: "none",
                              borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{isExpanded ? "▼" : "▶"}</span>
                              <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>{feat.id}:</strong>
                              <span style={{ color: "#334155", fontSize: "0.95rem", fontWeight: "600" }}>{feat.title}</span>
                              {feat.endpoints && (
                                <code style={{ fontSize: "0.75rem", color: "#0369a1", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                                  {feat.endpoints.split(" ")[0]}
                                </code>
                              )}
                              {feat.sampleData && (
                                <span style={{ fontSize: "0.68rem", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "0.1rem 0.4rem", borderRadius: "3px", fontWeight: "600" }}>
                                  Payload Ready
                                </span>
                              )}
                              {feat.sampleTest && (
                                <span style={{ fontSize: "0.68rem", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "0.1rem 0.4rem", borderRadius: "3px", fontWeight: "600" }}>
                                  {feat.sampleTest.testType}
                                </span>
                              )}
                              {feat.reviewComments && (
                                <span style={{ fontSize: "0.68rem", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "0.1rem 0.4rem", borderRadius: "3px", fontWeight: "700" }}>
                                  🔍 Review Logged
                                </span>
                              )}
                              {feat.latestTestResults?.video && (
                                <span style={{ fontSize: "0.68rem", background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "0.1rem 0.4rem", borderRadius: "3px", fontWeight: "700" }}>
                                  🎥 Video
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                Stories: {featDone}/{featTotal}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  background: feat.status === "DONE" ? "#dcfce7" : feat.status === "IN_PROGRESS" ? "#fef3c7" : "#f1f5f9",
                                  color: feat.status === "DONE" ? "#15803d" : feat.status === "IN_PROGRESS" ? "#b45309" : "#475569",
                                }}
                              >
                                {feat.status}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content Area */}
                          {isExpanded && (
                            <div style={{ padding: "1rem", background: "#f8fafc" }}>
                              {feat.reviewComments && (
                                <div style={{ fontSize: "0.85rem", color: "#065f46", marginBottom: "1rem", background: "#f0fdf4", padding: "0.85rem 1.1rem", borderRadius: "8px", border: "1px solid #86efac" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "1rem" }}>🔍</span>
                                    <strong style={{ color: "#166534", fontSize: "0.9rem" }}>QA & Verification Review (Status: In Progress):</strong>
                                    {feat.latestTestResults?.status && (
                                      <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: "700" }}>
                                        {feat.latestTestResults.status} {feat.latestTestResults.duration ? `(${feat.latestTestResults.duration})` : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: "#14532d", lineHeight: "1.55" }}>
                                    {feat.reviewComments}
                                  </div>
                                  {feat.latestTestResults?.suite && (
                                    <div style={{ fontSize: "0.78rem", color: "#15803d", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                      <span>Test Spec: <code>{feat.latestTestResults.suite}</code></span>
                                      <Link to="/status/tests" style={{ color: "#0284c7", fontWeight: 700, textDecoration: "none" }}>
                                        🎥 Play Recording in Status Portal ↗
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              )}

                              {feat.scope && (
                                <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "1rem", background: "#ffffff", padding: "0.65rem 0.85rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <strong style={{ color: "#0f172a" }}>Functional Scope:</strong> {feat.scope}
                                </div>
                              )}

                              {/* Tab Selector */}
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  borderBottom: "1px solid #cbd5e1",
                                  marginBottom: "1rem",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFeatureTab(feat.id, "stories");
                                  }}
                                  style={{
                                    padding: "0.45rem 0.85rem",
                                    fontSize: "0.82rem",
                                    fontWeight: activeTab === "stories" ? "700" : "500",
                                    color: activeTab === "stories" ? "#1b7f3b" : "#64748b",
                                    borderBottom: activeTab === "stories" ? "2px solid #1b7f3b" : "2px solid transparent",
                                    background: "none",
                                    borderTop: "none",
                                    borderLeft: "none",
                                    borderRight: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  User Stories & Tasks ({featTotal})
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFeatureTab(feat.id, "data");
                                  }}
                                  style={{
                                    padding: "0.45rem 0.85rem",
                                    fontSize: "0.82rem",
                                    fontWeight: activeTab === "data" ? "700" : "500",
                                    color: activeTab === "data" ? "#1b7f3b" : "#64748b",
                                    borderBottom: activeTab === "data" ? "2px solid #1b7f3b" : "2px solid transparent",
                                    background: "none",
                                    borderTop: "none",
                                    borderLeft: "none",
                                    borderRight: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                  }}
                                >
                                  Sample Functionality Data
                                  {feat.sampleData && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFeatureTab(feat.id, "test");
                                  }}
                                  style={{
                                    padding: "0.45rem 0.85rem",
                                    fontSize: "0.82rem",
                                    fontWeight: activeTab === "test" ? "700" : "500",
                                    color: activeTab === "test" ? "#1b7f3b" : "#64748b",
                                    borderBottom: activeTab === "test" ? "2px solid #1b7f3b" : "2px solid transparent",
                                    background: "none",
                                    borderTop: "none",
                                    borderLeft: "none",
                                    borderRight: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                  }}
                                >
                                  Sample Test & Verification
                                  {feat.sampleTest && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />}
                                </button>
                              </div>

                              {/* TAB 1: STORIES TABLE */}
                              {activeTab === "stories" && (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", background: "#ffffff", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                                  <thead>
                                    <tr style={{ textAlign: "left", color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                      <th style={{ padding: "0.5rem 0.75rem", width: "120px" }}>Story ID</th>
                                      <th style={{ padding: "0.5rem 0.75rem", width: "110px" }}>Type</th>
                                      <th style={{ padding: "0.5rem 0.75rem" }}>User Journey / Criteria</th>
                                      <th style={{ padding: "0.5rem 0.75rem", width: "100px" }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {feat.stories?.map((story) => (
                                      <tr key={story.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                                        <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontWeight: 600, color: "#1e293b" }}>
                                          {story.id}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>
                                          <span style={{ fontSize: "0.75rem", background: "#e2e8f0", padding: "0.15rem 0.4rem", borderRadius: "3px" }}>
                                            {story.type}
                                          </span>
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>
                                          {story.description}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem" }}>
                                          <span
                                            style={{
                                              fontWeight: 600,
                                              fontSize: "0.75rem",
                                              color: (story.status || "").toUpperCase() === "DONE" ? "#16a34a" : "#f59e0b",
                                            }}
                                          >
                                            {story.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* TAB 2: SAMPLE FUNCTIONALITY DATA */}
                              {activeTab === "data" && (
                                <div>
                                  {feat.sampleData ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                                      {/* Request Payload Card */}
                                      <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                        <div style={{ padding: "0.5rem 0.75rem", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "#2563eb", color: "#ffffff", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                              REQUEST
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#475569", fontFamily: "monospace" }}>
                                              {feat.endpoints ? feat.endpoints.split(" ")[1] || feat.endpoints : "Payload"}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(JSON.stringify(feat.sampleData?.request, null, 2), `req-${feat.id}`)}
                                            style={{
                                              padding: "0.15rem 0.45rem",
                                              fontSize: "0.72rem",
                                              background: "#ffffff",
                                              border: "1px solid #cbd5e1",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              color: copiedKey === `req-${feat.id}` ? "#16a34a" : "#475569",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {copiedKey === `req-${feat.id}` ? "Copied! ✓" : "Copy JSON"}
                                          </button>
                                        </div>
                                        <pre style={{ margin: 0, padding: "0.75rem", fontSize: "0.78rem", background: "#0f172a", color: "#f8fafc", overflowX: "auto", maxHeight: "280px" }}>
                                          <code>{JSON.stringify(feat.sampleData.request || {}, null, 2)}</code>
                                        </pre>
                                      </div>

                                      {/* Response Payload Card */}
                                      <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                        <div style={{ padding: "0.5rem 0.75rem", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "#16a34a", color: "#ffffff", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                              RESPONSE 200 OK
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#475569", fontFamily: "monospace" }}>
                                              application/json
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(JSON.stringify(feat.sampleData?.response, null, 2), `res-${feat.id}`)}
                                            style={{
                                              padding: "0.15rem 0.45rem",
                                              fontSize: "0.72rem",
                                              background: "#ffffff",
                                              border: "1px solid #cbd5e1",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              color: copiedKey === `res-${feat.id}` ? "#16a34a" : "#475569",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {copiedKey === `res-${feat.id}` ? "Copied! ✓" : "Copy JSON"}
                                          </button>
                                        </div>
                                        <pre style={{ margin: 0, padding: "0.75rem", fontSize: "0.78rem", background: "#0f172a", color: "#a7f3d0", overflowX: "auto", maxHeight: "280px" }}>
                                          <code>{JSON.stringify(feat.sampleData.response || {}, null, 2)}</code>
                                        </pre>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                                      No sample functionality data configured.
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* TAB 3: SAMPLE TEST & VERIFICATION */}
                              {activeTab === "test" && (
                                <div>
                                  {feat.sampleTest ? (
                                    <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1rem" }}>
                                      {/* Test Meta Banner */}
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "0.85rem" }}>
                                        <div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>
                                              {feat.sampleTest.testType}
                                            </span>
                                            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>
                                              {feat.sampleTest.name}
                                            </h4>
                                          </div>
                                          {feat.sampleTest.endpoint && (
                                            <div style={{ fontSize: "0.82rem", color: "#475569" }}>
                                              Target Endpoint: <code style={{ background: "#f1f5f9", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>{feat.sampleTest.endpoint}</code>
                                            </div>
                                          )}
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Expected Status:</span>
                                          <span style={{ background: "#dcfce7", color: "#166534", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>
                                            {feat.sampleTest.expectedStatus || 200} OK
                                          </span>
                                        </div>
                                      </div>

                                      {/* Test Details Grid */}
                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                                        {/* Test Input Payload */}
                                        <div>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#334155" }}>Test Execution Input</span>
                                            {feat.sampleTest.payload && (
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(JSON.stringify(feat.sampleTest?.payload, null, 2), `test-pay-${feat.id}`)}
                                                style={{
                                                  padding: "0.1rem 0.35rem",
                                                  fontSize: "0.7rem",
                                                  background: "#f8fafc",
                                                  border: "1px solid #cbd5e1",
                                                  borderRadius: "3px",
                                                  cursor: "pointer",
                                                  color: copiedKey === `test-pay-${feat.id}` ? "#16a34a" : "#475569",
                                                }}
                                              >
                                                {copiedKey === `test-pay-${feat.id}` ? "Copied! ✓" : "Copy Input"}
                                              </button>
                                            )}
                                          </div>
                                          <pre style={{ margin: 0, padding: "0.65rem", fontSize: "0.75rem", background: "#1e293b", color: "#f8fafc", borderRadius: "6px", maxHeight: "180px", overflowX: "auto" }}>
                                            <code>
                                              {feat.sampleTest.payload ? JSON.stringify(feat.sampleTest.payload, null, 2) : "/* No input body required (GET/Param) */"}
                                            </code>
                                          </pre>
                                        </div>

                                        {/* Assertions Checklist */}
                                        <div>
                                          <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#334155", display: "block", marginBottom: "0.4rem" }}>
                                            Verification Assertions ({feat.sampleTest.assertions?.length || 0})
                                          </span>
                                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.5rem" }}>
                                            {feat.sampleTest.assertions && feat.sampleTest.assertions.length > 0 ? (
                                              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "#334155", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                                {feat.sampleTest.assertions.map((assertion, idx) => (
                                                  <li key={idx} style={{ fontFamily: "monospace", color: "#0f766e" }}>
                                                    <span style={{ color: "#16a34a", marginRight: "0.25rem", fontWeight: "700" }}>✓</span>
                                                    {assertion}
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>No assertions defined.</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                                      No sample test specification configured.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
