#!/bin/bash
# 単一HTMLファイルへ結合するビルドスクリプト
set -e
cd "$(dirname "$0")"

OUT="public/index.html"

{
  cat parts/01-css-base.html
  cat parts/02-css-ui.html
  cat parts/03-body.html
  echo '<script>'
  cat parts/04-data-strategy.js
  echo ''
  cat parts/05-data-management.js
  echo ''
  cat parts/06-data-technology.js
  echo ''
  cat parts/07-data-terms.js
  echo ''
  cat parts/08-core.js
  echo ''
  cat parts/09-views-core.js
  echo ''
  cat parts/10-views-analysis.js
  echo ''
  cat parts/11-views-roadmap.js
  echo ''
  cat parts/12-views-manage.js
  echo ''
  cat parts/13-boot.js
  printf '\n</script>\n</body>\n</html>\n'
} > "$OUT"

echo "built: $OUT"
wc -c "$OUT"
