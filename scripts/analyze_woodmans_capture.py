#!/usr/bin/env python3
"""Analyze a captured ShopWoodmans app HAR file to spec out its private API.

This is Phase 0 tooling for the "add Woodman's as a second aisle-data source"
work (see the plan). It does NOT touch the app — you first capture the mobile
app's traffic yourself, then feed the export to this script and it tells you:

  * which backend host(s) the app talks to (frequency-ranked),
  * the product-search request(s): method, path, query/body params,
  * the auth scheme (Authorization / api-key style headers),
  * every response field that looks like an aisle / shelf / location, with a
    real sample value and its JSON path.

How to produce the input HAR
----------------------------
1. brew install mitmproxy && mitmweb          # start the proxy UI
2. On your phone: Settings -> Wi-Fi -> configure an HTTP proxy pointing at this
   machine's IP + mitmproxy's port (8080), then browse to http://mitm.it and
   install + fully trust the CA certificate.
3. Open ShopWoodmans, pick a store, turn ON "In-Store Mode", and search a few
   items (milk, bananas, cheddar cheese).
4. In mitmweb: File -> Export all flows -> HAR, save as e.g. woodmans.har
   (Charles Proxy and browser DevTools -> Network -> "Save all as HAR" also work.)

Then:  python scripts/analyze_woodmans_capture.py woodmans.har

If NO Woodman's backend host shows up and mitmproxy logged TLS errors for the
app's connections, the app is almost certainly certificate-pinned — that is the
feasibility failure called out in the plan; stop and report back.
"""

import json
import re
import sys
from collections import Counter

# Hosts that are almost never the product backend — analytics, crash reporting,
# CDNs, map tiles. Filtered out of the "candidate backend" ranking so the real
# API host stands out.
NOISE_HOST_RE = re.compile(
    r"(google|gstatic|googleapis|firebase|crashlytics|facebook|segment|"
    r"amplitude|mixpanel|branch\.io|sentry|doubleclick|adjust|appsflyer|"
    r"cloudfront|akamai|fastly|cdn|fonts|analytics|tiles|mapbox)",
    re.I,
)

# Response keys that plausibly carry the in-store position. This is the whole
# point of the capture, so we cast a wide net and let the human confirm.
AISLE_KEY_RE = re.compile(
    r"aisle|shelf|\bbay\b|location|section|department|position|planogram|coordinate",
    re.I,
)

# Request headers that reveal the auth scheme.
AUTH_HEADER_RE = re.compile(r"auth|token|api[-_]?key|session|bearer|client[-_]?id", re.I)


def _walk(node, path=""):
    """Yield (json_path, key, value) for every scalar leaf in a nested structure."""
    if isinstance(node, dict):
        for k, v in node.items():
            child = f"{path}.{k}" if path else k
            if isinstance(v, (dict, list)):
                yield from _walk(v, child)
            else:
                yield child, k, v
    elif isinstance(node, list):
        # Only descend into the first couple of elements — enough to see the
        # shape without dumping a 200-item product list.
        for i, v in enumerate(node[:2]):
            child = f"{path}[{i}]"
            if isinstance(v, (dict, list)):
                yield from _walk(v, child)
            else:
                yield child, str(i), v


def _parse_json(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return None


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        print("usage: python scripts/analyze_woodmans_capture.py <capture.har>")
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8", errors="replace") as fh:
        har = json.load(fh)

    entries = har.get("log", {}).get("entries", [])
    if not entries:
        print("No HAR entries found — is this a valid HAR export?")
        sys.exit(1)

    host_counts = Counter()
    aisle_hits = []          # (host, path, json_path, key, sample)
    auth_examples = {}       # header name -> (host, sample value, truncated)
    search_like = []         # (method, host, path, query, has_json_array_resp)

    for entry in entries:
        req = entry.get("request", {})
        resp = entry.get("response", {})
        url = req.get("url", "")
        method = req.get("method", "")
        m = re.match(r"https?://([^/]+)(/[^?]*)?", url)
        host = m.group(1) if m else url
        path = (m.group(2) or "/") if m else ""

        if not NOISE_HOST_RE.search(host):
            host_counts[host] += 1

        # Auth scheme
        for h in req.get("headers", []):
            name = h.get("name", "")
            if AUTH_HEADER_RE.search(name) and name.lower() not in auth_examples:
                val = h.get("value", "")
                shown = (val[:24] + "…") if len(val) > 24 else val
                auth_examples[name.lower()] = (host, shown)

        # Response body — look for aisle-ish fields
        body = resp.get("content", {}).get("text", "")
        data = _parse_json(body)
        json_array_resp = isinstance(data, list) or (
            isinstance(data, dict)
            and any(isinstance(v, list) and v for v in data.values())
        )
        if data is not None:
            for json_path, key, value in _walk(data):
                if AISLE_KEY_RE.search(key) and value not in (None, "", []):
                    sample = str(value)
                    sample = (sample[:60] + "…") if len(sample) > 60 else sample
                    aisle_hits.append((host, path, json_path, key, sample))

        # Heuristic: a product-search call usually has a query term param and a
        # list-shaped JSON response.
        query = {q.get("name"): q.get("value") for q in req.get("queryString", [])}
        looks_like_search = json_array_resp and (
            re.search(r"product|search|item|catalog|browse", path, re.I)
            or any(re.search(r"term|query|\bq\b|keyword|search", k or "", re.I) for k in query)
        )
        if looks_like_search and not NOISE_HOST_RE.search(host):
            search_like.append((method, host, path, query))

    print("=" * 70)
    print("CANDIDATE BACKEND HOSTS (noise/CDN/analytics filtered, by call count)")
    print("=" * 70)
    for host, n in host_counts.most_common(15):
        print(f"  {n:3d}  {host}")
    if not host_counts:
        print("  (none — every host looked like analytics/CDN. If mitmproxy also")
        print("   logged TLS handshake errors, the app is likely cert-pinned.)")

    print("\n" + "=" * 70)
    print("AUTH-RELATED REQUEST HEADERS (scheme + where the token comes from)")
    print("=" * 70)
    if auth_examples:
        for name, (host, shown) in sorted(auth_examples.items()):
            print(f"  {name:20s} = {shown:26s}  (on {host})")
    else:
        print("  (none found — the API may be unauthenticated, or auth is in a cookie)")

    print("\n" + "=" * 70)
    print("LIKELY PRODUCT-SEARCH REQUESTS")
    print("=" * 70)
    if search_like:
        seen = set()
        for method, host, path, query in search_like:
            sig = (method, host, path)
            if sig in seen:
                continue
            seen.add(sig)
            print(f"  {method} https://{host}{path}")
            if query:
                for k, v in query.items():
                    print(f"        ?{k}={v}")
    else:
        print("  (none matched — inspect the host list above manually)")

    print("\n" + "=" * 70)
    print("AISLE / LOCATION FIELDS IN RESPONSES  (the payoff — confirm these)")
    print("=" * 70)
    if aisle_hits:
        # Dedupe by (host, key, json_path) so a 200-item list doesn't spam.
        seen = set()
        for host, path, json_path, key, sample in aisle_hits:
            sig = (host, path, re.sub(r"\[\d+\]", "[]", json_path))
            if sig in seen:
                continue
            seen.add(sig)
            print(f"  {host}{path}")
            print(f"      {json_path}  ({key!r}) = {sample!r}")
    else:
        print("  (no aisle-like fields found. Make sure In-Store Mode was ON when")
        print("   you searched — the location field only appears in that mode.)")

    print()


if __name__ == "__main__":
    main()
