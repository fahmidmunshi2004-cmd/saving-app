# Group join Worker

This Worker lets a signed-in Google, Facebook, or email user join a group with its group name and password without Firebase Cloud Functions or Blaze. It also permanently deletes an owned group and its group login after verifying the signed-in owner, exact group name, and group password.

## One-time Cloudflare setup

1. Install Node.js, then open a terminal in `worker` and run `npm install`.
2. Sign in to Cloudflare from that terminal with `npx wrangler login`.
3. In Google Cloud Console, create a dedicated service account for this Worker and grant it **Cloud Datastore User** on project `saving-app-da3b7`. Create a JSON key for that service account. Keep this key private.
4. From `worker`, store the service account email and private key as Worker secrets:

   ```powershell
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_EMAIL
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
   ```

   For the private key, paste the full `private_key` value from the JSON key file, including its `BEGIN/END PRIVATE KEY` lines. Do not commit or send the key.

5. Set `APP_ORIGIN` in `wrangler.toml` to the exact origin where the app is hosted. Keep the `https://` prefix and do not add a path.
6. Deploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

7. Copy the deployed `https://...workers.dev` origin into `js/group-join-config.js`:

   ```js
   window.GROUP_JOIN_API_URL = "https://your-worker.your-cloudflare-subdomain.workers.dev";
   ```

8. Publish the updated app files. The Worker limits join attempts to 10 per signed-in user and 30 per network address per minute.

The Firebase Web API key in `wrangler.toml` is the app's public Firebase identifier. If the existing key is restricted to browser HTTP referrers, make a separate key restricted to the Identity Toolkit API and set it in `wrangler.toml`; the Worker call is server-to-server. The service account private key is the sensitive credential and must only be stored with `wrangler secret`.
