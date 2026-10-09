# Free group backend setup

The app keeps Firebase Authentication and Firestore. Group password joins and full account cleanup use a small Cloudflare Worker so they do not require Firebase Cloud Functions or a Firebase Blaze upgrade.

## 1. Create a restricted Google service account

In Google Cloud Console for project `saving-app-da3b7`, create a service account for this Worker. Give it these project roles:

- `Cloud Datastore User` (`roles/datastore.user`) for the Firestore REST API.
- `Firebase Authentication Admin` (`roles/firebaseauth.admin`) so Clear All Data can delete the group login accounts it owns.

Enable the `Identity Toolkit API` if Google Cloud asks for it. This avoids Firebase Cloud Functions, which is the service that triggered the Blaze requirement. If Google Cloud asks you to add billing for another API, stop rather than linking a billing account.

Create a JSON key and save it outside this repository. The key must never be committed or sent in chat. If Google blocks key creation by organization policy, stop here and do not place a private key in frontend code.

## 2. Set Worker secrets and deploy

Install Node.js, then from this folder run:

```powershell
cd worker
npm install
npx wrangler login
```

Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `worker/wrangler.toml` to the service account's `client_email` value. Then use PowerShell to submit the private key as a Cloudflare secret without printing it:

```powershell
$serviceAccount = Get-Content 'C:\secure\saving-app-worker-key.json' -Raw | ConvertFrom-Json
$serviceAccount.private_key | npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
```

Deploy:

```powershell
npx wrangler deploy
```

Wrangler will print a URL similar to `https://jomao-group-api.<account>.workers.dev`.

## 3. Connect the app and publish Firestore rules

Set `groupApiBaseUrl` in `js/core/state.js` to the Worker URL, without a trailing slash. Publish the updated app files and deploy `firestore.rules` from the project root:

```powershell
firebase deploy --only firestore:rules --project saving-app-da3b7
```

Group password join and full cleanup will work after both the Worker and updated app are published. The Cloudflare Workers Free plan currently has a 100,000-request daily limit; requests beyond the free quota are rejected until the quota resets. Firebase Authentication and Firestore still follow their own free quotas.

## What the Worker does

- Verifies the signed-in Firebase ID token before accepting a request.
- Checks the group name and password server-side, then adds the user as a viewer.
- Removes the signed-in user's group memberships and personal finance records when Clear All Data is used.
- Deletes groups owned by the current group login, including members, invitations, requests, and finance records, then deletes the corresponding group Auth account.

The Worker service account can access project data, so keep its key only in Cloudflare secrets and give the account only the roles listed above.
