



/* =========================================================================================================
   [초기 로딩 최적화] 뷰포트 밖 배경영상 지연 로드
   ---------------------------------------------------------------------------------------------------------
   기존: 모든 배경영상이 autoplay 라 브라우저가 재생 준비를 위해 파일 전체를 즉시 받음
         -> 첫 진입에 화면에 보이지도 않는 영상 약 18MB 가 함께 다운로드됨.
   변경: 히어로(sec01_video)를 제외한 영상은 화면에 들어오기 전까지 play() 를 보류하고
         preload='none' 로 묶어둔다. 뷰포트에 접근하면 그때 받아서 재생.
   ※ 기존 반응형 전환 코드(sec03/04/11 등)는 그대로 두고, play() 시점만 가로챈다.
   ========================================================================================================= */
(function () {
    var HERO = 'sec01_video';
    var realPlay = HTMLMediaElement.prototype.play;
    var visible = new WeakSet();

    HTMLMediaElement.prototype.play = function () {
        if (this.tagName === 'VIDEO' && this.id !== HERO && !visible.has(this)) {
            this.preload = 'none';
            return Promise.resolve();           // 화면 밖 -> 재생/다운로드 보류
        }
        return realPlay.apply(this, arguments);
    };

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            var v = e.target;
            if (e.isIntersecting) {
                visible.add(v);
                // data-src 로 묶어둔 영상(sec06)은 이 시점에 비로소 src 부여
                if (!v.getAttribute('src') && v.dataset.src) {
                    v.preload = 'auto';
                    v.src = v.dataset.src;
                } else if (v.preload !== 'auto') {
                    v.preload = 'auto';
                    v.load();
                }
                realPlay.call(v).catch(function () {});
            } else {
                visible.delete(v);
                if (!v.paused) v.pause();
            }
        });
    }, { rootMargin: '300px 0px' });

    function reveal(v) {
        if (!v.getAttribute('src') && v.dataset.src) {
            v.preload = 'auto';
            v.src = v.dataset.src;
        } else if (v.preload !== 'auto') {
            v.preload = 'auto';
            v.load();
        }
        visible.add(v);
        realPlay.call(v).catch(function () {});
    }

    /* IntersectionObserver 가 어떤 이유로 콜백을 주지 않아도 영상이 영영 안 뜨는 일이 없도록
       스크롤 기반 보조 검사(rAF 스로틀)를 함께 둔다. */
    var gated = [];
    var lastSweep = 0;
    var timer = null;
    function sweep() {
        timer = null;
        lastSweep = Date.now();
        var h = window.innerHeight;
        for (var i = gated.length - 1; i >= 0; i--) {
            var v = gated[i];
            var r = v.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;   // display:none (PC/MO 중복 세트) 는 건너뜀
            if (r.top < h + 300 && r.bottom > -300) {
                reveal(v);
                gated.splice(i, 1);          // 한 번 열리면 목록에서 제외
            }
        }
    }
    // rAF 대신 시간 기반 스로틀 (백그라운드 탭에서 rAF 가 멈춰도 동작)
    function onScrollSweep() {
        if (!gated.length) return;
        var wait = 120 - (Date.now() - lastSweep);
        if (wait <= 0) { sweep(); }
        else if (timer === null) { timer = setTimeout(sweep, wait); }
    }
    window.addEventListener('scroll', onScrollSweep, { passive: true });
    window.addEventListener('resize', onScrollSweep);

    function scan() {
        document.querySelectorAll('video').forEach(function (v) {
            if (v.id === HERO || v.__lazyGated) return;
            v.__lazyGated = true;
            v.removeAttribute('autoplay');
            v.preload = 'none';
            gated.push(v);
            io.observe(v);
        });
        onScrollSweep();   // 첫 화면에 이미 보이는 영상은 즉시 처리
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
    else scan();
    window.addEventListener('load', scan);
})();

// =========================================================================================================
// sec01 관련

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    /* =========================================================================
       SECTION 1: 비디오 스크러빙 & 텍스트 (Vanilla JS + rAF + Seek Lock 방지)
    ========================================================================= */
    /* ★ 스크롤 감도 조절 — frameHeight 숫자만 바꾸면 됩니다.
       값이 작을수록 조금만 굴려도 영상이 빨리 진행됩니다.
       (기존 600vh/300vh 는 한 화면당 영상이 2.5초밖에 안 흘러 답답했음) */
    const BREAKPOINTS = [
        { minWidth: 1024, videoSrc: "static33/sec01_vid1.mp4", frameHeight: "450vh" },
        { minWidth: 0,    videoSrc: "static33/sec01_vid2.mp4", frameHeight: "280vh" }
    ];

    const sec01Frame = document.querySelector(".sec01_frame");
    const sec01Video = document.getElementById("sec01_video");
    const sec01Texts = document.getElementById("sec01_texts");
    
    let activeBpIndex = -1;
    let lastVideoTime = -1;
    let isRafTicking = false;

    function getActiveConfig() {
        const ww = window.innerWidth;
        const sorted = [...BREAKPOINTS].sort((a, b) => b.minWidth - a.minWidth);
        const idx = sorted.findIndex(b => ww >= b.minWidth);
        return { config: idx !== -1 ? sorted[idx] : sorted[0], index: idx !== -1 ? idx : 0 };
    }

    function initSec01Media() {
        const { config, index } = getActiveConfig();
        if (activeBpIndex === index) return;
        activeBpIndex = index;

        sec01Frame.style.height = config.frameHeight;
        if (sec01Video.getAttribute("src") !== config.videoSrc) {
            sec01Video.src = config.videoSrc;
            sec01Video.load();
        }
    }

    /* 스크롤 → 목표 시점 기록.
       seek 은 rAF 로 '찔러보는' 대신 seeked 이벤트에 물려서 연쇄 발행한다.
       (rAF 폴링 방식은 seek 완료 타이밍과 어긋나 갱신이 몰렸다 비었다 하며 끊겨 보임) */
    let seekTarget = 0;      // 스크롤이 가리키는 목표 시간
    let seekBusy   = false;  // seek 진행 중 여부
    const canFast  = typeof sec01Video.fastSeek === 'function';  // all-intra 라 정밀도 손실 없음

    function pumpSeek() {
        if (seekBusy || !sec01Video.duration) return;
        const t = seekTarget;
        if (Math.abs(t - sec01Video.currentTime) < 0.008) return;   // 이미 도달
        seekBusy = true;
        if (canFast) { sec01Video.fastSeek(t); } else { sec01Video.currentTime = t; }
        lastVideoTime = t;
    }

    // seek 이 끝나는 즉시 최신 목표로 다음 seek 발행 → 브라우저가 낼 수 있는 최대 속도로 연속 갱신
    sec01Video.addEventListener('seeked', function () {
        seekBusy = false;
        pumpSeek();
    });
    sec01Video.addEventListener('error', function () { seekBusy = false; });

    function onScrollSec01() {
        const rect = sec01Frame.getBoundingClientRect();
        const frameH = sec01Frame.offsetHeight - window.innerHeight;
        if (frameH <= 0) return;

        const progress = Math.min(Math.max(-rect.top / frameH, 0), 1);
        seekTarget = (sec01Video.duration || 0) * progress;

        // 텍스트 투명도 — seek 상태와 무관하게 항상 갱신
        let textOpacity = 1;
        if (progress > 0.15) textOpacity = 1 - ((progress - 0.15) / 0.25);
        textOpacity = Math.max(0, Math.min(1, textOpacity));
        sec01Texts.style.opacity = textOpacity;
        sec01Texts.style.transform = `translateY(${ (1 - textOpacity) * -30 }px)`;

        pumpSeek();
    }

    initSec01Media();
    window.addEventListener("scroll", onScrollSec01, { passive: true });


    /* =========================================================================
       SECTION 2: 카드 세 장 연출 & 텍스트 오버랩 (GSAP Responsive Timeline)
    ========================================================================= */
    const sec02Frame = document.querySelector(".sec02_frame");
    const sec02Sticky = document.getElementById("sec02_sticky");
    const cardsContainer = document.querySelector(".sec02_cards");
    const cards = document.querySelectorAll(".sec02_card");
    const contents = document.querySelector(".sec02_contents");

    // 섹션 2 스크롤 높이 고정
    sec02Frame.style.height = "650vh";

    let mm = gsap.matchMedia();

    // -------------------------------------------------------------------------
    // [DESKTOP] 1024px 이상
    // -------------------------------------------------------------------------
    mm.add("(min-width: 1024px)", () => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".sec02_frame",
                start: "top top",
                end: "bottom bottom",
                scrub: 1
            }
        });

        // 0. 섹션 페이드인 (스크롤 진입 시)
        tl.to(sec02Sticky, { opacity: 1, duration: 1 });

        // 1. 카드 페이드인
        cards.forEach((card, idx) => {
            tl.to(card, { opacity: 1, duration: 1, ease: "power1.out" }, `-=${idx === 0 ? 0 : 0.5}`);
        });

        // 잠시 유지
        tl.to({}, { duration: 1.5 });

        // 2. 카드 사라지며 텍스트 전환
        tl.to(cardsContainer, { opacity: 0, filter: "blur(10px)", duration: 2, ease: "power2.inOut" })
          .to(contents, {
              opacity: 1,
              y: 0,
              duration: 2,
              ease: "power2.out",
              onStart: () => contents.classList.add("active"),
              onReverseComplete: () => contents.classList.remove("active")
          }, "<");

        // 3. 텍스트 유지
        tl.to({}, { duration: 3 });
    });

    // -------------------------------------------------------------------------
    // [MOBILE] 1023px 이하 (오른쪽 날아옴 -> 중앙 확대 머묾 -> 왼쪽 스태킹)
    // -------------------------------------------------------------------------
    mm.add("(max-width: 1023px)", () => {
        // 카드의 초기 상태: 화면 정중앙 기준 오른쪽 멀리(100vw), 약간 작은 크기(0.7)
        gsap.set(cards, { 
            xPercent: -50, 
            yPercent: -50, 
            x: "100vw", 
            y: 0, 
            scale: 0.7, 
            opacity: 0 
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".sec02_frame",
                start: "top top",
                end: "bottom bottom",
                scrub: 1
            }
        });

        // 0. 섹션 페이드인
        tl.to(sec02Sticky, { opacity: 1, duration: 0.5 });

        // 좌측으로 쌓일 때 간격 (픽셀)
        const stackOffset = 45; 

        // ==========================================
        // 1번 카드
        // ==========================================
        // [입장] 오른쪽 -> 화면 정중앙 (확대 scale: 1)
        tl.to(cards[0], { x: 0, scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" })
          // [머물기] 이용자가 정중앙에서 제대로 보도록 멈춤
          .to(cards[0], { scale: 1, duration: 1 }) 
          // [퇴장/스태킹] 살짝 작아지며(0.85) 좌측으로 이동 (-90px)
          .to(cards[0], { x: -stackOffset * 2, scale: 0.85, duration: 1.2, ease: "power1.inOut" });

        // ==========================================
        // 2번 카드
        // ==========================================
        // [입장] 오른쪽 -> 화면 정중앙 (확대 scale: 1)
        tl.to(cards[1], { x: 0, scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" }, "-=0.2")
          // [머물기]
          .to(cards[1], { scale: 1, duration: 1 })
          // [퇴장/스태킹] 살짝 작아지며(0.9) 좌측으로 이동 (-45px)
          .to(cards[1], { x: -stackOffset, scale: 0.9, duration: 1.2, ease: "power1.inOut" });

        // ==========================================
        // 3번 카드
        // ==========================================
        // [입장] 오른쪽 -> 화면 정중앙 (확대 scale: 1)
        tl.to(cards[2], { x: 0, scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" }, "-=0.2")
          // [머물기] 3번 카드는 정중앙에 커진 상태로 머무름
          .to(cards[2], { scale: 1, duration: 2 });

        // ==========================================
        // Cards -> 텍스트(Contents) 전환
        // ==========================================
        tl.to(cardsContainer, { opacity: 0, filter: "blur(8px)", duration: 2, ease: "power2.inOut" })
          .to(contents, {
              opacity: 1,
              y: 0,
              duration: 2,
              ease: "power2.out",
              onStart: () => contents.classList.add("active"),
              onReverseComplete: () => contents.classList.remove("active")
          }, "<");

        // 텍스트 감상 후 종료 대기
        tl.to({}, { duration: 2.5 });
    });

    /* =========================================================================
       RESIZE RESYNC
    ========================================================================= */
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            initSec01Media();
            ScrollTrigger.refresh();
        }, 200);
    });
});














// =========================================================================================================
// sec03 관련

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('sec03_video');
    if (!video) return;

    // ==========================================
    // [설정예시] 화면 폭 기준점 (넓은 순서대로 작성)
    // 1400px 이상 -> 1번 영상
    // 1024px 이상 -> 2번 영상
    // 768px 이상  -> 3번 영상
    // 768px 미만  -> 4번 영상
    // ==========================================
    const BREAKPOINTS = [768];

    let currentVideoIndex = null;

    // # 화면 폭에 맞는 영상 번호(1, 2, 3, 4...) 판별 함수
    function getTargetIndex() {
        const width = window.innerWidth;
        for (let i = 0; i < BREAKPOINTS.length; i++) {
            if (width >= BREAKPOINTS[i]) {
                return i + 1;
            }
        }
        return BREAKPOINTS.length + 1;
    }

    // # 적합한 영상, 포스터 세팅 함수
    function loadAppropriateVideo() {
        const targetIndex = getTargetIndex();
        if (currentVideoIndex === targetIndex) return;      // 이미 적합하면 패스
        currentVideoIndex = targetIndex;

        // data 속성에서 읽어오기 (예: data-poster-1, data-mp4-1)
        const poster = video.getAttribute(`data-poster-${targetIndex}`);
        const webmSrc = video.getAttribute(`data-webm-${targetIndex}`);
        const mp4Src = video.getAttribute(`data-mp4-${targetIndex}`);

        if (poster) video.poster = poster;      // 포스터 세팅

        // 기존 자식 source 비우기
        video.innerHTML = '';

        // 영상 세팅. source 방식으로, webm 로딩 가능하면 그거 쓰고, 아니면 mp4
        if (webmSrc) {
            const sourceWebm = document.createElement('source');
            sourceWebm.src = webmSrc;
            sourceWebm.type = 'video/webm';
            video.appendChild(sourceWebm);
        }
        if (mp4Src) {
            const sourceMp4 = document.createElement('source');
            sourceMp4.src = mp4Src;
            sourceMp4.type = 'video/mp4';
            video.appendChild(sourceMp4);
        }

        // 영상 새로고침 및 재생
        video.load();
        video.play().catch(error => {
            console.log("자동 재생 대기 중:", error);
        });
    }

    // 최초 실행 (조건에 맞는 단 1개의 영상만 즉시 다운로드)
    loadAppropriateVideo();

    // 화면 크기 변경 감지 (디바운스 적용)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            loadAppropriateVideo();
        }, 200);
    });
});







// =========================================================================================================
// sec04 관련

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('sec04_video');
    if (!video) return;

    // ==========================================
    // [설정예시] 화면 폭 기준점 (넓은 순서대로 작성)
    // 1400px 이상 -> 1번 영상
    // 1024px 이상 -> 2번 영상
    // 768px 이상  -> 3번 영상
    // 768px 미만  -> 4번 영상
    // ==========================================
    const BREAKPOINTS = [768];

    let currentVideoIndex = null;

    // # 화면 폭에 맞는 영상 번호(1, 2, 3, 4...) 판별 함수
    function getTargetIndex() {
        const width = window.innerWidth;
        for (let i = 0; i < BREAKPOINTS.length; i++) {
            if (width >= BREAKPOINTS[i]) {
                return i + 1;
            }
        }
        return BREAKPOINTS.length + 1;
    }

    // # 적합한 영상, 포스터 세팅 함수
    function loadAppropriateVideo() {
        const targetIndex = getTargetIndex();
        if (currentVideoIndex === targetIndex) return;      // 이미 적합하면 패스
        currentVideoIndex = targetIndex;

        // data 속성에서 읽어오기 (예: data-poster-1, data-mp4-1)
        const poster = video.getAttribute(`data-poster-${targetIndex}`);
        const webmSrc = video.getAttribute(`data-webm-${targetIndex}`);
        const mp4Src = video.getAttribute(`data-mp4-${targetIndex}`);

        if (poster) video.poster = poster;      // 포스터 세팅

        // 기존 자식 source 비우기
        video.innerHTML = '';

        // 영상 세팅. source 방식으로, webm 로딩 가능하면 그거 쓰고, 아니면 mp4
        if (webmSrc) {
            const sourceWebm = document.createElement('source');
            sourceWebm.src = webmSrc;
            sourceWebm.type = 'video/webm';
            video.appendChild(sourceWebm);
        }
        if (mp4Src) {
            const sourceMp4 = document.createElement('source');
            sourceMp4.src = mp4Src;
            sourceMp4.type = 'video/mp4';
            video.appendChild(sourceMp4);
        }

        // 영상 새로고침 및 재생
        video.load();
        video.play().catch(error => {
            console.log("자동 재생 대기 중:", error);
        });
    }

    // 최초 실행 (조건에 맞는 단 1개의 영상만 즉시 다운로드)
    loadAppropriateVideo();

    // 화면 크기 변경 감지 (디바운스 적용)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            loadAppropriateVideo();
        }, 200);
    });
});










// =========================================================================================================
// sec11 관련

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('sec11_video');
    if (!video) return;

    // ==========================================
    // [설정] 화면 폭 기준점 (넓은 순서대로 작성)
    // 1400px 이상 -> 1번 영상
    // 1024px 이상 -> 2번 영상
    // 768px 이상  -> 3번 영상
    // 768px 미만  -> 4번 영상
    // ==========================================
    const BREAKPOINTS = [768];

    let currentVideoIndex = null;

    // # 화면 폭에 맞는 영상 번호(1, 2, 3, 4...) 판별 함수
    function getTargetIndex() {
        const width = window.innerWidth;
        for (let i = 0; i < BREAKPOINTS.length; i++) {
            if (width >= BREAKPOINTS[i]) {
                return i + 1;
            }
        }
        return BREAKPOINTS.length + 1;
    }

    // # 적합한 영상, 포스터 세팅 함수
    function loadAppropriateVideo() {
        const targetIndex = getTargetIndex();
        if (currentVideoIndex === targetIndex) return;      // 이미 적합하면 패스
        currentVideoIndex = targetIndex;

        // data 속성에서 읽어오기 (예: data-poster-1, data-mp4-1)
        const poster = video.getAttribute(`data-poster-${targetIndex}`);
        const webmSrc = video.getAttribute(`data-webm-${targetIndex}`);
        const mp4Src = video.getAttribute(`data-mp4-${targetIndex}`);

        if (poster) video.poster = poster;      // 포스터 세팅

        // 기존 자식 source 비우기
        video.innerHTML = '';

        // 영상 세팅. source 방식으로, webm 로딩 가능하면 그거 쓰고, 아니면 mp4
        if (webmSrc) {
            const sourceWebm = document.createElement('source');
            sourceWebm.src = webmSrc;
            sourceWebm.type = 'video/webm';
            video.appendChild(sourceWebm);
        }
        if (mp4Src) {
            const sourceMp4 = document.createElement('source');
            sourceMp4.src = mp4Src;
            sourceMp4.type = 'video/mp4';
            video.appendChild(sourceMp4);
        }

        // 영상 새로고침 및 재생
        video.load();
        video.play().catch(error => {
            console.log("자동 재생 대기 중:", error);
        });
    }

    // 최초 실행 (조건에 맞는 단 1개의 영상만 즉시 다운로드)
    loadAppropriateVideo();

    // 화면 크기 변경 감지 (디바운스 적용)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            loadAppropriateVideo();
        }, 200);
    });
});















// =========================================================================================================
// sec12 관련

const switch1 = document.getElementById('sec12_switch1');
const switch2 = document.getElementById('sec12_switch2');
const img1 = document.getElementById('sec12_img1');
const img2 = document.getElementById('sec12_img2');

switch1.addEventListener('click', function() {
    switch1.classList.add('sec12_selected');
    switch2.classList.remove('sec12_selected');

    img1.classList.remove('hidden');
    img2.classList.add('hidden');
});

switch2.addEventListener('click', function() {
    switch1.classList.remove('sec12_selected');
    switch2.classList.add('sec12_selected');

    img2.classList.remove('hidden');
    img1.classList.add('hidden');
});






// =========================================================================================================
// sec13 관련

const faqItems = document.querySelectorAll('.sec13_item');
faqItems.forEach(item => {
    const qqq = item.querySelector('.sec13_qqq');
    qqq.addEventListener('click', () => {
        item.classList.toggle('is-open');
    });
});




// =========================================================================================================
// sec14 관련

const targetDate1 = new Date('2026-08-29T13:00:00');     // 목표설정
const timeEl1 = document.getElementById('sec14_time_1');
const dayEl1 = document.getElementById('sec14_day_1');

function updateTimer1() {
    const now = new Date();
    const diff = targetDate1 - now;
    
    if (diff <= 0) {
        if (timeEl1) timeEl1.textContent = "00 : 00 : 00 : 00";
        if (dayEl1) dayEl1.textContent = "참가신청 D-DAY";
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const formatNum = (num) => String(num).padStart(2, '0');
    
    if (timeEl1) {
        timeEl1.textContent = `${formatNum(days)} : ${formatNum(hours)} : ${formatNum(minutes)} : ${formatNum(seconds)}`;
    }
    if (dayEl1) {
        dayEl1.textContent = `참가신청 D-${days}`;
    }
}
updateTimer1();
setInterval(updateTimer1, 1000);



const targetDate2 = new Date('2026-09-22T13:00:00');     // 목표설정
const timeEl2 = document.getElementById('sec14_time_2');
const dayEl2 = document.getElementById('sec14_day_2');

function updateTimer2() {
    const now = new Date();
    const diff = targetDate2 - now;
    
    if (diff <= 0) {
        if (timeEl2) timeEl2.textContent = "00 : 00 : 00 : 00";
        if (dayEl2) dayEl2.textContent = "D-DAY";
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const formatNum = (num) => String(num).padStart(2, '0');
    
    if (timeEl2) {
        timeEl2.textContent = `${formatNum(days)} : ${formatNum(hours)} : ${formatNum(minutes)} : ${formatNum(seconds)}`;
    }
    if (dayEl2) {
        dayEl2.textContent = `행사시작 D-${days}`;
    }
}
updateTimer2();
setInterval(updateTimer2, 1000);






// =========================================================================================================
// sec16 관련


function cardActive(n) {
    event.stopPropagation();
    if (n==1){
        document.getElementById('sec16_card1').classList.add('sec16_active');
        document.getElementById('sec16_card2').classList.remove('sec16_active');
        document.getElementById('sec16_card3').classList.remove('sec16_active');
    }
    if (n==2){
        document.getElementById('sec16_card1').classList.remove('sec16_active');
        document.getElementById('sec16_card2').classList.add('sec16_active');
        document.getElementById('sec16_card3').classList.remove('sec16_active');
    }
    if (n==3){
        document.getElementById('sec16_card1').classList.remove('sec16_active');
        document.getElementById('sec16_card2').classList.remove('sec16_active');
        document.getElementById('sec16_card3').classList.add('sec16_active');
    }
    return;
}


document.addEventListener('click', function() {
    document.getElementById('sec16_card1').classList.remove('sec16_active');
    document.getElementById('sec16_card2').classList.remove('sec16_active');
    document.getElementById('sec16_card3').classList.remove('sec16_active');
});




// =========================================================================================================
// sec99 관련

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('sec99_video');
    if (!video) return;

    // ==========================================
    // [설정] 화면 폭 기준점 (넓은 순서대로 작성)
    // 1400px 이상 -> 1번 영상
    // 1024px 이상 -> 2번 영상
    // 768px 이상  -> 3번 영상
    // 768px 미만  -> 4번 영상
    // ==========================================
    const BREAKPOINTS = [1400, 1024, 768];

    let currentVideoIndex = null;

    // # 화면 폭에 맞는 영상 번호(1, 2, 3, 4...) 판별 함수
    function getTargetIndex() {
        const width = window.innerWidth;
        for (let i = 0; i < BREAKPOINTS.length; i++) {
            if (width >= BREAKPOINTS[i]) {
                return i + 1;
            }
        }
        return BREAKPOINTS.length + 1;
    }

    // # 적합한 영상, 포스터 세팅 함수
    function loadAppropriateVideo() {
        const targetIndex = getTargetIndex();
        if (currentVideoIndex === targetIndex) return;      // 이미 적합하면 패스
        currentVideoIndex = targetIndex;

        // data 속성에서 읽어오기 (예: data-poster-1, data-mp4-1)
        const poster = video.getAttribute(`data-poster-${targetIndex}`);
        const webmSrc = video.getAttribute(`data-webm-${targetIndex}`);
        const mp4Src = video.getAttribute(`data-mp4-${targetIndex}`);

        if (poster) video.poster = poster;      // 포스터 세팅

        // 기존 자식 source 비우기
        video.innerHTML = '';

        // 영상 세팅. source 방식으로, webm 로딩 가능하면 그거 쓰고, 아니면 mp4
        if (webmSrc) {
            const sourceWebm = document.createElement('source');
            sourceWebm.src = webmSrc;
            sourceWebm.type = 'video/webm';
            video.appendChild(sourceWebm);
        }
        if (mp4Src) {
            const sourceMp4 = document.createElement('source');
            sourceMp4.src = mp4Src;
            sourceMp4.type = 'video/mp4';
            video.appendChild(sourceMp4);
        }

        // 영상 새로고침 및 재생
        video.load();
        video.play().catch(error => {
            console.log("자동 재생 대기 중:", error);
        });
    }

    // 최초 실행 (조건에 맞는 단 1개의 영상만 즉시 다운로드)
    loadAppropriateVideo();

    // 화면 크기 변경 감지 (디바운스 적용)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            loadAppropriateVideo();
        }, 200);
    });
});












