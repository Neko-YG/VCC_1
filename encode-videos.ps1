<#
  VCC 2026 Video Encoder  (Korean guide: video_src\README.txt)
  ------------------------------------------------------------
  Put source videos into video_src\ using the slot names below,
  then run this script (or double-click 영상교체.bat) to produce
  web-optimized videos (hero_pc.mp4, etc.) in the repo root.

  Slots (filename must START with the name; any extension):
    video_src\hero_pc.*  ->  hero_pc.mp4    (hero PC   / scrubbing / 1920px)
    video_src\hero_mo.*  ->  hero_mo.mp4    (hero mobile/ scrubbing / 720px)
    video_src\after.*    ->  after_web.mp4  (bg loop / 1280px)
    video_src\venue.*    ->  venue_web.mp4  (bg loop / 1280px)
    video_src\cta.*      ->  cta_web.mp4    (bg loop / 1280px)

  Only slots that exist are processed. To change one video,
  replace only that source file and run again.
#>
param(
  [string]$OutDir  # output folder (default: this script's folder = repo root)
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $OutDir) { $OutDir = $root }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }

# -- locate ffmpeg / ffprobe --
function Find-Exe($name) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $g = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "$name.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($g) { return $g.FullName }
  return $null
}
$ffmpeg  = Find-Exe 'ffmpeg'
$ffprobe = Find-Exe 'ffprobe'
if (-not $ffmpeg -or -not $ffprobe) {
  Write-Host "[X] ffmpeg not found." -ForegroundColor Red
  Write-Host "    Install:  winget install Gyan.FFmpeg" -ForegroundColor Yellow
  exit 1
}

$srcDir = Join-Path $root 'video_src'
if (-not (Test-Path $srcDir)) { New-Item -ItemType Directory -Force $srcDir | Out-Null }

# -- encode jobs --
#   type=hero : scrubbing target -> fixed GOP of 10 frames (seek decodes <=10 frames)
#   type=loop : background playback -> default GOP
$jobs = @(
  @{ name='hero_pc'; base='hero_pc'; out='hero_pc.mp4';   scale=1920; crf=26; type='hero' },
  @{ name='hero_mo'; base='hero_mo'; out='hero_mo.mp4';   scale=720;  crf=27; type='hero' },
  @{ name='after';   base='after';   out='after_web.mp4'; scale=1280; crf=27; type='loop' },
  @{ name='venue';   base='venue';   out='venue_web.mp4'; scale=1280; crf=27; type='loop' },
  @{ name='cta';     base='cta';     out='cta_web.mp4';   scale=1280; crf=31; type='loop' }
)

function Get-Src($base) {
  $vids = Get-ChildItem $srcDir -File -ErrorAction SilentlyContinue |
          Where-Object { $_.Extension -imatch '\.(mp4|mov|m4v|webm|avi|mkv)$' }
  $exact = $vids | Where-Object { $_.BaseName -ieq $base } | Select-Object -First 1
  if ($exact) { return $exact }
  return $vids | Where-Object { $_.BaseName -ilike "$base*" } | Select-Object -First 1
}

Write-Host ""
Write-Host "  ffmpeg : $ffmpeg"
Write-Host "  source : $srcDir"
Write-Host "  output : $OutDir"
Write-Host ""

$done = @(); $skipped = @()
foreach ($j in $jobs) {
  $s = Get-Src $j.base
  if (-not $s) { $skipped += $j.name; continue }
  Write-Host (">> {0,-8}  {1}  ->  {2}" -f $j.name, $s.Name, $j.out) -ForegroundColor Cyan
  $ffargs = @('-y','-loglevel','error','-i',$s.FullName,
              '-vf',"scale=$($j.scale):-2,fps=30",
              '-c:v','libx264','-profile:v','main','-crf',"$($j.crf)",
              '-pix_fmt','yuv420p','-an','-movflags','+faststart')
  if ($j.type -eq 'hero') { $ffargs += @('-g','10','-keyint_min','10','-sc_threshold','0') }
  $out = Join-Path $OutDir $j.out
  & $ffmpeg @ffargs $out
  if ($LASTEXITCODE -ne 0) { Write-Host "  [X] encode failed: $($j.name)" -ForegroundColor Red; continue }
  $done += $j
}

if ($done.Count -eq 0) {
  Write-Host ""
  Write-Host "[!] No source videos found in video_src\ ." -ForegroundColor Yellow
  Write-Host "    Add originals named: hero_pc / hero_mo / after / venue / cta" -ForegroundColor Yellow
  exit 0
}

# -- verify results --
Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
$total = 0
foreach ($j in $done) {
  $p = Join-Path $OutDir $j.out
  if (-not (Test-Path $p)) { continue }
  $len = (Get-Item $p).Length; $total += $len
  $mb  = [math]::Round($len/1MB, 2)
  $dur = [math]::Round([double](& $ffprobe -v error -show_entries format=duration -of csv=p=0 $p), 2)
  $kf  = (& $ffprobe -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 $p | Measure-Object -Line).Lines
  $warn = ''
  if ($j.type -eq 'hero') {
    if ($kf -lt 40) { $warn += "  [!] keyframes ${kf} (<40): scrubbing may stutter" }
    if ([math]::Abs($dur - 13.6) -gt 0.5) { $warn += "  [!] duration ${dur}s -> adjust index.html text timings (7 / 9.3 / 11.6s)" }
  }
  Write-Host ("  {0,-14} {1,6} MB | {2,3} kf | {3,6}s{4}" -f $j.out, $mb, $kf, $dur, $warn) -ForegroundColor ($(if($warn){'Yellow'}else{'White'}))
}
Write-Host ("  ------------------------------") -ForegroundColor DarkGray
Write-Host ("  total {0} MB" -f [math]::Round($total/1MB, 1)) -ForegroundColor Green
if ($skipped.Count -gt 0) { Write-Host ("  (skipped: {0} - no source in video_src)" -f ($skipped -join ', ')) -ForegroundColor DarkGray }

# -- next steps --
if ($OutDir -eq $root) {
  Write-Host ""
  Write-Host "NEXT 1) Preview locally: double-click  미리보기.bat" -ForegroundColor Cyan
  Write-Host "        -> check new videos in the browser (Ctrl+Shift+R to hard refresh)" -ForegroundColor DarkGray
  Write-Host "NEXT 2) Deploy after checking:" -ForegroundColor Cyan
  Write-Host "        git add *.mp4; git commit -m `"perf(video): swap videos`"; git push neko main" -ForegroundColor White
  Write-Host "        (live in 1-2 min at https://neko-yg.github.io/VCC_1/ , Ctrl+Shift+R)" -ForegroundColor DarkGray
}
