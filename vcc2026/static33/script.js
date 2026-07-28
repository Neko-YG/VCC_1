



// =========================================================================================================
// sec01 관련

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    /* =========================================================================
       SECTION 1: 비디오 스크러빙 & 텍스트 (Vanilla JS + rAF + Seek Lock 방지)
    ========================================================================= */
    /* ★ 스크롤 감도 조절 — frameHeight 숫자만 바꾸면 됩니다.
       값이 작을수록 조금만 굴려도 영상이 빨리 진행됩니다.
       (기존 600vh/300vh 는 한 화면당 영상이 2.5초밖에 안 흘러 답답했음)
       SEEK_EASE : 0.1~0.5. 낮을수록 부드럽고 느리게, 높을수록 즉각 반응. */
    const BREAKPOINTS = [
        { minWidth: 1024, videoSrc: "static33/sec01_vid1.mp4", frameHeight: "350vh" },
        { minWidth: 0,    videoSrc: "static33/sec01_vid2.mp4", frameHeight: "220vh" }
    ];
    const SEEK_EASE = 0.22;

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

    // 스크롤 → 목표 시점만 기록. 실제 seek 은 아래 렌더 루프가 부드럽게 따라감.
    let seekTarget = 0;   // 스크롤이 가리키는 목표 시간
    let seekShown  = 0;   // 현재 화면에 반영된 시간
    let loopId = null;

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

        if (loopId === null) loopId = requestAnimationFrame(renderSec01);
    }

    // 목표 시점을 향해 감쇠 이동. seek 중이면 '건너뛰지 않고' 다음 프레임에 재시도.
    function renderSec01() {
        const diff = seekTarget - seekShown;

        if (Math.abs(diff) < 0.012) {          // 충분히 도달 → 루프 정지
            seekShown = seekTarget;
            if (!sec01Video.seeking && sec01Video.duration) {
                sec01Video.currentTime = seekShown;
            }
            loopId = null;
            return;
        }

        seekShown += diff * SEEK_EASE;         // 부드럽게 접근

        if (!sec01Video.seeking && sec01Video.duration) {
            sec01Video.currentTime = seekShown;
            lastVideoTime = seekShown;
        }
        loopId = requestAnimationFrame(renderSec01);   // seek 중이어도 계속 시도
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












