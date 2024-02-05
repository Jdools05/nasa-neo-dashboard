// To parse this data:
//
//   import { Convert, NasaData } from "./file";
//
//   const nasaData = Convert.toNasaData(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface NasaData {
    links:              NasaDataLinks;
    element_count:      number;
    near_earth_objects: { [key: string]: NearEarthObject[] };
}

export interface NasaDataLinks {
    next:     string;
    previous: string;
    self:     string;
}

export interface NearEarthObject {
    links:                             NearEarthObjectLinks;
    id:                                string;
    neo_reference_id:                  string;
    name:                              string;
    nasa_jpl_url:                      string;
    absolute_magnitude_h:              number;
    estimated_diameter:                EstimatedDiameter;
    is_potentially_hazardous_asteroid: boolean;
    close_approach_data:               CloseApproachDatum[];
    is_sentry_object:                  boolean;
}

export interface CloseApproachDatum {
    close_approach_date:       Date;
    close_approach_date_full:  string;
    epoch_date_close_approach: number;
    relative_velocity:         RelativeVelocity;
    miss_distance:             MissDistance;
    orbiting_body:             OrbitingBody;
}

export interface MissDistance {
    astronomical: string;
    lunar:        string;
    kilometers:   string;
    miles:        string;
}

export enum OrbitingBody {
    Earth = "Earth",
}

export interface RelativeVelocity {
    kilometers_per_second: string;
    kilometers_per_hour:   string;
    miles_per_hour:        string;
}

export interface EstimatedDiameter {
    kilometers: Feet;
    meters:     Feet;
    miles:      Feet;
    feet:       Feet;
}

export interface Feet {
    estimated_diameter_min: number;
    estimated_diameter_max: number;
}

export interface NearEarthObjectLinks {
    self: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toNasaData(json: string): NasaData {
        return cast(JSON.parse(json), r("NasaData"));
    }

    public static nasaDataToJson(value: NasaData): string {
        return JSON.stringify(uncast(value, r("NasaData")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "NasaData": o([
        { json: "links", js: "links", typ: r("NasaDataLinks") },
        { json: "element_count", js: "element_count", typ: 0 },
        { json: "near_earth_objects", js: "near_earth_objects", typ: m(a(r("NearEarthObject"))) },
    ], false),
    "NasaDataLinks": o([
        { json: "next", js: "next", typ: "" },
        { json: "previous", js: "previous", typ: "" },
        { json: "self", js: "self", typ: "" },
    ], false),
    "NearEarthObject": o([
        { json: "links", js: "links", typ: r("NearEarthObjectLinks") },
        { json: "id", js: "id", typ: "" },
        { json: "neo_reference_id", js: "neo_reference_id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "nasa_jpl_url", js: "nasa_jpl_url", typ: "" },
        { json: "absolute_magnitude_h", js: "absolute_magnitude_h", typ: 3.14 },
        { json: "estimated_diameter", js: "estimated_diameter", typ: r("EstimatedDiameter") },
        { json: "is_potentially_hazardous_asteroid", js: "is_potentially_hazardous_asteroid", typ: true },
        { json: "close_approach_data", js: "close_approach_data", typ: a(r("CloseApproachDatum")) },
        { json: "is_sentry_object", js: "is_sentry_object", typ: true },
    ], false),
    "CloseApproachDatum": o([
        { json: "close_approach_date", js: "close_approach_date", typ: Date },
        { json: "close_approach_date_full", js: "close_approach_date_full", typ: "" },
        { json: "epoch_date_close_approach", js: "epoch_date_close_approach", typ: 0 },
        { json: "relative_velocity", js: "relative_velocity", typ: r("RelativeVelocity") },
        { json: "miss_distance", js: "miss_distance", typ: r("MissDistance") },
        { json: "orbiting_body", js: "orbiting_body", typ: r("OrbitingBody") },
    ], false),
    "MissDistance": o([
        { json: "astronomical", js: "astronomical", typ: "" },
        { json: "lunar", js: "lunar", typ: "" },
        { json: "kilometers", js: "kilometers", typ: "" },
        { json: "miles", js: "miles", typ: "" },
    ], false),
    "RelativeVelocity": o([
        { json: "kilometers_per_second", js: "kilometers_per_second", typ: "" },
        { json: "kilometers_per_hour", js: "kilometers_per_hour", typ: "" },
        { json: "miles_per_hour", js: "miles_per_hour", typ: "" },
    ], false),
    "EstimatedDiameter": o([
        { json: "kilometers", js: "kilometers", typ: r("Feet") },
        { json: "meters", js: "meters", typ: r("Feet") },
        { json: "miles", js: "miles", typ: r("Feet") },
        { json: "feet", js: "feet", typ: r("Feet") },
    ], false),
    "Feet": o([
        { json: "estimated_diameter_min", js: "estimated_diameter_min", typ: 3.14 },
        { json: "estimated_diameter_max", js: "estimated_diameter_max", typ: 3.14 },
    ], false),
    "NearEarthObjectLinks": o([
        { json: "self", js: "self", typ: "" },
    ], false),
    "OrbitingBody": [
        "Earth",
    ],
};
