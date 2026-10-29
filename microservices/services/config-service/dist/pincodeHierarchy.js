"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPostalCircles = listPostalCircles;
exports.listPostalRegions = listPostalRegions;
exports.listPostalDivisions = listPostalDivisions;
exports.searchPincodes = searchPincodes;
exports.getPincodeGeoJson = getPincodeGeoJson;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let cachedRecords = null;
function getRecords() {
    if (!cachedRecords) {
        const indexPath = path_1.default.resolve(__dirname, '../india-pincodes-index.json');
        if (fs_1.default.existsSync(indexPath)) {
            const raw = fs_1.default.readFileSync(indexPath, 'utf8');
            cachedRecords = JSON.parse(raw);
        }
        else {
            cachedRecords = [];
        }
    }
    return cachedRecords;
}
/**
 * Returns distinct postal circles (States/Circles) for top-level dropdown
 */
async function listPostalCircles() {
    const records = getRecords();
    const map = new Map();
    for (const r of records) {
        if (!r.circle)
            continue;
        if (!map.has(r.circle)) {
            map.set(r.circle, new Set());
        }
        map.get(r.circle).add(r.pincode);
    }
    const result = [];
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
async function listPostalRegions(circle) {
    const records = getRecords();
    const map = new Map();
    const targetCircle = circle?.trim().toLowerCase();
    for (const r of records) {
        if (!r.region)
            continue;
        if (targetCircle && r.circle.toLowerCase() !== targetCircle)
            continue;
        const key = `${r.circle}::${r.region}`;
        if (!map.has(key)) {
            map.set(key, { circle: r.circle, pincodes: new Set() });
        }
        map.get(key).pincodes.add(r.pincode);
    }
    const result = [];
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
async function listPostalDivisions(params) {
    const records = getRecords();
    const map = new Map();
    const targetCircle = params.circle?.trim().toLowerCase();
    const targetRegion = params.region?.trim().toLowerCase();
    for (const r of records) {
        if (!r.division)
            continue;
        if (targetCircle && r.circle.toLowerCase() !== targetCircle)
            continue;
        if (targetRegion && r.region.toLowerCase() !== targetRegion)
            continue;
        const key = `${r.circle}::${r.region}::${r.division}`;
        if (!map.has(key)) {
            map.set(key, { circle: r.circle, region: r.region, pincodes: new Set() });
        }
        map.get(key).pincodes.add(r.pincode);
    }
    const result = [];
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
async function searchPincodes(query) {
    const records = getRecords();
    const targetPincode = query.pincode?.trim();
    const targetCircle = query.circle?.trim().toLowerCase();
    const targetRegion = query.region?.trim().toLowerCase();
    const targetDivision = query.division?.trim().toLowerCase();
    const search = query.search?.trim().toLowerCase();
    const filtered = records.filter((r) => {
        if (targetPincode && !r.pincode.startsWith(targetPincode))
            return false;
        if (targetCircle && r.circle.toLowerCase() !== targetCircle)
            return false;
        if (targetRegion && r.region.toLowerCase() !== targetRegion)
            return false;
        if (targetDivision && r.division.toLowerCase() !== targetDivision)
            return false;
        if (search) {
            const match = r.pincode.toLowerCase().includes(search) ||
                r.officeName.toLowerCase().includes(search) ||
                r.division.toLowerCase().includes(search) ||
                r.region.toLowerCase().includes(search) ||
                r.circle.toLowerCase().includes(search);
            if (!match)
                return false;
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
function getPincodeGeoJson(pincode) {
    const geojsonPath = path_1.default.resolve(__dirname, '../india-pincodes.geojson');
    if (!fs_1.default.existsSync(geojsonPath))
        return null;
    try {
        const raw = fs_1.default.readFileSync(geojsonPath, 'utf8');
        const data = JSON.parse(raw);
        const feature = data.features?.find((f) => (f.properties?.Pincode || '').trim() === pincode.trim());
        return feature || null;
    }
    catch {
        return null;
    }
}
