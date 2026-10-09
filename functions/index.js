const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();
const db = admin.firestore();
// Same public Firebase web API key used by the client app. This is an identifier,
// not an authentication credential; access is controlled by Firebase Auth and rules.
const identityToolkitKey = "AIzaSyDDGb1bNysz2Vszt116K2a3GGL9Rzsx9II";

function groupNameKey(groupName) {
  const normalized = String(groupName || "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

exports.joinGroupWithPassword = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before joining a group.");
  if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("failed-precondition", "Use a Google, Facebook, or email account first.");
  }

  const groupName = String(request.data?.groupName || "").trim();
  const password = String(request.data?.password || "");
  if (!groupName || !password || groupName.length > 100) {
    throw new HttpsError("invalid-argument", "Enter a valid group name and password.");
  }

  const groupEmail = `group-${groupNameKey(groupName)}@groups.jomao.app`;
  const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(identityToolkitKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: groupEmail, password, returnSecureToken: true })
  });
  if (!verifyResponse.ok) {
    throw new HttpsError("unauthenticated", "Group name or password is incorrect.");
  }
  const credentials = await verifyResponse.json();
  const owner = await admin.auth().getUserByEmail(groupEmail);
  if (credentials.localId !== owner.uid) throw new HttpsError("unauthenticated", "Group credentials could not be verified.");

  const groupSnap = await db.collection("groups").where("createdByUid", "==", owner.uid).limit(1).get();
  if (groupSnap.empty) throw new HttpsError("not-found", "The group account was not found.");
  const groupDoc = groupSnap.docs[0];
  if (owner.uid === request.auth.uid) {
    throw new HttpsError("already-exists", "You are already the group admin.");
  }

  const groupId = groupDoc.id;
  const memberId = `gmail_${request.auth.uid}`;
  const memberRef = db.collection("groupMembers").doc(`${groupId}__${memberId}`);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(memberRef);
    const memberData = {
      groupId,
      memberId,
      type: "gmail",
      label: request.auth.token.name || request.auth.token.email || "Member",
      email: String(request.auth.token.email || "").toLowerCase(),
      role: existing.exists ? existing.data().role : "viewer",
      canEdit: existing.exists ? existing.data().role === "editor" : false,
      joinedWithGroupPassword: true,
      createdAt: existing.exists ? existing.data().createdAt : now,
      lastJoinedAt: now
    };
    if (memberData.role === "editor") memberData.grantedByUid = owner.uid;
    transaction.set(memberRef, memberData, { merge: true });
  });

  return { groupId, role: "viewer", canEdit: false };
});
