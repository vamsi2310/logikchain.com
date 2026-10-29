import fs from 'fs';
import path from 'path';

export interface PostalRecord {
  pincode: string;
  officeName: string;
  division: string;
  region: string;
  circle: string;
}

export interface PostalCircleOption {
  circle: string;
  totalPincodes: number;
}

export interface PostalRegionOption {
  region: string;
  circle: string;
  totalPincodes: number;
}

export interface PostalDivisionOption {
  division: string;
  region: string;
  circle: string;
  totalPincodes: number;
}

let cachedRecords: PostalRecord[] | null = null;

function getRecords(): PostalRecord[] {
  if (!cachedRecords) {
    const indexPath = path.resolve(__dirname, '../india-pincodes-index.json');
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, 'utf8');
      cachedRecords = JSON.parse(raw) as PostalRecord[];
    } else {
      cachedRecords = [];
    }
  }
  return cachedRecords;
}

/**
 * Returns distinct postal circles (States/Circles) for top-level dropdown
 */
export async function listPostalCircles(): Promise<PostalCircleOption[]> {
  const records = getRecords();
  const map = new Map<string, Set<string>>();

  for (const r of records) {
    if (!r.circle) continue;
    if (!map.has(r.circle)) {
      map.set(r.circle, new Set());
    }
    map.get(r.circle)!.add(r.pincode);
  }

  const result: PostalCircleOption[] = [];
  for (const [circle, pincodes] of map.entries()) {
    result.push({
      circle,
      totalPincodes: pincodes.size,
    });
  }

  return result.sort((a, b) => a.circle.localeCompare(b.circle));
}

/**
 * Returns regions within a circle (or all) for 2nd-level dropdown
 */
export async function listPostalRegions(circle?: string): Promise<PostalRegionOption[]> {
  const records = getRecords();
  const map = new Map<string, { circle: string; pincodes: Set<string> }>();

  const targetCircle = circle?.trim().toLowerCase();

  for (const r of records) {
    if (!r.region) continue;
    if (targetCircle && r.circle.toLowerCase() !== targetCircle) continue;

    const key = `${r.circle}::${r.region}`;
    if (!map.has(key)) {
      map.set(key, { circle: r.circle, pincodes: new Set() });
    }
    map.get(key)!.pincodes.add(r.pincode);
  }

  const result: PostalRegionOption[] = [];
  for (const [key, val] of map.entries()) {
    const [, region] = key.split('::');
    result.push({
      region,
      circle: val.circle,
      totalPincodes: val.pincodes.size,
    });
  }

  return result.sort((a, b) => a.region.localeCompare(b.region));
}

/**
 * Returns postal divisions for 3rd-level dropdown
 */
export async function listPostalDivisions(params: { circle?: string; region?: string }): Promise<PostalDivisionOption[]> {
  const records = getRecords();
  const map = new Map<string, { circle: string; region: string; pincodes: Set<string> }>();

  const targetCircle = params.circle?.trim().toLowerCase();
  const targetRegion = params.region?.trim().toLowerCase();

  for (const r of records) {
    if (!r.division) continue;
    if (targetCircle && r.circle.toLowerCase() !== targetCircle) continue;
    if (targetRegion && r.region.toLowerCase() !== targetRegion) continue;

    const key = `${r.circle}::${r.region}::${r.division}`;
    if (!map.has(key)) {
      map.set(key, { circle: r.circle, region: r.region, pincodes: new Set() });
    }
    map.get(key)!.pincodes.add(r.pincode);
  }

  const result: PostalDivisionOption[] = [];
  for (const [key, val] of map.entries()) {
    const parts = key.split('::');
    const division = parts[2];
    result.push({
      division,
      region: val.region,
      circle: val.circle,
      totalPincodes: val.pincodes.size,
    });
  }

  return result.sort((a, b) => a.division.localeCompare(b.division));
}

/**
 * Search or filter pincodes & post offices with full hierarchy
 */
export async function searchPincodes(query: {
  pincode?: string;
  circle?: string;
  region?: string;
  division?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; pincodes: PostalRecord[] }> {
  const records = getRecords();
  const targetPincode = query.pincode?.trim();
  const targetCircle = query.circle?.trim().toLowerCase();
  const targetRegion = query.region?.trim().toLowerCase();
  const targetDivision = query.division?.trim().toLowerCase();
  const search = query.search?.trim().toLowerCase();

  const filtered = records.filter((r) => {
    if (targetPincode && !r.pincode.startsWith(targetPincode)) return false;
    if (targetCircle && r.circle.toLowerCase() !== targetCircle) return false;
    if (targetRegion && r.region.toLowerCase() !== targetRegion) return false;
    if (targetDivision && r.division.toLowerCase() !== targetDivision) return false;
    if (search) {
      const match =
        r.pincode.toLowerCase().includes(search) ||
        r.officeName.toLowerCase().includes(search) ||
        r.division.toLowerCase().includes(search) ||
        r.region.toLowerCase().includes(search) ||
        r.circle.toLowerCase().includes(search);
      if (!match) return false;
    }
    return true;
  });

  const limit = Math.min(Math.max(query.limit || 50, 1), 500);
  const offset = Math.max(query.offset || 0, 0);

  return {
    total: filtered.length,
    pincodes: filtered.slice(offset, offset + limit),
  };
}

/**
 * Returns raw GeoJSON polygon geometry for a specific pincode
 */
export function getPincodeGeoJson(pincode: string): any | null {
  const geojsonPath = path.resolve(__dirname, '../india-pincodes.geojson');
  if (!fs.existsSync(geojsonPath)) return null;

  try {
    const raw = fs.readFileSync(geojsonPath, 'utf8');
    const data = JSON.parse(raw);
    const feature = data.features?.find((f: any) => (f.properties?.Pincode || '').trim() === pincode.trim());
    return feature || null;
  } catch {
    return null;
  }
}
