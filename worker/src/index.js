import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

const firebaseKeys = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));
let cachedGoogleToken = "";
let googleTokenExpiresAt = 0;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function normalizeGroupName(value) {
  return String(value || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

async function verifyFirebaseToken(request, projectId) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("unauthenticated");
  const { payload } = await jwtVerify(match[1], firebaseKeys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"]
  });
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("unauthenticated");
  return payload;
}

async function firestoreRequest(env, path, options = {}) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${env.FIREBASE_ADMIN_TOKEN}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || "Firestore request failed");
    error.status = response.status;
    throw error;
  }
  return body;
}

async function getGoogleAccessToken(env) {
  if (cachedGoogleToken && Date.now() < googleTokenExpiresAt - 60_000) return cachedGoogleToken;
  const privateKey = await importPKCS8(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit"
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || "Google service account authorization failed");
  cachedGoogleToken = data.access_token;
  googleTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedGoogleToken;
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { nullValue: null };
}

function toFirestoreFields(value = {}) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)]));
}

async function firestoreQuery(env, collection, field, value) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.FIREBASE_ADMIN_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: toFirestoreValue(value)
          }
        }
      }
    })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || "Firestore query failed");
  return (body || []).map((item) => item.document).filter(Boolean);
}

function documentId(document) {
  return document.name.split("/").pop();
}

async function listCollection(env, collection, groupId) {
  return firestoreQuery(env, collection, "groupId", groupId);
}

async function deleteDocument(env, documentPath) {
  try {
    await firestoreRequest(env, documentPath, { method: "DELETE" });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
}

async function clearAccount(request, env, user) {
  const ownedGroups = await firestoreQuery(env, "groups", "createdByUid", user.sub);
  const usersToDelete = new Set();
  for (const groupDoc of ownedGroups) {
    const groupId = documentId(groupDoc);
    const groupData = fromFirestoreFields(groupDoc.fields);
    if (String(groupData.createdByEmail || "").toLowerCase().endsWith("@groups.jomao.app")
      && typeof groupData.createdByUid === "string") {
      usersToDelete.add(groupData.createdByUid);
    }
    for (const collection of ["invitations", "accessRequests", "groupMembers"]) {
      const docs = await listCollection(env, collection, groupId);
      for (const doc of docs) await deleteDocument(env, doc.name.replace(`/documents/`, ""));
    }
    await deleteDocument(env, `groupFinance/${groupId}`);
    await deleteDocument(env, `groups/${groupId}`);
  }

  const callerMemberId = `gmail_${user.sub}`;
  const remainingMemberships = await firestoreQuery(env, "groupMembers", "memberId", callerMemberId);
  for (const member of remainingMemberships) {
    await deleteDocument(env, `groupMembers/${documentId(member)}`);
  }

  const userFinancePath = `userFinance/${user.sub}`;
  for (const provider of ["google", "facebook", "email"]) {
    await deleteDocument(env, `${userFinancePath}/accounts/${provider}`);
  }
  await deleteDocument(env, userFinancePath);

  if (String(user.email || "").toLowerCase().endsWith("@groups.jomao.app")) {
    usersToDelete.add(user.sub);
  }

  const authResponse = usersToDelete.size ? await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:batchDelete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.FIREBASE_ADMIN_TOKEN}`
      },
      body: JSON.stringify({ localIds: Array.from(usersToDelete), force: true })
    }
  ) : null;
  if (authResponse) {
    const authResult = await authResponse.json().catch(() => null);
    if (!authResponse.ok || authResult?.errors?.length) {
      throw new Error(authResult?.error?.message || "Could not delete one or more Firebase Auth accounts");
    }
  }
  return json({ cleared: true });
}

async function joinGroup(request, env, user) {
  const data = await request.json();
  const groupName = String(data.groupName || "").trim();
  const password = String(data.password || "");
  if (!groupName || !password || groupName.length > 120 || password.length > 128) {
    return json({ error: "Enter a valid group name and password." }, 400);
  }
  const email = String(user.email || "").toLowerCase();
  if (email.endsWith("@groups.jomao.app")) return json({ error: "Sign in with your own account before joining." }, 412);

  const normalized = normalizeGroupName(groupName);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const credentialResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `group-${hex}@groups.jomao.app`, password, returnSecureToken: false })
    }
  );
  const credential = await credentialResponse.json().catch(() => null);
  if (!credentialResponse.ok || !credential?.localId) return json({ error: "Group name or password is incorrect." }, 400);
  if (credential.localId === user.sub) return json({ error: "Use your personal login to join the group." }, 412);

  const groups = await firestoreQuery(env, "groups", "createdByUid", credential.localId);
  const match = groups.find((doc) => normalizeGroupName(fromFirestoreFields(doc.fields).name) === normalized);
  if (!match) return json({ error: "Group name or password is incorrect." }, 400);
  const groupId = documentId(match);
  const memberId = `gmail_${user.sub}`;
  const memberPath = `groupMembers/${groupId}__${memberId}`;
  const existingResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${memberPath}`,
    { headers: { authorization: `Bearer ${env.FIREBASE_ADMIN_TOKEN}` } }
  );
  const existing = existingResponse.ok ? await existingResponse.json() : null;
  if (existing) {
    const existingData = fromFirestoreFields(existing.fields);
    const currentRole = existingData.role;
    if (currentRole === "admin") return json({ error: "Use your personal login to join the group." }, 412);
    if (existingData.joinedWithGroupPassword !== true) {
      return json({ error: "This account joined using an invitation and cannot switch join methods." }, 412);
    }
    return json({ groupId, joined: true });
  }
  const memberName = String(user.name || user.email || "Member").trim();
  await firestoreRequest(env, memberPath, {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        ...toFirestoreFields({
        groupId,
        memberId,
        type: "gmail",
        label: memberName,
        email,
        role: "viewer",
        canEdit: false,
        joinedWithGroupPassword: true
        }),
        createdAt: { timestampValue: new Date().toISOString() }
      }
    })
  });
  return json({ groupId, joined: true });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "vary": "origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
    try {
      const user = await verifyFirebaseToken(request, env.FIREBASE_PROJECT_ID);
      const accessToken = await getGoogleAccessToken(env);
      const authorizedEnv = { ...env, FIREBASE_ADMIN_TOKEN: accessToken };
      const url = new URL(request.url);
      let response;
      if (url.pathname === "/join") response = await joinGroup(request, authorizedEnv, user);
      else if (url.pathname === "/clear-account") response = await clearAccount(request, authorizedEnv, user);
      else response = json({ error: "Not found" }, 404);
      const merged = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) merged.set(key, value);
      return new Response(response.body, { status: response.status, headers: merged });
    } catch (error) {
      const status = error.message === "unauthenticated" ? 401 : (error.status || 500);
      return new Response(JSON.stringify({ error: error.message || "Request failed" }), {
        status,
        headers: { ...headers, "content-type": "application/json; charset=utf-8" }
      });
    }
  }
};
