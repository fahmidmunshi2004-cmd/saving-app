import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const FIREBASE_ISSUER = (projectId) => `https://securetoken.google.com/${projectId}`;
const PUBLIC_KEYS = createRemoteJWKSet(
  new URL(`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`)
);

function reply(status, body, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "vary": "Origin",
      "cache-control": "no-store"
    }
  });
}

function groupAuthEmail(name) {
  const normalized = String(name).normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized)).then((hash) => {
    const hex = Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
    return `group-${hex}@groups.jomao.app`;
  });
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, firestoreValue(entry)])) } };
  throw new Error("Unsupported Firestore value.");
}

function firestoreObject(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, firestoreValue(value)]));
}

function decodedValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decodedValue(entry)]));
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodedValue);
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodedValue(value)]));
}

async function verifyUser(request, env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Sign in with your personal account first."), { status: 401, code: "unauthenticated" });
  const { payload } = await jwtVerify(token, PUBLIC_KEYS, {
    audience: env.FIREBASE_PROJECT_ID,
    issuer: FIREBASE_ISSUER(env.FIREBASE_PROJECT_ID)
  });
  if (!payload.sub || payload.firebase?.sign_in_provider === "anonymous") {
    throw Object.assign(new Error("Use a Google, Facebook, or email account first."), { status: 401, code: "unauthenticated" });
  }
  if (String(payload.email || "").toLowerCase().endsWith("@groups.jomao.app")) {
    throw Object.assign(new Error("Sign in with your personal Google, Facebook, or email account."), { status: 401, code: "unauthenticated" });
  }
  return payload;
}

async function googleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_SERVICE_ACCOUNT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(`Google authorization failed (${tokenResponse.status}).`);
  return tokenBody.access_token;
}

async function firestoreRequest(projectId, accessToken, path, init = {}) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${path}`, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, ...(init.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `Firestore request failed (${response.status}).`);
  return body;
}

async function handleJoin(request, env, origin) {
  let user;
  try {
    user = await verifyUser(request, env);
  } catch (error) {
    return reply(error.status || 401, { error: error.code || "unauthenticated", message: error.message }, origin);
  }
  if (env.GROUP_JOIN_LIMITER) {
    const rate = await env.GROUP_JOIN_LIMITER.limit({ key: user.sub });
    if (!rate.success) return reply(429, { error: "rate-limited", message: "Too many join attempts. Wait one minute and try again." }, origin);
  }
  if (env.GROUP_JOIN_IP_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const rate = await env.GROUP_JOIN_IP_LIMITER.limit({ key: ip });
    if (!rate.success) return reply(429, { error: "rate-limited", message: "Too many join attempts from this network. Wait one minute and try again." }, origin);
  }

  let input;
  try { input = await request.json(); } catch (_) {
    return reply(400, { error: "invalid-argument", message: "Invalid request body." }, origin);
  }
  const groupName = String(input.groupName || "").trim();
  const password = String(input.password || "");
  if (!groupName || groupName.length > 100 || !password || password.length > 256) {
    return reply(400, { error: "invalid-argument", message: "Enter a valid group name and password." }, origin);
  }

  try {
    const email = await groupAuthEmail(groupName);
    const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const authData = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authData.localId) {
      return reply(401, { error: "wrong-password", message: "The group name or password is incorrect." }, origin);
    }

    const accessToken = await googleAccessToken(env);
    const queryPath = ":runQuery";
    const query = {
      structuredQuery: {
        from: [{ collectionId: "groups" }],
        where: { fieldFilter: { field: { fieldPath: "createdByUid" }, op: "EQUAL", value: { stringValue: authData.localId } } },
        limit: 1
      }
    };
    const queryRows = await firestoreRequest(env.FIREBASE_PROJECT_ID, accessToken, queryPath, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(query)
    });
    const groupRow = queryRows.find((row) => row.document);
    if (!groupRow) return reply(404, { error: "not-found", message: "Group account not found." }, origin);
    if (authData.localId === user.sub) return reply(409, { error: "already-admin", message: "You are already this group's admin." }, origin);

    const groupDoc = groupRow.document;
    const groupId = groupDoc.name.split("/").pop();
    const memberId = `gmail_${user.sub}`;
    const memberPath = `/groupMembers/${encodeURIComponent(`${groupId}__${memberId}`)}`;
    let oldMember = null;
    try {
      oldMember = await firestoreRequest(env.FIREBASE_PROJECT_ID, accessToken, memberPath);
    } catch (_) { /* first join */ }
    const existing = oldMember ? decodeFields(oldMember.fields) : {};
    const existingRole = existing.role === "editor" && existing.canEdit === true && existing.grantedByUid === authData.localId
      ? "editor"
      : "viewer";
    const memberData = {
      groupId,
      memberId,
      type: "gmail",
      label: String(user.name || user.email || "Member").slice(0, 120),
      email: String(user.email || "").toLowerCase(),
      role: existingRole,
      canEdit: existingRole === "editor",
      joinedWithGroupPassword: true,
      createdAt: existing.createdAt || null
    };
    if (existingRole === "editor") memberData.grantedByUid = authData.localId;
    const fields = firestoreObject(memberData);
    fields.createdAt = oldMember?.fields?.createdAt || { timestampValue: new Date().toISOString() };
    fields.lastJoinedAt = { timestampValue: new Date().toISOString() };
    const updateMask = [...Object.keys(memberData).filter((field) => field !== "createdAt"), "createdAt", "lastJoinedAt"]
      .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
    await firestoreRequest(env.FIREBASE_PROJECT_ID, accessToken, `${memberPath}?${updateMask}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return reply(200, { groupId, role: "viewer", canEdit: false }, origin);
  } catch (error) {
    console.error("Group join failed", error?.message || "unknown error");
    return reply(500, { error: "internal", message: "Group join service could not complete the request." }, origin);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      } });
    }
    if (request.method !== "POST" || new URL(request.url).pathname !== "/join") {
      return reply(404, { error: "not-found", message: "Endpoint not found." }, origin);
    }
    if (env.APP_ORIGIN && env.APP_ORIGIN !== "*" && origin !== env.APP_ORIGIN) {
      return reply(403, { error: "forbidden", message: "Origin is not allowed." }, env.APP_ORIGIN);
    }
    return handleJoin(request, env, env.APP_ORIGIN === "*" ? origin : env.APP_ORIGIN || origin);
  }
};
