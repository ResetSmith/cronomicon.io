#!/usr/bin/env bash
# Set the Cronomicon release version everywhere the site states it.
#
#   scripts/bump-version.sh 2.1.0
#
# The app repo's publish workflow runs this on every release tag, in the same
# commit that publishes the manuals. Run it by hand to correct a version.
# Running it for the version the site already shows changes nothing.
set -euo pipefail

v="${1:-}"
v="${v#v}"
if ! [[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 X.Y.Z" >&2
  exit 2
fi

cd "$(dirname "$0")/.."

ver='[0-9]+\.[0-9]+\.[0-9]+'
chip="s#(<span class=\"tag\">v)$ver(</span>)#\\1$v\\2#g"
before="$(cat index.html docs/index.html | sha256sum)"

sed -E -i \
  -e "$chip" \
  -e "s#(\"softwareVersion\":\")$ver(\")#\\1$v\\2#g" \
  -e "s#(ghcr\\.io/resetsmith/cronomicon:)$ver#\\1$v#g" \
  index.html
sed -E -i -e "$chip" docs/index.html

# Each place must now show the version. A miss means the markup moved and the
# patterns above need updating, so fail rather than publish a half-bumped page.
expect() {
  local file="$1" want="$2" text="$3" got
  got="$(grep -o -F -- "$text" "$file" | wc -l || true)"
  if [ "$got" -ne "$want" ]; then
    echo "$file: expected $want of '$text', found $got" >&2
    exit 1
  fi
}
expect index.html 1 "<span class=\"tag\">v$v</span>"
expect index.html 1 "\"softwareVersion\":\"$v\""
expect index.html 2 "ghcr.io/resetsmith/cronomicon:$v"
expect docs/index.html 1 "<span class=\"tag\">v$v</span>"

# The two pages changed, so their sitemap dates do too.
if [ "$before" != "$(cat index.html docs/index.html | sha256sum)" ]; then
  today="$(date -u +%F)"
  sed -E -i "s#(<loc>https://cronomicon\\.io/(docs/)?</loc><lastmod>)[0-9-]+#\\1$today#" sitemap.xml
  expect sitemap.xml 2 "<lastmod>$today</lastmod>"
  echo "site version set to $v"
else
  echo "site version already $v"
fi
