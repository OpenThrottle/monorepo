#!/usr/bin/env bash
# check.sh — mechanical Agent Skills spec checks for one or many skill directories.
# Spec: https://agentskills.io/specification
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: check.sh [--quiet] [--resolve-paths] <path>...

Each <path> is either a skill directory (holds SKILL.md) or a directory of skills
(every immediate child holding SKILL.md is checked). Symlinked skills are followed.

Checks per skill:
  spec     SKILL.md + frontmatter present; name format and == directory name;
           description 1-1024 chars (after YAML folding); compatibility <= 500;
           metadata values quoted strings; relative links resolve
  quality  SKILL.md < 500 lines (warn past 400) and ~5000 tokens; unknown top-level
           frontmatter keys without a `#` reason comment on the line above; allowed-tools
           given as a YAML list; links escaping the skill directory (../); a file in
           scripts/ that SKILL.md never names
  info     metadata.last-reviewed (or "never"); commented non-spec keys; top-level
           entries other than SKILL.md, scripts, references, assets, evals; frontmatter
           order and a non-semver metadata.version (OpenThrottle repos)

OpenThrottle repos (the git root has skills/ and .agents/skills/), owned skills only:
  quality  description lacks `USE WHEN`, or lacks a `Not for` clause
  Vendored skills (a real directory in .agents/skills/ listed in skills-lock.json) are
  exempt. There is no length warning below the spec's 1024: keep descriptions slim.

Output: one block per skill on stdout, then a summary line.
  --quiet          print only skills with findings, plus the summary.
  --resolve-paths  also report backticked repo-relative paths in SKILL.md (containing a
                   `/` and a known top-level directory) that do not exist at the git root.
                   Off by default: a portable skill legitimately names host-repo paths.

Exit codes:
  0  no spec violations (quality warnings may exist)
  1  at least one spec violation
  2  usage error (bad flag, path not found, no skills found)

The reference validator is `skills-ref validate <dir>`
(https://github.com/agentskills/agentskills/tree/main/skills-ref); run it too when available.
USAGE
}

QUIET=0
RESOLVE_PATHS=0
PATHS=()
for arg in "$@"; do
  case "$arg" in
    -h | --help) usage; exit 0 ;;
    --quiet) QUIET=1 ;;
    --resolve-paths) RESOLVE_PATHS=1 ;;
    -*) echo "check.sh: unknown flag '$arg'. Try --help." >&2; exit 2 ;;
    *) PATHS+=("$arg") ;;
  esac
done
if [ "${#PATHS[@]}" -eq 0 ]; then
  echo "check.sh: no path given. Pass a skill directory or a directory of skills; see --help." >&2
  exit 2
fi

SKILLS=()
for p in "${PATHS[@]}"; do
  if [ ! -d "$p" ]; then
    echo "check.sh: '$p' is not a directory." >&2
    exit 2
  fi
  if [ -f "$p/SKILL.md" ]; then
    SKILLS+=("${p%/}")
  else
    for child in "$p"/*/; do
      [ -f "${child}SKILL.md" ] && SKILLS+=("${child%/}")
    done
  fi
done
if [ "${#SKILLS[@]}" -eq 0 ]; then
  echo "check.sh: no SKILL.md found under: ${PATHS[*]}" >&2
  exit 2
fi

KNOWN_KEYS=" name description license compatibility metadata allowed-tools "
KNOWN_ENTRIES=" SKILL.md scripts references assets evals LICENSE LICENSE.txt LICENSE.md "
HOUSE_ORDER="name description license compatibility metadata allowed-tools"

# OpenThrottle mode: the git root of the current directory has skills/ and .agents/skills/.
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
OT_MODE=0
if [ -n "$GIT_ROOT" ] && [ -d "$GIT_ROOT/skills" ] && [ -d "$GIT_ROOT/.agents/skills" ]; then
  OT_MODE=1
fi

# is_vendored <name> — a real directory in .agents/skills/ that skills-lock.json lists.
is_vendored() {
  [ "$OT_MODE" -eq 1 ] || return 1
  local d="$GIT_ROOT/.agents/skills/$1"
  [ -d "$d" ] && [ ! -L "$d" ] && [ -f "$GIT_ROOT/skills-lock.json" ] &&
    grep -q "\"$1\"[[:space:]]*:" "$GIT_ROOT/skills-lock.json"
}
TOTAL_SPEC=0
TOTAL_QUALITY=0
FAILED_SKILLS=0

# frontmatter <file> — print the YAML between the first two '---' lines.
frontmatter() {
  awk 'NR==1 && $0!="---" {exit} NR==1 {next} $0=="---" {exit} {print}' "$1"
}

# scalar <yaml> <key> — value of a top-level key, folding >-, >, |, |- blocks into one line.
scalar() {
  printf '%s\n' "$1" | awk -v key="$2" '
    function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    inblock && /^[^ \t]/ { exit }
    inblock { line = trim($0); if (line != "") out = out (out == "" ? "" : sep) line; next }
    index($0, key ":") == 1 {
      v = trim(substr($0, length(key) + 2))
      if (v ~ /^[>|][-+]?$/) { inblock = 1; sep = (v ~ /^>/) ? " " : "\n"; next }
      if (v ~ /^".*"$/ || v ~ /^\x27.*\x27$/) v = substr(v, 2, length(v) - 2)
      print v; found = 1; exit
    }
    END { if (inblock) print out }'
}

for dir in "${SKILLS[@]}"; do
  file="$dir/SKILL.md"
  dirname="$(basename "$dir")"
  findings=()

  fm="$(frontmatter "$file")"
  if [ -z "$fm" ]; then
    findings+=("spec     SKILL.md has no YAML frontmatter (must open with a '---' line)")
  fi

  name="$(scalar "$fm" name)"
  desc="$(scalar "$fm" description)"
  compat="$(scalar "$fm" compatibility)"

  if [ -z "$name" ]; then
    findings+=("spec     name is missing")
  else
    if [ "${#name}" -gt 64 ] || ! [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      findings+=("spec     name '$name' must be 1-64 chars of a-z, 0-9 and single inner hyphens")
    fi
    if [ "$name" != "$dirname" ]; then
      findings+=("spec     name '$name' does not match directory '$dirname'")
    fi
  fi

  if [ -z "$desc" ]; then
    findings+=("spec     description is missing or empty")
  elif [ "${#desc}" -gt 1024 ]; then
    findings+=("spec     description is ${#desc} chars; the limit is 1024")
  fi

  if [ -n "$compat" ] && [ "${#compat}" -gt 500 ]; then
    findings+=("spec     compatibility is ${#compat} chars; the limit is 500")
  fi

  # metadata: every child value must be a quoted string or plain text, not a bare number/date/bool.
  meta_bad="$(printf '%s\n' "$fm" | awk '
    /^metadata:/ { inm = 1; next }
    inm && /^[^ \t]/ { exit }
    inm && /^[ \t]+[^ \t#][^:]*:/ {
      k = $0; sub(/:.*/, "", k); gsub(/^[ \t]+/, "", k)
      v = $0; sub(/^[^:]*:[ \t]*/, "", v)
      if (v ~ /^-?[0-9.]+$/ || v ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ || v ~ /^(true|false|null|~)$/) print k "=" v
    }')"
  while IFS= read -r bad; do
    [ -n "$bad" ] && findings+=("spec     metadata.${bad%%=*} is '${bad#*=}', not a string; quote it")
  done <<<"$meta_bad"

  last_reviewed="$(printf '%s\n' "$fm" | awk '
    /^metadata:/ { inm = 1; next }
    inm && /^[^ \t]/ { exit }
    inm && /^[ \t]+last-reviewed:/ { v = $0; sub(/^[^:]*:[ \t]*/, "", v); gsub(/[\x27"]/, "", v); print v }')"

  vendored=0
  is_vendored "$dirname" && vendored=1

  key_order=()
  while IFS=$'\t' read -r key commented; do
    [ -z "$key" ] && continue
    key_order+=("$key")
    case "$KNOWN_KEYS" in
      *" $key "*) ;;
      *)
        if [ "$commented" = "1" ]; then
          findings+=("info     top-level key '$key' is not in the spec; kept, with the reason commented above it")
        elif [ "$vendored" -eq 1 ]; then
          findings+=("info     top-level key '$key' is not in the spec (vendored: raise upstream, do not edit)")
        else
          findings+=("quality  top-level key '$key' is not in the spec; give its reason in a # comment on the line above, else move it to metadata")
        fi
        ;;
    esac
  done < <(printf '%s\n' "$fm" | awk '
    /^[A-Za-z0-9_-]+:/ { k = $0; sub(/:.*/, "", k); print k "\t" (prev ~ /^#/ ? 1 : 0) }
    { prev = $0 }')

  if [ "$OT_MODE" -eq 1 ] && [ "$vendored" -eq 0 ] && [ -n "$desc" ]; then
    case "$desc" in
      *"USE WHEN"*) ;;
      *) findings+=("quality  description has no 'USE WHEN' clause (house shape: capability, USE WHEN …, Not for …)") ;;
    esac
    if ! printf '%s' "$desc" | grep -qi 'not for'; then
      findings+=("quality  description has no 'Not for' clause naming the neighbouring skill")
    fi
    expected=""
    for k in $HOUSE_ORDER; do
      for have in ${key_order[@]+"${key_order[@]}"}; do
        [ "$have" = "$k" ] && expected="$expected $k"
      done
    done
    actual=""
    for have in ${key_order[@]+"${key_order[@]}"}; do
      case "$KNOWN_KEYS" in *" $have "*) actual="$actual $have" ;; esac
    done
    if [ "$expected" != "$actual" ]; then
      findings+=("info     frontmatter order is${actual}; house order is${expected}")
    fi
    version="$(printf '%s\n' "$fm" | awk '
      /^metadata:/ { inm = 1; next }
      inm && /^[^ \t]/ { exit }
      inm && /^[ \t]+version:/ { v = $0; sub(/^[^:]*:[ \t]*/, "", v); gsub(/[\x27"]/, "", v); print v }')"
    if [ -n "$version" ] && ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      findings+=("info     metadata.version '$version' is not semver (MAJOR.MINOR.PATCH)")
    fi
  fi

  # Top-level entries outside the spec's conventional layout.
  extra=""
  for entry in "$dir"/* "$dir"/.[!.]*; do
    [ -e "$entry" ] || continue
    base="$(basename "$entry")"
    case "$KNOWN_ENTRIES" in *" $base "*) continue ;; esac
    case "$base" in .DS_Store) continue ;; esac
    extra="$extra $base"
  done
  [ -n "$extra" ] && findings+=("info     top-level entries beyond SKILL.md/scripts/references/assets/evals:$extra")

  # Every bundled script is named in SKILL.md.
  if [ -d "$dir/scripts" ]; then
    for script in "$dir"/scripts/*; do
      [ -f "$script" ] || continue
      sname="$(basename "$script")"
      grep -qF "$sname" "$file" || findings+=("quality  scripts/$sname is never named in SKILL.md; list it so the agent knows it exists")
    done
  fi

  # Optional: backticked repo-relative paths that do not exist at the git root.
  if [ "$RESOLVE_PATHS" -eq 1 ] && [ -n "$GIT_ROOT" ]; then
    while IFS= read -r cited; do
      [ -z "$cited" ] && continue
      [ -e "$GIT_ROOT/$cited" ] || [ -e "$dir/$cited" ] ||
        findings+=("quality  cites '$cited', which does not exist at $GIT_ROOT")
    done < <(awk '
      /^[ \t]*```/ { fence = !fence; next }
      fence { next }
      {
        line = $0
        while (match(line, /`[^` ]+`/)) {
          t = substr(line, RSTART + 1, RLENGTH - 2)
          line = substr(line, RSTART + RLENGTH)
          if (t !~ /\//) continue
          if (t ~ /[<>*$:{}]|…|^https?|^~|^\.\.?\//) continue
          if (t !~ /^(applications|packages|tools|scripts|databases|docs|skills|plugins|\.agents|\.claude|\.github|\.worktree|\.husky)\//) continue
          print t
        }
      }' "$file" | sort -u)
  fi

  # allowed-tools is a space-separated string in the spec; a YAML list parses but is not it.
  if printf '%s\n' "$fm" | awk '
    /^allowed-tools:[ \t]*$/ { open = 1; next }
    open && /^[ \t]*-[ \t]/ { found = 1; exit }
    open && /^[^ \t]/ { exit }
    END { exit !found }'; then
    findings+=("quality  allowed-tools is a YAML list; the spec wants a space-separated string (e.g. allowed-tools: Bash Read)")
  fi

  lines="$(wc -l <"$file" | tr -d ' ')"
  tokens=$(( $(wc -c <"$file" | tr -d ' ') / 4 ))
  if [ "$lines" -ge 500 ]; then
    findings+=("quality  SKILL.md is $lines lines; keep it under 500 (move detail to references/)")
  elif [ "$lines" -gt 400 ]; then
    findings+=("quality  SKILL.md is $lines lines; nearing the 500-line budget")
  fi
  if [ "$tokens" -gt 5000 ]; then
    findings+=("quality  SKILL.md is ~$tokens tokens (bytes/4); keep it near 5000")
  fi

  # Relative Markdown links in every .md file of the skill (not inside code fences).
  # Links that leave the skill directory are collected and reported once per skill.
  escaped=()
  while IFS= read -r md; do
    rel="${md#"$dir"/}"
    md_dir="$(dirname "$md")"
    while IFS=$'\t' read -r lineno target; do
      [ -z "$target" ] && continue
      path="${target%%#*}"
      [ -z "$path" ] && continue
      if [ ! -e "$md_dir/$path" ]; then
        findings+=("spec     $rel:$lineno links to '$path', which does not exist")
      elif [[ "$path" == ../* || "$path" == */../* ]]; then
        resolved="$(cd "$md_dir" && cd "$(dirname "$path")" 2>/dev/null && pwd -P)"
        skill_root="$(cd "$dir" && pwd -P)"
        case "$resolved/" in
          "$skill_root"/*) ;;
          *) escaped+=("$path") ;;
        esac
      fi
    done < <(awk '
      /^[ \t]*```/ { fence = !fence; next }
      fence { next }
      {
        line = $0
        while (match(line, /\]\([^)[:space:]]+\)/)) {
          t = substr(line, RSTART + 2, RLENGTH - 3)
          line = substr(line, RSTART + RLENGTH)
          if (t ~ /^(https?:|mailto:|#)/) continue
          print NR "\t" t
        }
      }' "$md")
  done < <(find -L "$dir" -name '*.md' -type f -not -path '*/node_modules/*' | sort)
  if [ "${#escaped[@]}" -gt 0 ]; then
    unique="$(printf '%s\n' "${escaped[@]}" | sort -u)"
    unique_n="$(printf '%s\n' "$unique" | wc -l | tr -d ' ')"
    sample="$(printf '%s\n' "$unique" | head -5 | paste -sd ',' - | sed 's/,/, /g')"
    [ "$unique_n" -gt 5 ] && sample="$sample, …"
    findings+=("quality  ${#escaped[@]} link(s) to $unique_n file(s) outside the skill, dead once installed elsewhere: $sample")
  fi

  spec_n=0
  quality_n=0
  info_only=1
  for f in ${findings[@]+"${findings[@]}"}; do
    case "$f" in
      spec*) spec_n=$((spec_n + 1)); info_only=0 ;;
      quality*) quality_n=$((quality_n + 1)); info_only=0 ;;
    esac
  done
  TOTAL_SPEC=$((TOTAL_SPEC + spec_n))
  TOTAL_QUALITY=$((TOTAL_QUALITY + quality_n))
  [ "$spec_n" -gt 0 ] && FAILED_SKILLS=$((FAILED_SKILLS + 1))

  if [ "$QUIET" -eq 1 ] && [ "$info_only" -eq 1 ]; then
    continue
  fi
  label="owned"
  [ "$vendored" -eq 1 ] && label="vendored"
  [ "$OT_MODE" -eq 1 ] || label="skill"
  echo "== $dirname ($label) — $spec_n spec, $quality_n quality — lines $lines/500 · description ${#desc}/1024 · ~${tokens} tokens · last reviewed ${last_reviewed:-never}"
  for f in ${findings[@]+"${findings[@]}"}; do
    echo "   $f"
  done
done

echo "-- ${#SKILLS[@]} skill(s): $TOTAL_SPEC spec, $TOTAL_QUALITY quality; $FAILED_SKILLS with spec violations"
[ "$TOTAL_SPEC" -eq 0 ]
