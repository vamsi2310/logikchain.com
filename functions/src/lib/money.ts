import { fail } from "../errors";

export function rupeesToPaise(amount: number): number {
  if (!Number.isFinite(amount)) fail("INVALID_AMOUNT");
  const paise = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(paise)) fail("INVALID_AMOUNT");
  return paise;
}

export function paiseToRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) fail("INVALID_AMOUNT");
  return paise / 100;
}

export function roundMoney(amount: number): number {
  return paiseToRupees(rupeesToPaise(amount));
}
