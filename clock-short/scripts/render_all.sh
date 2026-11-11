#!/bin/bash
# draft render in 4 resumable chunks (software GL: ~3.4 s/frame)
cd /home/user/work/clock-short
export REMOTION_TMP=/home/user/work/rtmp PROPS='{"post":{"dpr":0.5},"msaa":0}'
for r in "0 479" "480 959" "960 1439" "1440 1919"; do
  set -- $r
  f=out/part_$1.mp4
  [ -s $f ] && continue
  node scripts/render.mjs $f $1 $2 1 4 > out/log_$1.txt 2>&1
done
echo ALLDONE > out/render_done.txt
