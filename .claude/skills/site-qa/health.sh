#!/bin/bash
# Live health check for sijo.work: everything outside the code that can stop a recruiter from opening the site.
#   bash .claude/skills/site-qa/health.sh          (exit 1 if anything is wrong)
D=sijo.work; FAIL=0
ok() { echo "✅ $*"; }; bad() { echo "❌ $*"; FAIL=1; }
A_WANT="185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153"
AAAA_WANT="2606:50c0:8000::153 2606:50c0:8001::153 2606:50c0:8002::153 2606:50c0:8003::153"
for r in ns63.domaincontrol.com 8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222; do
  a=$(dig +short +time=4 +tries=2 A $D @$r | sort | tr '\n' ' '); q=$(dig +short +time=4 +tries=2 AAAA $D @$r | sort | tr '\n' ' ')
  [ "$(echo $a)" = "$A_WANT" ] && [ "$(echo $q)" = "$AAAA_WANT" ] && ok "DNS via $r: 4 IPv4 + 4 IPv6" || bad "DNS via $r: A=[$a] AAAA=[$q]"
done
w=$(dig +short +time=4 CNAME www.$D @8.8.8.8); [ "$w" = "sijojoseph7509-a11y.github.io." ] && ok "www → GitHub Pages" || bad "www CNAME is '$w'"
for v in 4 6; do
  ip=$([ $v = 4 ] && echo 185.199.108.153 || echo "[2606:50c0:8000::153]")
  c=$(curl -s -$v -o /dev/null -w "%{http_code}" --max-time 20 --resolve "$D:443:$ip" https://$D/); [ "$c" = 200 ] && ok "HTTPS over IPv$v: 200 (valid certificate)" || bad "HTTPS over IPv$v: $c"
  r=$(curl -s -$v -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 20 --resolve "$D:80:$ip" http://$D/); [ "$r" = "301 https://$D/" ] && ok "http → https over IPv$v" || bad "http over IPv$v: $r"
done
r=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 20 https://www.$D/); [[ "$r" == 301\ https://$D/* ]] && ok "www.$D → $D" || bad "www: $r"
end=$(echo | openssl s_client -connect 185.199.108.153:443 -servername $D 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$end" ]; then days=$(( ($(date -j -f "%b %d %T %Y %Z" "$end" +%s) - $(date +%s)) / 86400 )); [ $days -gt 14 ] && ok "certificate valid for $days more days (GitHub renews it automatically)" || bad "certificate expires in $days days"; else bad "could not read the certificate"; fi
exp=$(whois $D 2>/dev/null | grep -m1 -i "Registry Expiry Date" | awk '{print $4}' | cut -dT -f1)
if [ -n "$exp" ]; then dd=$(( ($(date -j -f "%Y-%m-%d" "$exp" +%s) - $(date +%s)) / 86400 )); [ $dd -gt 45 ] && ok "domain registered for $dd more days (until $exp)" || bad "domain expires in $dd days ($exp): renew at GoDaddy"; else bad "could not read domain expiry"; fi
b=$(curl -s --max-time 15 "https://$D/version.json?t=$RANDOM" | grep -o '[0-9]\+'); [ -n "$b" ] && ok "live build v$b" || bad "version.json not reachable"
for f in main.js cat.js os.js content.js models/cat/shea.glb assets/profile.jpg assets/wallpaper.jpg work/tidewell/01.webp; do
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 "https://$D/$f?v=$b"); [ "$c" = 200 ] || bad "$f: $c"
done; [ $FAIL = 0 ] && ok "key files load (code, model, photos, case study)"
exit $FAIL
