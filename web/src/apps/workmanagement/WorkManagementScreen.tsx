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

export interface Feature {
  id: string;
  title: string;
  status: string;
  scope?: string;
  endpoints?: string;
  stories: Story[];
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

  // Summary Metrics calculated directly from the Single Source of Truth
  const stats = useMemo(() => {
    let totalFeatures = 0;
    let totalStories = 0;
    let completedStories = 0;
    let inProgressStories = 0;
    let readyStories = 0;

    epicsData.forEach((epic) => {
      totalFeatures += epic.features?.length || 0;
      epic.features?.forEach((f) => {
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
          (f) => f.id.toLowerCase().includes(q) || f.title.toLowerCase().includes(q)
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

  return (
    <PublicLayout>
      <div className="pub-container">
        {/* Header Section */}
        <div className="pub-section-header" style={{ marginBottom: "2rem" }}>
          <span className="pub-hero-tag">Engineering Traceability</span>
          <h2>Logikchain Work Management Portal</h2>
          <p>
            Official 4-tier Single Source of Truth linking Functional Epics, Microservices, Concrete Features, and User Stories.
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
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Use Cases Derived</span>
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
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Overall Completion</span>
            <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#2563eb", marginTop: "0.25rem" }}>
              {stats.completionRate}%
            </div>
            <span style={{ fontSize: "0.75rem", color: "#3b82f6" }}>Traceability Matrix</span>
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
              placeholder="Search Epic, Microservice, Feature, or Port..."
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
                    <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", fontSize: "0.85rem", color: "#64748b" }}>
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

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {epicFeatures.map((feat) => {
                      const isExpanded = !!expandedFeatures[feat.id];
                      const featDone = feat.stories?.filter((s) => (s.status || "").toUpperCase() === "DONE").length || 0;
                      const featTotal = feat.stories?.length || 0;

                      return (
                        <div
                          key={feat.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            onClick={() => toggleFeature(feat.id)}
                            style={{
                              padding: "0.75rem 1rem",
                              background: "#ffffff",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              userSelect: "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{isExpanded ? "▼" : "▶"}</span>
                              <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>{feat.id}:</strong>
                              <span style={{ color: "#334155", fontSize: "0.95rem" }}>{feat.title}</span>
                              {feat.endpoints && (
                                <code style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                  {feat.endpoints.split(" ")[0]}
                                </code>
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
                                  background: featDone === featTotal && featTotal > 0 ? "#dcfce7" : "#f1f5f9",
                                  color: featDone === featTotal && featTotal > 0 ? "#15803d" : "#475569",
                                }}
                              >
                                {feat.status}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Stories Table */}
                          {isExpanded && (
                            <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                              {feat.scope && (
                                <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 0, marginBottom: "0.75rem" }}>
                                  <strong>Scope:</strong> {feat.scope}
                                </p>
                              )}

                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                <thead>
                                  <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                                    <th style={{ padding: "0.4rem 0.5rem", width: "120px" }}>Story ID</th>
                                    <th style={{ padding: "0.4rem 0.5rem", width: "110px" }}>Type</th>
                                    <th style={{ padding: "0.4rem 0.5rem" }}>User Journey / Criteria</th>
                                    <th style={{ padding: "0.4rem 0.5rem", width: "100px" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {feat.stories?.map((story) => (
                                    <tr key={story.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                                      <td style={{ padding: "0.4rem 0.5rem", fontFamily: "monospace", fontWeight: 600 }}>
                                        {story.id}
                                      </td>
                                      <td style={{ padding: "0.4rem 0.5rem", color: "#64748b" }}>
                                        <span style={{ fontSize: "0.75rem", background: "#e2e8f0", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                          {story.type}
                                        </span>
                                      </td>
                                      <td style={{ padding: "0.4rem 0.5rem", color: "#334155" }}>
                                        {story.description}
                                      </td>
                                      <td style={{ padding: "0.4rem 0.5rem" }}>
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

