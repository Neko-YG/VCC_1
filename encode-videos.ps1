<#
  VCC 2026 영상 최적화 인코더
  ------------------------------------------------------------
  video_src\ 폴더에 원본 영상을 넣고 이 스크립트를 실행하면
  웹용으로 최적화된 영상(hero_pc.mp4 등)을 자동 생성합니다.

  슬롯(파일 이름은 아래로 시작하면 됨, 확장자 무관):
    video_src\hero_pc.*  →  hero_pc.mp4    (히어로 PC · 스크러빙 · 1920px)
    video_src\hero_mo.*  →  hero_mo.mp4    (히어로 모바일 · 스크러빙 · 720px)
    video_src\after.*    →  after_web.mp4  (배경 루프 · 1280px)
    video_src\venue.*    →  venue_web.mp4  (배경 루프 · 1280px)
    video_src\cta.*      →  cta_web.mp4    (배경 루프 · 1280px)

  넣어둔 슬롯만 처리합니다. 하나만 바꾸고 싶으면 그 파일만 교체 후 실행하세요.
#>
param(
  [string]$OutDir  # 출력 폴더 (기본: 이 스크립트가 있는 폴더 = 리포 루트)
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $OutDir) { $OutDir = $root }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }

# ── ffmpeg / ffprobe 찾기 ───────────────────────────────
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
  Write-Host "[X] ffmpeg를 찾을 수 없습니다." -ForegroundColor Red
  Write-Host "    설치:  winget install Gyan.FFmpeg" -ForegroundColor Yellow
  exit 1
}

$srcDir = Join-Path $root 'video_src'
if (-not (Test-Path $srcDir)) { New-Item -ItemType Directory -Force $srcDir | Out-Null }

# ── 인코딩 작업 정의 ────────────────────────────────────
#   type=hero : 스크러빙 대상 → GOP 10프레임 고정(seek 시 최대 10프레임만 디코딩)
#   type=loop : 배경 재생 → 기본 GOP
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
Write-Host "  원본   : $srcDir"
Write-Host "  출력   : $OutDir"
Write-Host ""

$done = @(); $skipped = @()
foreach ($j in $jobs) {
  $s = Get-Src $j.base
  if (-not $s) { $skipped += $j.name; continue }
  Write-Host ("▶ {0,-8}  {1}  →  {2}" -f $j.name, $s.Name, $j.out) -ForegroundColor Cyan
  $args = @('-y','-loglevel','error','-i',$s.FullName,
            '-vf',"scale=$($j.scale):-2,fps=30",
            '-c:v','libx264','-profile:v','main','-crf',"$($j.crf)",
            '-pix_fmt','yuv420p','-an','-movflags','+faststart')
  if ($j.type -eq 'hero') { $args += @('-g','10','-keyint_min','10','-sc_threshold','0') }
  $out = Join-Path $OutDir $j.out
  & $ffmpeg @args $out
  if ($LASTEXITCODE -ne 0) { Write-Host "  [X] 인코딩 실패: $($j.name)" -ForegroundColor Red; continue }
  $done += $j
}

if ($done.Count -eq 0) {
  Write-Host ""
  Write-Host "[!] video_src\ 에 처리할 영상이 없습니다." -ForegroundColor Yellow
  Write-Host "    아래 이름으로 원본을 넣어주세요: hero_pc / hero_mo / after / venue / cta" -ForegroundColor Yellow
  exit 0
}

# ── 결과 검증 ───────────────────────────────────────────
Write-Host ""
Write-Host "=== 결과 ===" -ForegroundColor Green
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
    if ($kf -lt 40) { $warn += "  [!] 키프레임 ${kf}개(<40) 스크러빙 저하 우려" }
    if ([math]::Abs($dur - 13.6) -gt 0.5) { $warn += "  [!] 길이 ${dur}s → index.html 텍스트 타이밍(7/9.3/11.6s) 조정 필요" }
  }
  Write-Host ("  {0,-14} {1,6} MB | {2,3} kf | {3,6}s{4}" -f $j.out, $mb, $kf, $dur, $warn) -ForegroundColor ($(if($warn){'Yellow'}else{'White'}))
}
Write-Host ("  ─────────────────────────────") -ForegroundColor DarkGray
Write-Host ("  합계 {0} MB" -f [math]::Round($total/1MB, 1)) -ForegroundColor Green
if ($skipped.Count -gt 0) { Write-Host ("  (건너뜀: {0} — video_src에 원본 없음)" -f ($skipped -join ', ')) -ForegroundColor DarkGray }

# ── 다음 단계 안내 ──────────────────────────────────────
if ($OutDir -eq $root) {
  Write-Host ""
  Write-Host "다음: 라이브 반영하려면 리포 루트에서" -ForegroundColor Cyan
  Write-Host "  git add *.mp4; git commit -m `"perf(video): 영상 교체`"; git push neko main" -ForegroundColor White
  Write-Host "  (배포 1~2분 후 https://neko-yg.github.io/VCC_1/ 하드리프레시 Ctrl+Shift+R)" -ForegroundColor DarkGray
}
