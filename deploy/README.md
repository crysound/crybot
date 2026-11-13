
The optional `CRYBOT_UPDATE_URL` feed must use HTTPS. The server reads JSON `{ "version": "1.2.3", "releaseUrl": "https://updates.example.test/releases/1.2.3" }`; `update.sh` reads `{ "image": "ghcr.io/crysound/crybot@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "version": "1.2.3" }`. A shared feed can provide all three fields. The release URL must use HTTPS and share the feed origin.

The script requires an image digest under `ghcr.io/crysound/crybot`; replace the example digest with the published image digest. It makes one request and does not follow redirects.
