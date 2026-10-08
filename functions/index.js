const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const firebaseWebApiKey = defineSecret("FIREBASE_WEB_API_KEY");

function normalizeGroupName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function groupAuthEmail(groupName) {
  const key = crypto.createHash("sha256").update(normalizeGroupName(groupName), "utf8").digest("hex");
  return `group-${key}@groups.jomao.app`;
}

exports.joinGroupWithPassword = onCall({
  region: "us-central1",
  maxInstances: 20,
  secrets: [firebaseWebApiKey]
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in with your own account before joining a group.");
  }
  if (String(request.auth.token.email || "").toLowerCase().endsWith("@groups.jomao.app")) {
    throw new HttpsError("failed-precondition", "Use your personal account before joining a group.");
  }

  const groupName = String(request.data?.groupName || "").trim();
  const password = String(request.data?.password || "");
  const apiKey = firebaseWebApiKey.value();
  if (!groupName || !password) {
    throw new HttpsError("invalid-argument", "Enter the group name and password.");
  }
  if (!apiKey || apiKey.length > 200) {
    throw new HttpsError("failed-precondition", "Firebase web API key is not configured for group login verification.");
  }
  if (groupName.length > 120 || password.length > 128) {
    throw new HttpsError("invalid-argument", "Group name or password is too long.");
  }
  let authResult;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: groupAuthEmail(groupName),
          password,
          returnSecureToken: false
        })
      }
    );
    authResult = await response.json();
    if (!response.ok || !authResult.localId) {
      throw new HttpsError("invalid-argument", "Group name or password is incorrect.");
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", "Could not verify the group credentials right now.");
  }

  const ownerUid = authResult.localId;
  if (ownerUid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Use your personal login to join; the group login belongs to the admin.");
  }

  const db = admin.firestore();
  const groupSnapshot = await db.collection("groups")
    .where("createdByUid", "==", ownerUid)
    .limit(2)
    .get();
  if (groupSnapshot.empty) {
    throw new HttpsError("invalid-argument", "Group name or password is incorrect.");
  }
  if (groupSnapshot.size !== 1) {
    throw new HttpsError("failed-precondition", "This group login is linked to more than one group.");
  }

  const groupDoc = groupSnapshot.docs[0];
  if (normalizeGroupName(groupDoc.data()?.name) !== normalizeGroupName(groupName)) {
    throw new HttpsError("invalid-argument", "Group name or password is incorrect.");
  }

  const groupId = groupDoc.id;
  const memberId = `gmail_${request.auth.uid}`;
  const memberRef = db.collection("groupMembers").doc(`${groupId}__${memberId}`);
  const memberName = String(request.auth.token.name || request.auth.token.email || "Member").trim();
  const memberEmail = String(request.auth.token.email || "").trim().toLowerCase();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(memberRef);
    if (existing.exists) {
      if (existing.data()?.role === "admin") {
        throw new HttpsError("failed-precondition", "Use your personal login to join; the group login belongs to the admin.");
      }
      if (existing.data()?.joinedWithGroupPassword !== true) {
        throw new HttpsError("failed-precondition", "This account joined using an invite and cannot switch join methods.");
      }
      return;
    }
    transaction.create(memberRef, {
      groupId,
      memberId,
      type: "gmail",
      label: memberName,
      email: memberEmail,
      role: "viewer",
      canEdit: false,
      joinedWithGroupPassword: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { groupId, joined: true };
});
