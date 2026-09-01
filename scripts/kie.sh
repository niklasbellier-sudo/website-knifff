#!/usr/bin/env bash
# Node-free KIE.AI asset generator: same endpoints as scrollcraft's kie.mjs,
# driven with curl + jq so it runs where only Node 10 is available.
#
#   scripts/kie.sh probe
#   scripts/kie.sh still "<prompt>" out/01.png [--ar 16:9] [--ref ref.png]
#   scripts/kie.sh shot  "<prompt>" head.png out/01.mp4 [--tail tail.png] [--dur 5]
#
# Key: KIE_AI_API_KEY from the environment, else the nearest .env walking up.
set -euo pipefail

API="https://api.kie.ai"
UPLOAD="https://kieai.redpandaai.co/api/file-base64-upload"
MODEL_STILL="seedream/5-pro-text-to-image"
MODEL_STILL_EDIT="seedream/5-pro-image-to-image"
MODEL_SHOT="kling/v2-1-pro"

# ---- key ----------------------------------------------------------------
load_key() {
  if [ -n "${KIE_AI_API_KEY:-}" ]; then printf '%s' "$KIE_AI_API_KEY"; return; fi
  if [ -f "$HOME/.config/kniff/.env" ]; then grep -E '^\s*KIE_AI_API_KEY\s*=' "$HOME/.config/kniff/.env" | head -1 | sed -E 's/^[^=]*=\s*//; s/^"//; s/"$//'; return; fi
  local d; d="$(pwd)"
  for _ in 1 2 3 4 5 6 7 8; do
    if [ -f "$d/.env" ] && grep -qE '^\s*KIE_AI_API_KEY\s*=' "$d/.env"; then
      grep -E '^\s*KIE_AI_API_KEY\s*=' "$d/.env" | head -1 | sed -E 's/^[^=]*=\s*//; s/^"//; s/"$//; s/^'\''//; s/'\''$//'
      return
    fi
    [ "$d" = "/" ] && break
    d="$(dirname "$d")"
  done
  echo "kie.sh: KIE_AI_API_KEY not set and no .env found" >&2; exit 1
}
KEY="$(load_key)"
AUTH="Authorization: Bearer $KEY"
JSON="Content-Type: application/json"

# ---- helpers ----------------------------------------------------------------
api_get()  { curl -sS -H "$AUTH" "$API$1"; }
api_post() { curl -sS -H "$AUTH" -H "$JSON" -X POST --data "$2" "$API$1"; }

upload_ref() { # <file> -> hosted url on stdout
  local f="$1" ext mime resp url tmp
  ext="${f##*.}"; ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in jpg|jpeg) mime="image/jpeg";; *) mime="image/$ext";; esac
  tmp="$(mktemp)"; printf 'data:%s;base64,' "$mime" > "$tmp"; base64 -i "$f" | tr -d '\n' >> "$tmp"
  jq -nc --rawfile d "$tmp" --arg fn "$(basename "$f")" \
     '{base64Data:$d, uploadPath:"scrollcraft", fileName:$fn}' > "$tmp.json"
  resp="$(curl -sS -H "$AUTH" -H "$JSON" -X POST --data @"$tmp.json" "$UPLOAD")"
  rm -f "$tmp" "$tmp.json"
  url="$(printf '%s' "$resp" | jq -r '.data.downloadUrl // .data.fileUrl // .data.url // empty')"
  [ -n "$url" ] || { echo "kie.sh: upload failed: $resp" >&2; exit 1; }
  printf '%s' "$url"
}

wait_task() { # <taskId> <label> -> result url on stdout
  local id="$1" label="$2" t0 resp state urls delay=4
  t0="$(date +%s)"
  while :; do
    resp="$(api_get "/api/v1/jobs/recordInfo?taskId=$id")"
    state="$(printf '%s' "$resp" | jq -r '.data.state // .data.status // "queued"')"
    case "$state" in
      success)
        urls="$(printf '%s' "$resp" | jq -r '
          (.data.resultJson // "{}")
          | (fromjson? // {})
          | (.resultUrls // .result_urls // .urls // [])[0] // empty')"
        [ -n "$urls" ] || { echo "kie.sh: $label success but no url: $resp" >&2; exit 1; }
        printf '%s' "$urls"; return ;;
      fail|failed)
        echo "kie.sh: $label failed: $(printf '%s' "$resp" | jq -c '.data')" >&2; exit 1 ;;
    esac
    printf '  %s: %s (%ss)\n' "$label" "$state" "$(( $(date +%s) - t0 ))" >&2
    sleep "$delay"; delay=$(( delay < 15 ? delay + 2 : 15 ))
  done
}

download() { curl -sS -L -o "$2" "$1"; echo "$2"; }

# ---- commands ----------------------------------------------------------------
cmd="${1:-}"; shift || true

case "$cmd" in
  probe)
    api_get "/api/v1/chat/credit" | jq '.'
    ;;

  still)
    prompt="${1:?usage: kie.sh still \"<prompt>\" <out.png> [--ar 16:9] [--ref ref.png]}"
    out="${2:?missing out path}"; shift 2
    ar="16:9"; quality="high"; refs=()
    while [ $# -gt 0 ]; do case "$1" in
      --ar) ar="$2"; shift 2;;
      --quality) quality="$2"; shift 2;;
      --ref) refs+=("$2"); shift 2;;
      *) shift;;
    esac; done
    model="$MODEL_STILL"
    input="$(jq -nc --arg p "$prompt" --arg ar "$ar" --arg q "$quality" \
      '{prompt:$p, aspect_ratio:$ar, quality:$q, output_format:"png", nsfw_checker:false}')"
    if [ "${#refs[@]}" -gt 0 ]; then
      model="$MODEL_STILL_EDIT"
      urls_json="[]"
      for r in "${refs[@]}"; do
        u="$(upload_ref "$r")"
        urls_json="$(jq -nc --argjson a "$urls_json" --arg u "$u" '$a + [$u]')"
      done
      input="$(printf '%s' "$input" | jq -c --argjson u "$urls_json" '. + {image_urls:$u}')"
    fi
    body="$(jq -nc --arg m "$model" --argjson in "$input" '{model:$m, input:$in}')"
    resp="$(api_post "/api/v1/jobs/createTask" "$body")"
    id="$(printf '%s' "$resp" | jq -r '.data.taskId // empty')"
    [ -n "$id" ] || { echo "kie.sh: createTask failed: $resp" >&2; exit 1; }
    url="$(wait_task "$id" "$(basename "$out")")"
    mkdir -p "$(dirname "$out")"
    download "$url" "$out"
    ;;

  shot)
    prompt="${1:?usage: kie.sh shot \"<prompt>\" <head.png> <out.mp4> [--tail t.png] [--dur 5]}"
    head="${2:?missing head image}"; out="${3:?missing out path}"; shift 3
    dur="5"; tail=""
    while [ $# -gt 0 ]; do case "$1" in
      --tail) tail="$2"; shift 2;;
      --dur) dur="$2"; shift 2;;
      *) shift;;
    esac; done
    head_url="$(upload_ref "$head")"
    input="$(jq -nc --arg p "$prompt" --arg u "$head_url" --arg d "$dur" \
      '{prompt:$p, image_url:$u, duration:$d,
        negative_prompt:"blur, distortion, low quality, warping, morphing, jitter, flicker, text, watermark, cut, scene change",
        cfg_scale:0.5}')"
    if [ -n "$tail" ]; then
      tail_url="$(upload_ref "$tail")"
      input="$(printf '%s' "$input" | jq -c --arg u "$tail_url" '. + {tail_image_url:$u}')"
    fi
    body="$(jq -nc --arg m "$MODEL_SHOT" --argjson in "$input" '{model:$m, input:$in}')"
    resp="$(api_post "/api/v1/jobs/createTask" "$body")"
    id="$(printf '%s' "$resp" | jq -r '.data.taskId // empty')"
    [ -n "$id" ] || { echo "kie.sh: createTask failed: $resp" >&2; exit 1; }
    url="$(wait_task "$id" "$(basename "$out")")"
    mkdir -p "$(dirname "$out")"
    download "$url" "$out"
    ;;

  *)
    echo "usage: kie.sh {probe|still|shot} ..." >&2; exit 1 ;;
esac
