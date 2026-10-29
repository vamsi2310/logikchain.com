import { useState } from "react";
import { SupportChrome as Chrome, SptField as Field, SptStatusChip as StatusChip } from "../SupportChrome";
import { Card, Button } from "@/ui/primitives";
import { useToast } from "@/state/toast";
import { api } from "@/api/client";

interface EntityCategory {
  id: string;
  label: string;
  count: number;
}

const DEFAULT_CATEGORIES: EntityCategory[] = [
  { id: "organization", label: "Organization Details", count: 1 },
  { id: "contact", label: "Contact Details", count: 2 },
  { id: "gst", label: "GST Details", count: 1 },
  { id: "fssai", label: "Food License (FSSAI)", count: 1 },
  { id: "inventory", label: "Inventory, Stock & Prices", count: 45 },
  { id: "price_history", label: "Price History", count: 12 },
  { id: "sales_history", label: "Sales History Data", count: 120 },
  { id: "routes", label: "Routes & Master Corridors", count: 5 },
  { id: "drivers", label: "Drivers & Driver Profiles", count: 15 },
  { id: "trucks", label: "Trucks & Vehicle Fleet", count: 10 },
  { id: "merchants", label: "Merchants & Merchant Profiles", count: 25 },
];

export function SupplierBulkIngestionScreen() {
  const { push } = useToast();
  const [supplierId, setSupplierId] = useState("sup_ongole_01");
  const [selectedCats, setSelectedCats] = useState<string[]>([
    "organization",
    "contact",
    "gst",
    "fssai",
    "inventory",
    "price_history",
    "sales_history",
    "routes",
    "drivers",
    "trucks",
    "merchants",
  ]);

  const [rawGstin, setRawGstin] = useState("37AAAAA0000A1Z5");
  const [testErrorMode, setTestErrorMode] = useState(false);
  const [validating, setValidating] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [ingestionResult, setIngestionResult] = useState<any>(null);

  const isAllSelected = selectedCats.length === DEFAULT_CATEGORIES.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCats([]);
    } else {
      setSelectedCats(DEFAULT_CATEGORIES.map((c) => c.id));
    }
    setValidationResult(null);
  };

  const toggleCategory = (id: string) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setValidationResult(null);
  };

  const runValidation = async () => {
    if (selectedCats.length === 0) {
      push("Select at least one entity category to validate.");
      return;
    }

    setValidating(true);
    setIngestionResult(null);

    // Build mock datasets for selected categories
    const datasets: Record<string, any[]> = {};
    for (const cat of selectedCats) {
      if (cat === "gst") {
        datasets.gst = [
          {
            gstin: testErrorMode ? "37ABCDE0000Z1Z" : rawGstin, // 14 chars triggers invalid
            tradeClass: "Pvt Ltd",
            stateJurisdiction: "37",
          },
        ];
      } else if (cat === "fssai") {
        datasets.fssai = [
          {
            licenseNumber: "10020030040050",
            classification: "Wholesaler",
            issueDate: "2025-01-01",
          },
        ];
      } else if (cat === "drivers") {
        datasets.drivers = Array.from({ length: 15 }).map((_, i) => ({
          driverName: `Driver ${i + 1}`,
          phone: `+9198480220${i < 10 ? `0${i}` : i}`,
          licenseNumber: `DL-AP-2024-${1000 + i}`,
        }));
      } else if (cat === "trucks") {
        datasets.trucks = Array.from({ length: 10 }).map((_, i) => ({
          regPlate: `AP27TZ${1000 + i}`,
          payloadKg: 3500,
          fuelType: "Diesel",
        }));
      } else {
        datasets[cat] = [{ id: `${cat}_sample_1`, name: `Sample ${cat}` }];
      }
    }

    try {
      const res = await api.post<any>(
        `/v1/config/suppliers/${supplierId}/bulk-import/validate`,
        {
          selectedCategories: selectedCats,
          datasets,
        }
      );
      setValidationResult(res);
      if (res.status === "VALID") {
        push("Pre-flight dry run passed: schema is valid.");
      } else {
        push("Validation failed: check row errors below.");
      }
    } catch (err: any) {
      push(err.message || "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const runIngestion = async () => {
    if (!validationResult || validationResult.status !== "VALID") {
      push("Please run validation and fix errors before committing.");
      return;
    }

    setIngesting(true);
    try {
      const res = await api.post<any>(
        `/v1/config/suppliers/${supplierId}/bulk-import`,
        {
          selectedCategories: selectedCats,
          datasets: {},
        }
      );
      setIngestionResult(res);
      push(`Bulk ingestion completed! ${res.metrics?.totalRows || 0} rows imported.`);
    } catch (err: any) {
      push(err.message || "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <Chrome title="Supplier Bulk Ingestion" screenId="SPT-02.5" back>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Supplier Selector */}
        <Card>
          <p className="card-title" style={{ fontSize: 16, fontWeight: 600 }}>1. Target Supplier</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Supplier ID / Code">
              <input
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                placeholder="sup_ongole_01"
              />
            </Field>
            <Field label="Test GSTIN">
              <input
                value={rawGstin}
                onChange={(e) => setRawGstin(e.target.value)}
                placeholder="37AAAAA0000A1Z5"
              />
            </Field>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={testErrorMode}
                onChange={(e) => setTestErrorMode(e.target.checked)}
              />
              Inject 14-char Invalid GSTIN "37ABCDE0000Z1Z" (Trigger Schema Validation Error)
            </label>
          </div>
        </Card>

        {/* 11 Entity Checkbox Selection */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="card-title" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              2. Entity Categories to Ingest ({selectedCats.length}/{DEFAULT_CATEGORIES.length})
            </p>
            <Button variant="secondary" onClick={toggleSelectAll} style={{ padding: "4px 12px", fontSize: 12 }}>
              {isAllSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 8,
              background: "var(--spt-surface-sunken, #f8fafc)",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--spt-content-border, #e2e8f0)",
            }}
          >
            {DEFAULT_CATEGORIES.map((cat) => {
              const checked = selectedCats.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: checked ? "rgba(99, 102, 241, 0.08)" : "white",
                    border: checked ? "1px solid #818cf8" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  <span style={{ fontWeight: checked ? 600 : 400 }}>{cat.label}</span>
                </label>
              );
            })}
          </div>
        </Card>

        {/* Actions & Dry-Run Preview */}
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Button loading={validating} onClick={runValidation}>
              Validate & Preview
            </Button>
            <Button
              variant="primary"
              loading={ingesting}
              disabled={!validationResult || validationResult.status !== "VALID"}
              onClick={runIngestion}
            >
              Start Bulk Ingestion
            </Button>
          </div>

          {validationResult && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: validationResult.status === "VALID" ? "#ecfdf5" : "#fef2f2",
                  border: validationResult.status === "VALID" ? "1px solid #10b981" : "1px solid #ef4444",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: validationResult.status === "VALID" ? "#065f46" : "#991b1b" }}>
                    Status: {validationResult.status}
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#374151" }}>
                    Total Rows: {validationResult.totalRows} · Valid: {validationResult.validRows} · Errors: {validationResult.errorRows}
                  </p>
                </div>
                <StatusChip status={validationResult.status === "VALID" ? "active" : "failed"} />
              </div>

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div style={{ marginTop: 12, border: "1px solid #ef4444", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ background: "#fef2f2", padding: "8px 12px", fontWeight: 600, fontSize: 12, color: "#b91c1c" }}>
                    Schema Validation Errors ({validationResult.errors.length})
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                        <th style={{ padding: "6px 12px" }}>Category</th>
                        <th style={{ padding: "6px 12px" }}>Row</th>
                        <th style={{ padding: "6px 12px" }}>Column</th>
                        <th style={{ padding: "6px 12px" }}>Error Code</th>
                        <th style={{ padding: "6px 12px" }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.errors.map((e: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 12px" }}>{e.entity}</td>
                          <td style={{ padding: "6px 12px" }}>{e.row}</td>
                          <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{e.column}</td>
                          <td style={{ padding: "6px 12px", color: "#b91c1c", fontWeight: 600 }}>{e.error}</td>
                          <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{String(e.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {ingestionResult && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 6, background: "#f0fdf4", border: "1px solid #22c55e" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#166534" }}>
                ✓ Ingestion Job Completed: {ingestionResult.jobId}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>
                Imported {ingestionResult.metrics?.importedSuccessfully} rows across {ingestionResult.processedCategories?.length} categories. Mirrored to Cloud Firestore.
              </p>
            </div>
          )}
        </Card>
      </div>
    </Chrome>
  );
}
