import { db } from "../admin";
import { Col } from "../collections";
import { fail } from "../errors";
import { roundMoney } from "./money";
import { nowIso, periodIdFor } from "./time";

export async function assertPeriodOpen(date: string | Date = new Date()): Promise<void> {
  const periodId = periodIdFor(date);
  const period = await db.collection(Col.AccountingPeriods).doc(periodId).get();
  if (period.exists && period.data()?.status === "closed") {
    fail("PERIOD_LOCKED", `Accounting period ${periodId} is closed`);
  }
}

export async function loadEffectiveTaxProfile(
  supplierId: string,
  at: string = nowIso()
): Promise<Record<string, unknown>> {
  const profiles = await db
    .collection(Col.TaxProfiles)
    .where("supplierId", "==", supplierId)
    .where("status", "==", "active")
    .get();
  const instant = new Date(at).getTime();
  const effective = profiles.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
    .filter((profile) => {
      const start = profile.effectiveFrom
        ? new Date(String(profile.effectiveFrom)).getTime()
        : Number.NEGATIVE_INFINITY;
      const end = profile.effectiveTo
        ? new Date(String(profile.effectiveTo)).getTime()
        : Number.POSITIVE_INFINITY;
      return start <= instant && instant <= end;
    })
    .sort(
      (a, b) =>
        new Date(String(b.effectiveFrom ?? 0)).getTime() -
        new Date(String(a.effectiveFrom ?? 0)).getTime()
    )[0];
  if (!effective) fail("TAX_PROFILE_MISSING");
  return effective;
}

export function resolveRecipientState(input: {
  basis?: string;
  recipientGstin?: string;
  deliveryStateCode?: string;
  supplierStateCode: string;
  deliveryStateName?: string;
  supplierStateName: string;
}): { stateCode: string; placeOfSupply: string; basis: string } {
  const configured = input.basis ?? "recipient_registered_state";
  const gstinState =
    input.recipientGstin && /^[0-9]{2}/.test(input.recipientGstin)
      ? input.recipientGstin.slice(0, 2)
      : undefined;

  if (configured === "recipient_registered_state" && gstinState) {
    return {
      stateCode: gstinState,
      placeOfSupply:
        gstinState === input.supplierStateCode
          ? input.supplierStateName
          : input.deliveryStateName ?? gstinState,
      basis: configured,
    };
  }
  if (configured === "recipient_delivery_state" && input.deliveryStateCode) {
    return {
      stateCode: input.deliveryStateCode,
      placeOfSupply: input.deliveryStateName ?? input.deliveryStateCode,
      basis: configured,
    };
  }
  return {
    stateCode: input.supplierStateCode,
    placeOfSupply: input.supplierStateName,
    basis: "supplier_state",
  };
}

export function splitGst(input: {
  subTotal: number;
  gstRate: number;
  registeredStateCode: string;
  recipientStateCode: string;
  placeOfSupply: string;
  basis: string;
}) {
  if (
    !Number.isFinite(input.subTotal) ||
    input.subTotal < 0 ||
    !Number.isFinite(input.gstRate) ||
    input.gstRate < 0
  ) {
    fail("INVALID_ARGUMENT", "Taxable amount or GST rate is invalid");
  }
  const gstAmount = roundMoney((input.subTotal * input.gstRate) / 100);
  const intraState = input.registeredStateCode === input.recipientStateCode;
  const cgstAmount = intraState ? roundMoney(gstAmount / 2) : 0;
  const sgstAmount = intraState ? roundMoney(gstAmount - cgstAmount) : 0;
  const igstAmount = intraState ? 0 : gstAmount;
  return {
    gstRate: input.gstRate,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    supplyType: intraState ? "intra_state" : "inter_state",
    placeOfSupply: input.placeOfSupply,
    placeOfSupplyStateCode: input.recipientStateCode,
    placeOfSupplyBasis: input.basis,
  };
}

export async function nextDocumentNumber(input: {
  supplierId: string;
  kind: "invoice" | "credit_note" | string;
  prefix: string;
}): Promise<string> {
  await assertPeriodOpen();
  const financialYear = financialYearFor(new Date());
  const sequenceId = `${input.supplierId}_${input.kind}_${financialYear}`;
  return db.runTransaction(async (tx) => {
    const ref = db.collection(Col.InvoiceSequences).doc(sequenceId);
    const snap = await tx.get(ref);
    const next = Number(snap.data()?.lastNumber ?? 0) + 1;
    tx.set(
      ref,
      {
        supplierId: input.supplierId,
        kind: input.kind,
        financialYear,
        prefix: input.prefix,
        lastNumber: next,
        updatedAt: nowIso(),
      },
      { merge: true }
    );
    return `${input.prefix}/${financialYear}/${String(next).padStart(6, "0")}`;
  });
}

function financialYearFor(date: Date): string {
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}
