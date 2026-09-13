#!/usr/bin/env python3
"""Promote an already-uploaded Play internal release to production (no AAB re-upload)."""

from __future__ import annotations

import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

PACKAGE = "io.github.plamarque.twa"
SCOPE = "https://www.googleapis.com/auth/androidpublisher"


def main() -> int:
    tag = os.environ.get("PROMOTE_TAG", "").strip()
    raw = os.environ.get("PLAY_STORE_SERVICE_ACCOUNT", "").strip()
    if not raw:
        print("PLAY_STORE_SERVICE_ACCOUNT manquant", file=sys.stderr)
        return 1

    creds = service_account.Credentials.from_service_account_info(
        json.loads(raw), scopes=[SCOPE]
    )
    service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

    edit_id = service.edits().insert(packageName=PACKAGE, body={}).execute()["id"]
    internal = (
        service.edits()
        .tracks()
        .get(packageName=PACKAGE, editId=edit_id, track="internal")
        .execute()
    )
    releases = internal.get("releases") or []
    if not releases:
        print("Aucune release sur la piste internal", file=sys.stderr)
        return 1

    chosen = None
    if tag:
        for rel in releases:
            if rel.get("name") == tag:
                chosen = rel
                break
    if chosen is None:
        chosen = releases[0]

    version_codes = chosen.get("versionCodes") or []
    if not version_codes:
        print(f"Release internal sans versionCodes: {chosen}", file=sys.stderr)
        return 1

    release_notes = chosen.get("releaseNotes") or []
    production_release = {
        "name": chosen.get("name") or tag or str(version_codes[0]),
        "versionCodes": version_codes,
        "status": "completed",
    }
    if release_notes:
        production_release["releaseNotes"] = release_notes

    service.edits().tracks().update(
        packageName=PACKAGE,
        editId=edit_id,
        track="production",
        body={"track": "production", "releases": [production_release]},
    ).execute()
    service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
    print(
        f"Promu en production: name={production_release['name']} versionCodes={version_codes}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
