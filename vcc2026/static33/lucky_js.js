
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ============================================================
// [커스텀 설정 1] 배경 별/글리터 설정
// count: 별/입자의 개수입니다. (숫자가 커질수록 별이 더 빽빽해집니다)
// spread: 별들이 퍼져있는 공간의 전체 범위 반지름입니다. (값이 클수록 우주 공간 전체로 넓게 퍼집니다)
// size: 입자의 크기입니다.
// color: 16진수 색상 코드입니다. (예: 0xffffff = 흰색, 0xaac4ff = 연푸른색)
// opacity: 투명도입니다. (0.0 투명 ~ 1.0 불투명)
// ============================================================
const STAR_CONFIG = {
    farStars: { count: 1200, spread: 28, size: 0.03, color: 0xaac4ff, opacity: 0.6 },
    nearStars: { count: 300, spread: 14, size: 0.06, color: 0xffffff, opacity: 0.9 },
    glitter: { count: 120, spread: 9, size: 0.09, color: 0xd9b8ff, opacity: 0.85 }
};

// ============================================================
// [커스텀 설정 2] 화면 가로폭(innerWidth)에 따른 이미지 크기 및 회전 반경 동적 조절
// ============================================================
function getResponsiveConfig() {
    const width = window.innerWidth;

    // 모바일 (768px 미만)
    if (width < 768) {
        return {
            panelHeight: 1.1,      // 이미지 카드 세로 크기 (3D 단위)
            orbitRadiusBase: 1.6,  // 카드가 배치되는 기본 회전 반지름
            orbitRadiusVar: 0.3    // 카드별 반지름 분산값
        };
    } 
    // 태블릿 (768px ~ 1024px)
    else if (width < 1024) {
        return {
            panelHeight: 1.3,
            orbitRadiusBase: 2.0,
            orbitRadiusVar: 0.35
        };
    } 
    // 데스크탑 (1024px 이상)
    else {
        return {
            panelHeight: 1.5,      // 이미지 카드 세로 크기
            orbitRadiusBase: 2.3,  // 회전 반지름
            orbitRadiusVar: 0.4
        };
    }
}

// ============================================================
// 카드 이미지 경로 — images/ 폴더의 파일명
// ============================================================
const IMG_BASE = 'static33/';
const IMAGE_URLS = [
    'sec88_img1.webp',      // 01 LG Gram
    'sec88_img2.webp',         // 02 iPad
    'sec88_img3.webp',       // 03 iPhone
    'sec88_img4.webp',       // 04 Galaxy Series
    'sec88_img5.webp',  // 05 Apple Watch
    'sec88_img6.webp', // 06 Galaxy Watch
    'sec88_img6.webp', // 06 Galaxy Watch
].map(n => IMG_BASE + n);

// Target Div 컨테이너 참조
const container = document.getElementById('sec88_lucky');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030308, 0.026);

const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0.8, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// <canvas> 요소를 <div id="sec88_lucky"> 내부로 삽입
container.appendChild(renderer.domElement);

// Environment map
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// ---- Lighting ----
scene.add(new THREE.AmbientLight(0x4a4a6a, 1.15));
const rim1 = new THREE.PointLight(0x6a8fff, 6, 20);
rim1.position.set(-4, 3, 3);
scene.add(rim1);
const rim2 = new THREE.PointLight(0xb388ff, 5, 20);
rim2.position.set(4, 2, -3);
scene.add(rim2);
const keyLight = new THREE.PointLight(0xfff2d8, 2.4, 12);
keyLight.position.set(0, 2, 5);
scene.add(keyLight);
const boxLight = new THREE.PointLight(0xcfe0ff, 4.5, 6);
boxLight.position.set(0.5, 1.2, 2.2);
scene.add(boxLight);
const boxFillLight = new THREE.PointLight(0xffffff, 2.0, 6);
boxFillLight.position.set(-1.5, -0.5, 2.5);
scene.add(boxFillLight);
const burstFlash = new THREE.PointLight(0xeef2ff, 0, 9);
burstFlash.position.set(0, 0.3, 0.5);
scene.add(burstFlash);
const BASE_INTENSITY = { rim1: rim1.intensity, rim2: rim2.intensity, key: keyLight.intensity, boxL: boxLight.intensity };

// ============ AMBIENT SPACE BACKGROUND ============
function makeDotTexture() {
    const c = document.createElement('canvas'); 
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.7,  'rgba(255,255,255,0.25)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    g.fillStyle = grad; 
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}
const dotTex = makeDotTexture();

function makeStars(count, spread, size, color, opacity) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = spread * (0.4 + Math.random()*0.6);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random()*2)-1);
        positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ 
        color, 
        size, 
        map: dotTex, 
        transparent: true, 
        opacity, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false 
    });
    return new THREE.Points(geo, mat);
}

// 상단 STAR_CONFIG를 이용한 별 생성
const starsFar = makeStars(
    STAR_CONFIG.farStars.count, STAR_CONFIG.farStars.spread, STAR_CONFIG.farStars.size, 
    STAR_CONFIG.farStars.color, STAR_CONFIG.farStars.opacity
);
const starsNear = makeStars(
    STAR_CONFIG.nearStars.count, STAR_CONFIG.nearStars.spread, STAR_CONFIG.nearStars.size, 
    STAR_CONFIG.nearStars.color, STAR_CONFIG.nearStars.opacity
);
const glitter = makeStars(
    STAR_CONFIG.glitter.count, STAR_CONFIG.glitter.spread, STAR_CONFIG.glitter.size, 
    STAR_CONFIG.glitter.color, STAR_CONFIG.glitter.opacity
);
scene.add(starsFar, starsNear, glitter);

// ============ GIFT BOX — holographic glass ============
const boxGroup = new THREE.Group();
scene.add(boxGroup);

function makeGradientTexture(stops) {
    const c = document.createElement('canvas'); 
    c.width = 128; 
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 128, 128, 0);
    for (const [off, col] of stops) grad.addColorStop(off, col);
    g.fillStyle = grad; 
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
const holoBodyTex   = makeGradientTexture([[0,'#ff6ec0'],[0.45,'#9f6bff'],[1,'#4f7dff']]);
const holoRibbonTex = makeGradientTexture([[0,'#7ef0ff'],[0.5,'#5f8dff'],[1,'#c49bff']]);

const boxSize = 1.0;
const glassSettings = {
    metalness: 0, roughness: 0.1, transmission: 0.85, thickness: 0.55,
    ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.06,
    iridescence: 0.85, iridescenceIOR: 1.32,
    envMapIntensity: 1.5, transparent: true, opacity: 1,
};

const boxBodyGeo = new THREE.BoxGeometry(boxSize, boxSize*0.72, boxSize);
const boxBodyMat = new THREE.MeshPhysicalMaterial({
    map: holoBodyTex, emissive: 0xffffff, emissiveMap: holoBodyTex, emissiveIntensity: 0.32,
    ...glassSettings,
});
const boxBody = new THREE.Mesh(boxBodyGeo, boxBodyMat);
boxGroup.add(boxBody);

const lidGeo = new THREE.BoxGeometry(boxSize*1.1, 0.18, boxSize*1.1);
const lidMat = new THREE.MeshPhysicalMaterial({
    map: holoBodyTex, emissive: 0xffffff, emissiveMap: holoBodyTex, emissiveIntensity: 0.38,
    ...glassSettings, thickness: 0.3,
});
const boxLid = new THREE.Mesh(lidGeo, lidMat);
boxLid.position.y = boxSize*0.36 - 0.03;
boxGroup.add(boxLid);

const boxEdgeMat = new THREE.LineBasicMaterial({ color: 0xe6efff, transparent: true, opacity: 0.55 });
const boxEdgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxBodyGeo), boxEdgeMat);
boxGroup.add(boxEdgeLines);
const lidEdgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(lidGeo), boxEdgeMat);
boxLid.add(lidEdgeLines);

const ribbonMat = new THREE.MeshPhysicalMaterial({
    map: holoRibbonTex, emissive: 0xffffff, emissiveMap: holoRibbonTex, emissiveIntensity: 0.4,
    ...glassSettings, thickness: 0.25, roughness: 0.07,
});
const ribbonThickness = 0.11;

const ribbonVert = new THREE.Mesh(new THREE.BoxGeometry(ribbonThickness, boxSize*0.72*1.06, boxSize*1.14), ribbonMat);
boxGroup.add(ribbonVert);
const ribbonHoriz = new THREE.Mesh(new THREE.BoxGeometry(boxSize*1.14, boxSize*0.72*1.06, ribbonThickness), ribbonMat);
boxGroup.add(ribbonHoriz);

const bowGroup = new THREE.Group();
const loopGeo = new THREE.TorusGeometry(0.21, 0.058, 14, 28);
const loopMat = ribbonMat;
const loopL = new THREE.Mesh(loopGeo, loopMat);
loopL.rotation.z = Math.PI/2.6;
loopL.position.set(-0.17, boxSize*0.36 + 0.18, 0);
bowGroup.add(loopL);
const loopR = new THREE.Mesh(loopGeo, loopMat);
loopR.rotation.z = -Math.PI/2.6;
loopR.position.set(0.17, boxSize*0.36 + 0.18, 0);
bowGroup.add(loopR);
const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), loopMat);
knot.position.set(0, boxSize*0.36 + 0.13, 0);
bowGroup.add(knot);
boxGroup.add(bowGroup);

const tailGeo = new THREE.PlaneGeometry(0.09, 0.32);
const tailMat = new THREE.MeshPhysicalMaterial({
    map: holoRibbonTex, transparent: true, opacity: 0.8, roughness: 0.15,
    clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.7, iridescenceIOR: 1.3,
    side: THREE.DoubleSide,
});
const tailL = new THREE.Mesh(tailGeo, tailMat);
tailL.position.set(-0.06, boxSize*0.36 - 0.08, boxSize/2 + 0.001);
bowGroup.add(tailL);
const tailR = new THREE.Mesh(tailGeo, tailMat);
tailR.position.set(0.06, boxSize*0.36 - 0.1, boxSize/2 + 0.001);
tailR.rotation.z = 0.15;
bowGroup.add(tailR);

const fadeMats = [
    { mat: boxBodyMat, o: 1 }, { mat: lidMat, o: 1 }, { mat: ribbonMat, o: 1 },
    { mat: tailMat, o: 0.8 }, { mat: boxEdgeMat, o: 0.55 },
];

const ribbonPieces = [
    { mesh: ribbonVert, dir: new THREE.Vector3(1, 0.3, 0.2).normalize(), spin: 6 },
    { mesh: ribbonHoriz, dir: new THREE.Vector3(-0.8, 0.4, -0.3).normalize(), spin: -5 },
    { mesh: bowGroup, dir: new THREE.Vector3(0, 1, 0.15).normalize(), spin: 4 },
    { mesh: boxLid, dir: new THREE.Vector3(0.15, 1, -0.25).normalize(), spin: 7 },
];
ribbonPieces.forEach(rp => { rp.basePos = rp.mesh.position.clone(); });

// ============ PRODUCT PANELS ============
function makePanelTexture(url) {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeShineTexture() {
    const c = document.createElement('canvas'); 
    c.width = 512; 
    c.height = 256;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 256);
    g.save();
    g.translate(256, 128);
    g.rotate(-0.45);
    const grad = g.createLinearGradient(-70, 0, 70, 0);
    grad.addColorStop(0,    'rgba(255,255,255,0)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.5,  'rgba(255,255,255,1)');
    grad.addColorStop(0.58, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(-90, -400, 180, 800);
    const grad2 = g.createLinearGradient(90, 0, 130, 0);
    grad2.addColorStop(0,   'rgba(255,255,255,0)');
    grad2.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    grad2.addColorStop(1,   'rgba(255,255,255,0)');
    g.fillStyle = grad2;
    g.fillRect(90, -400, 40, 800);
    g.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}
const shineTexBase = makeShineTexture();

const panels = [];
const N = IMAGE_URLS.length;

// 최종 카드 배치 위치 계산 함수 (반응형 설정 반영)
function finalPosFor(i) {
    const cfg = getResponsiveConfig();
    const angle = (i / N) * Math.PI * 2 + (i % 2 === 0 ? 0.15 : -0.1);
    const radius = cfg.orbitRadiusBase + (i % 3) * cfg.orbitRadiusVar;
    const height = -0.6 + ((i * 53) % 140) / 100 * 1.6;
    return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
}

for (let i = 0; i < N; i++) {
    const tex = makePanelTexture(IMAGE_URLS[i]);
    const aspect = 419/429;
    
    // 반응형 이미지 크기 적용
    const cfg = getResponsiveConfig();
    const panelH = cfg.panelHeight;
    const panelW = panelH * aspect;
    const geo = new THREE.PlaneGeometry(panelW, panelH);

    const mat = new THREE.MeshPhysicalMaterial({
        map: tex, color: 0x8a8a8a, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75,
        roughness: 0.45, metalness: 0.05, clearcoat: 0.56, clearcoatRoughness: 0.22,
        envMapIntensity: 0.8, transparent: true, opacity: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0,0,0);
    mesh.scale.setScalar(1);
    mesh.visible = false;
    scene.add(mesh);

    const shineTex = shineTexBase.clone();
    shineTex.needsUpdate = true;
    const shineMat = new THREE.MeshBasicMaterial({
        map: shineTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const shineMesh = new THREE.Mesh(geo, shineMat);
    shineMesh.position.z = 0.012;
    mesh.add(shineMesh);

    const fp = finalPosFor(i);
    const startPos = new THREE.Vector3(
        (Math.random()-0.5) * boxSize * 0.5,
        (Math.random()-0.5) * boxSize*0.72 * 0.5,
        (Math.random()-0.5) * boxSize * 0.5
    );
    panels.push({
        mesh, shineMat, shineTex, finalPos: fp, baseY: fp.y, startPos, startPos0: startPos.clone(),
        phase: Math.random() * Math.PI * 2,
        geo // 지오메트리 참조 보관 (리사이즈 시 동적 업데이트용)
    });
    console.log("asdf");
}

// ============ BURST GLITTER ============
const GLITTER_PALETTE = [
    new THREE.Color(0x9ff0ff),
    new THREE.Color(0xffffff),
    new THREE.Color(0xc9b6ff),
    new THREE.Color(0xffa8d8),
];

const BURST_COUNT = 260;
const burstPos = new Float32Array(BURST_COUNT*3);
const burstOrigin = new Float32Array(BURST_COUNT*3);
const burstDelay = new Float32Array(BURST_COUNT);
const burstVel = [];
const burstVel0 = [];
const burstColor = new Float32Array(BURST_COUNT*3);
const burstSize = new Float32Array(BURST_COUNT);

for (let i = 0; i < BURST_COUNT; i++) {
    const ox = (Math.random()-0.5) * boxSize * 0.7;
    const oy = (Math.random()-0.5) * boxSize*0.72 * 0.7;
    const oz = (Math.random()-0.5) * boxSize * 0.7;
    burstOrigin[i*3+0]=ox; burstOrigin[i*3+1]=oy; burstOrigin[i*3+2]=oz;
    burstPos[i*3+0] = ox; burstPos[i*3+1] = oy; burstPos[i*3+2] = oz;
    burstDelay[i] = Math.random() * 0.22;
    const dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5+0.35, Math.random()-0.5).normalize();
    const speed = 1.5 + Math.random()*3.5;
    const v0 = dir.multiplyScalar(speed);
    burstVel.push(v0.clone());
    burstVel0.push(v0.clone());
    const c = GLITTER_PALETTE[Math.floor(Math.random()*GLITTER_PALETTE.length)];
    burstColor[i*3+0]=c.r; burstColor[i*3+1]=c.g; burstColor[i*3+2]=c.b;
    burstSize[i] = 0.03 + Math.random()*0.05;
}
const burstGeo = new THREE.BufferGeometry();
burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
burstGeo.setAttribute('color', new THREE.BufferAttribute(burstColor, 3));
const burstMat = new THREE.PointsMaterial({
    size: 0.05, map: dotTex, vertexColors: true, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
const burstPoints = new THREE.Points(burstGeo, burstMat);
scene.add(burstPoints);

// ============ POP GLOW SPHERE ============
const glowMat = new THREE.MeshBasicMaterial({
    color: 0xdfe6ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), glowMat);
glowSphere.visible = false;
scene.add(glowSphere);

const glowMat2 = new THREE.MeshBasicMaterial({
    color: 0xf2f5ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
const glowSphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), glowMat2);
glowSphere2.visible = false;
scene.add(glowSphere2);

// ============ CARD REVEAL GLOW ============
function makeRadialGlowTexture() {
    const c = document.createElement('canvas'); 
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.3,  'rgba(255,255,255,0.5)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.14)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    g.fillStyle = grad; 
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}
const haloMat = new THREE.SpriteMaterial({
    map: makeRadialGlowTexture(), color: 0xbcd2ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
const halo = new THREE.Sprite(haloMat);
scene.add(halo);

const cardFlash = new THREE.PointLight(0xdfe8ff, 0, 7);
scene.add(cardFlash);

// ============ LAPTOP FINALE ============
const RING_COUNT = 90;
const ringPos = new Float32Array(RING_COUNT*3);
const ringVel = [];
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
const ringMat = new THREE.PointsMaterial({
    color: 0xffdf9e, size: 0.07, map: dotTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
const ringPoints = new THREE.Points(ringGeo, ringMat);
ringPoints.visible = false;
scene.add(ringPoints);
for (let i = 0; i < RING_COUNT; i++) ringVel.push(new THREE.Vector3());
let ringStartTime = -1;

function triggerRing(center) {
    const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    for (let i = 0; i < RING_COUNT; i++) {
        const a = (i / RING_COUNT) * Math.PI * 2 + Math.random()*0.1;
        const dir = new THREE.Vector3()
            .addScaledVector(camRight, Math.cos(a))
            .addScaledVector(camUp, Math.sin(a));
        const speed = 1.6 + Math.random()*0.9;
        ringVel[i].copy(dir).multiplyScalar(speed);
        ringPos[i*3+0] = center.x + dir.x*0.3;
        ringPos[i*3+1] = center.y + dir.y*0.3;
        ringPos[i*3+2] = center.z + dir.z*0.3;
    }
    ringGeo.attributes.position.needsUpdate = true;
    ringMat.opacity = 1;
    ringPoints.visible = true;
    ringStartTime = performance.now()/1000;
}

// ---- Controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enableZoom = false;
controls.minDistance = 3;
controls.maxDistance = 14;
controls.target.set(0, 0.5, 0);

controls.update();
const lockedPolar = controls.getPolarAngle();
controls.minPolarAngle = lockedPolar;
controls.maxPolarAngle = lockedPolar;
renderer.domElement.style.touchAction = 'pan-y';

const swipeHint = document.getElementById('swipeHint');
let hintTimer;
renderer.domElement.addEventListener('pointerdown', () => {
    swipeHint.classList.add('hidden');
    clearTimeout(hintTimer);
});
window.addEventListener('pointerup', () => {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => swipeHint.classList.remove('hidden'), 2000);
});

// ---- Bloom ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.35, 0.6, 0.45);
composer.addPass(bloom);

// 컨테이너 크기 변화에 대응하는 Resize 이벤트 listener
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);

    // 창 크기 변경 시 이미지 크기 및 궤도 위치 재계산
    const cfg = getResponsiveConfig();
    const aspect = 419/429;
    const panelH = cfg.panelHeight;
    const panelW = panelH * aspect;

    panels.forEach((p, i) => {
        // 이미지 면 크기 갱신
        p.geo.dispose();
        p.geo = new THREE.PlaneGeometry(panelW, panelH);
        p.mesh.geometry = p.geo;
        
        // 최종 궤도 좌표 갱신
        const newFp = finalPosFor(i);
        p.finalPos.copy(newFp);
        p.baseY = newFp.y;
    });
});

// ---- Easing ----
function easeOutBack(x) { const c1=2.4,c3=c1+1; return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2); }
function easeOutCubic(x) { return 1 - Math.pow(1-x,3); }
function easeInOutCubic(x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2; }
function easeOutQuad(x) { return 1 - (1-x)*(1-x); }
function easeInQuad(x) { return x*x; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ================= TIMELINE =================
const IDLE_DUR = 0.55;
const BOUNCES = [
    { dur: 0.26, h: 0.16 },
    { dur: 0.30, h: 0.34 },
    { dur: 0.24, h: 0.75, leap: true },
];
const BOUNCE_TOTAL = BOUNCES.reduce((s,b)=>s+b.dur, 0);
const POP_T = IDLE_DUR + BOUNCE_TOTAL;
const POP_APEX_Y = BOUNCES[2].h;
const POP_DUR = 0.5;
const GLOW_DUR = 0.55;
const FLASH_DUR = 0.4;
const CAM_PUNCH_DUR = 0.45;
const DEAL_START = POP_T + 0.3;

const DEAL_ORDER = [6, 5, 4, 3, 2, 1, 0];              // 이미지 수 늘릴때 조정부분
const LAPTOP_IDX = 0;
const DEAL_PACE = [                                 // 이미지 수 늘릴때 조정부분
    { fly: 0.37, hold: 0.57 },
    { fly: 0.31, hold: 0.42 },
    { fly: 0.26, hold: 0.31 },
    { fly: 0.23, hold: 0.24 },
    { fly: 0.21, hold: 0.21 },
    { fly: 0.48, hold: 1.00 },
    { fly: 0.48, hold: 1.00 },
];
const SETTLE_DUR = 0.5;
const cardStart = [];
{
    let tAcc = DEAL_START;
    for (let k = 0; k < DEAL_ORDER.length; k++) {
        cardStart.push(tAcc);
        tAcc += DEAL_PACE[k].fly + DEAL_PACE[k].hold;
    }
}
const lastK = DEAL_ORDER.length - 1;
const FINALE_END = cardStart[lastK] + DEAL_PACE[lastK].fly + DEAL_PACE[lastK].hold + SETTLE_DUR;
const luckyTitle = document.getElementById('luckyTitle');

const baseFov = camera.fov;
const baseBloomStrength = bloom.strength;
const boxBaseScale = new THREE.Vector3(1,1,1);
const REVEAL_DIST = 3.1;



let isStarted = false;
let startTime = 0;
let lastFrameTime = 0;
let popTriggered = false;
let laptopRevealed = false;



const cardState = panels.map(() => ({
    settleFrom: new THREE.Vector3(), settleCaptured: false,
}));

const _fwd = new THREE.Vector3();
function getRevealPos(target) {
    camera.getWorldDirection(_fwd);
    return target.copy(camera.position).addScaledVector(_fwd, REVEAL_DIST).add(new THREE.Vector3(0, -0.05, 0));
}

function bounceState(bt) {
    let acc = 0;
    for (const b of BOUNCES) {
        if (bt < acc + b.dur) {
            const lp = (bt - acc) / b.dur;
            if (b.leap) {
                const y = easeOutQuad(lp) * b.h;
                return { y, squash: -0.06 * (1-lp) };
            }
            const y = Math.sin(lp * Math.PI) * b.h;
            const edge = Math.min(lp, 1-lp) / 0.18;
            const squash = edge < 1 ? (1-edge) * 0.16 : -0.04 * Math.sin(lp*Math.PI);
            return { y, squash };
        }
        acc += b.dur;
    }
    return { y: POP_APEX_Y, squash: 0 };
}

const clock = new THREE.Clock();
const _reveal = new THREE.Vector3();
const _flutterQ = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0.18).normalize();
const _tiltE = new THREE.Euler();
const _tiltQ = new THREE.Quaternion();

function animate() {
    requestAnimationFrame(animate);


    // 1) 아직 시작 조건이 안 되었을 때: 기본 카메라 렌더링만 유지
    if (!isStarted) {
        controls.update();
        composer.render();
        return; // 아래 애니메이션 로직을 수행하지 않음
    }


    const now = performance.now() / 1000;
    const elapsed = now - startTime;
    const dt = Math.min(now - lastFrameTime, 0.05);
    lastFrameTime = now;
    const t = clock.getElapsedTime();



    // ---- box: idle spin, then bouncing, then pop ----
    boxGroup.rotation.y = elapsed * 0.6;
    boxGroup.rotation.x = Math.sin(elapsed*0.4) * 0.15;

    if (elapsed <= IDLE_DUR) {
        boxGroup.position.y = 0;
        boxGroup.scale.copy(boxBaseScale);
    } else if (elapsed <= POP_T) {
        const bs = bounceState(elapsed - IDLE_DUR);
        boxGroup.position.y = bs.y;
        boxGroup.scale.set(1 + bs.squash*0.7, 1 - bs.squash, 1 + bs.squash*0.7);
        const charge = clamp01((elapsed - IDLE_DUR) / BOUNCE_TOTAL);
        boxLight.intensity = BASE_INTENSITY.boxL * (1 + charge * 1.2);
    }

    // ---- pop ----
    if (elapsed > POP_T) {
        if (!popTriggered) {
            popTriggered = true;
            burstFlash.position.set(0, POP_APEX_Y, 0.3);
            burstFlash.intensity = 10;
            glowSphere.visible = true; glowSphere2.visible = true;
            glowSphere.position.set(0, POP_APEX_Y, 0);
            glowSphere2.position.set(0, POP_APEX_Y, 0);
            for (let i = 0; i < BURST_COUNT; i++) burstPos[i*3+1] += POP_APEX_Y;
            panels.forEach(p => { p.startPos.y += POP_APEX_Y; });
            rim1.intensity = BASE_INTENSITY.rim1 * 2.2;
            rim2.intensity = BASE_INTENSITY.rim2 * 2.2;
            keyLight.intensity = BASE_INTENSITY.key * 1.8;
        }

        const pp = clamp01((elapsed - POP_T) / POP_DUR);
        const eased = easeOutQuad(pp);
        fadeMats.forEach(f => { f.mat.opacity = f.o * (1 - eased); });
        boxGroup.position.y = POP_APEX_Y + eased * 0.9;
        boxGroup.position.z = eased * 0.3;
        const popScale = Math.max(0.03, 1.06 - eased * 1.05);
        boxGroup.scale.set(popScale, popScale, popScale);
        ribbonPieces.forEach(rp => {
            rp.mesh.position.copy(rp.basePos).addScaledVector(rp.dir, eased * 1.6);
            rp.mesh.rotation.x += rp.spin * dt * eased;
            rp.mesh.rotation.y += rp.spin * 0.7 * dt * eased;
        });
        if (pp >= 1) boxGroup.visible = false;

        const gp = clamp01((elapsed - POP_T) / GLOW_DUR);
        const swell = easeOutCubic(gp);
        glowSphere.scale.setScalar(0.3 + swell * 2.6);
        glowMat.opacity = 0.85 * (1 - easeInQuad(gp));
        glowSphere2.scale.setScalar(0.3 + swell * 4.0);
        glowMat2.opacity = 0.35 * (1 - easeInQuad(gp));
        if (gp >= 1) { glowSphere.visible = false; glowSphere2.visible = false; }

        const fp = clamp01((elapsed - POP_T) / FLASH_DUR);
        burstFlash.intensity = 10 * Math.pow(1 - fp, 2.2);
        rim1.intensity = BASE_INTENSITY.rim1 * (1 + 1.2 * (1 - fp));
        rim2.intensity = BASE_INTENSITY.rim2 * (1 + 1.2 * (1 - fp));
        keyLight.intensity = BASE_INTENSITY.key * (1 + 0.8 * (1 - fp));

        const cp = clamp01((elapsed - POP_T) / CAM_PUNCH_DUR);
        camera.fov = baseFov + Math.sin(cp * Math.PI) * 3.0;
        camera.updateProjectionMatrix();
        bloom.strength = baseBloomStrength + Math.sin(cp * Math.PI) * 0.45;
    }

    // ---- card dealing ----
    getRevealPos(_reveal);
    let holdingCard = null, holdingHp = 0, holdingIsLaptop = false;
    for (let k = 0; k < DEAL_ORDER.length; k++) {
        const idx = DEAL_ORDER[k];
        const p = panels[idx];
        const st = cardState[idx];
        const pace = DEAL_PACE[k];
        const lt = elapsed - cardStart[k];
        const isLaptop = (idx === LAPTOP_IDX);

        if (lt <= 0) { p.mesh.visible = false; p.mesh.material.opacity = 0; p.shineMat.opacity = 0; continue; }
        p.mesh.visible = true;

        if (lt < pace.fly) {
            const fp = clamp01(lt / pace.fly);
            const eased = easeOutCubic(fp);
            p.mesh.material.opacity = clamp01(fp / 0.3);
            p.mesh.position.lerpVectors(p.startPos, _reveal, eased);
            p.mesh.position.y += Math.sin(fp * Math.PI) * 0.35;
            const flutter = Math.sin(fp * Math.PI * 2 + p.phase) * 0.9 * (1 - eased);
            _flutterQ.setFromAxisAngle(_axisX, flutter);
            p.mesh.quaternion.copy(camera.quaternion).multiply(_flutterQ);
            p.mesh.scale.setScalar(0.55 + 0.45 * easeOutBack(fp));
            p.shineMat.opacity = 0;
            st.settleCaptured = false;
        } else if (lt < pace.fly + pace.hold) {
            const hp = clamp01((lt - pace.fly) / pace.hold);
            p.mesh.material.opacity = 1;
            p.mesh.position.copy(_reveal);
            p.mesh.position.y += Math.sin(t*1.6 + p.phase) * 0.02;
            _tiltE.set(
                Math.sin(t*1.7 + p.phase) * 0.035,
                Math.sin(t*1.3 + p.phase*2) * 0.05,
                Math.sin(t*0.9 + p.phase) * 0.018
            );
            _tiltQ.setFromEuler(_tiltE);
            p.mesh.quaternion.copy(camera.quaternion).multiply(_tiltQ);
            
            const sweepDur = isLaptop ? 0.65 : 0.5;
            const sw = clamp01(hp / sweepDur);
            p.shineTex.offset.x = -(0.9 - 1.8 * easeInOutCubic(sw));
            p.shineMat.opacity = Math.sin(sw * Math.PI) * (isLaptop ? 0.5 : 0.38);
            const breathe = 1 + Math.sin(t*2.2 + p.phase) * 0.008;
            if (isLaptop) {
                if (!laptopRevealed) {
                    laptopRevealed = true;
                    triggerRing(p.mesh.position);
                    burstFlash.position.copy(p.mesh.position);
                    burstFlash.intensity = 8;
                }
                const punch = hp < 0.35 ? Math.sin((hp/0.35) * Math.PI) * 0.16 : 0;
                p.mesh.scale.setScalar((1.12 + punch) * breathe);
                bloom.strength = baseBloomStrength + Math.max(0, (0.4 - hp)) * 0.9;
            } else {
                p.mesh.scale.setScalar(breathe);
            }
            holdingCard = p; holdingHp = hp; holdingIsLaptop = isLaptop;
            st.settleCaptured = false;
        } else {
            const sp = clamp01((lt - pace.fly - pace.hold) / SETTLE_DUR);
            if (!st.settleCaptured) { st.settleFrom.copy(p.mesh.position); st.settleCaptured = true; }
            p.mesh.material.opacity = 1;
            p.shineMat.opacity = Math.max(0, p.shineMat.opacity - dt * 4);
            if (sp < 1) {
                p.mesh.position.lerpVectors(st.settleFrom, p.finalPos, easeInOutCubic(sp));
                p.mesh.quaternion.copy(camera.quaternion);
                const s0 = isLaptop ? 1.12 : 1;
                p.mesh.scale.setScalar(s0 + (1 - s0) * sp);
            } else {
                p.mesh.quaternion.copy(camera.quaternion);
                p.mesh.scale.setScalar(1);
                p.mesh.position.y = p.baseY + Math.sin(t*0.6 + p.phase) * 0.08;
                p.mesh.position.x = p.finalPos.x + Math.sin(t*0.35 + p.phase) * 0.04;
                p.mesh.position.z = p.finalPos.z;
            }
        }
    }

    if (holdingCard) {
        halo.position.copy(holdingCard.mesh.position).addScaledVector(_fwd, 0.4);
        const hs = holdingIsLaptop ? 2.6 : 2.3;
        halo.scale.set(hs, hs, 1);
        haloMat.color.setHex(holdingIsLaptop ? 0xffd9a8 : 0xbcd2ff);
        const env = Math.min(1, holdingHp / 0.12) * (1 - 0.45 * holdingHp);
        haloMat.opacity = (holdingIsLaptop ? 0.5 : 0.42) * env * (0.92 + 0.08 * Math.sin(t * 3.1));
        cardFlash.position.copy(holdingCard.mesh.position).addScaledVector(_fwd, -0.9);
        const spike = Math.pow(1 - clamp01(holdingHp / 0.3), 2);
        cardFlash.intensity = (holdingIsLaptop ? 3.6 : 1.8) * spike + 0.56 * (1 - 0.5 * holdingHp);
    } else {
        haloMat.opacity = Math.max(0, haloMat.opacity - dt * 3);
        cardFlash.intensity = Math.max(0, cardFlash.intensity - dt * 10);
    }

    if (ringStartTime > 0) {
        const rt = now - ringStartTime;
        const RING_DUR = 0.9;
        if (rt < RING_DUR) {
            for (let i = 0; i < RING_COUNT; i++) {
                ringPos[i*3+0] += ringVel[i].x * dt;
                ringPos[i*3+1] += ringVel[i].y * dt;
                ringPos[i*3+2] += ringVel[i].z * dt;
                ringVel[i].multiplyScalar(0.96);
            }
            ringGeo.attributes.position.needsUpdate = true;
            ringMat.opacity = 1 - easeInQuad(rt / RING_DUR);
        } else {
            ringPoints.visible = false;
            ringStartTime = -1;
        }
    }

    if (elapsed > POP_T) {
        const posAttr = burstGeo.attributes.position;
        for (let i = 0; i < BURST_COUNT; i++) {
            const le = elapsed - POP_T - burstDelay[i];
            if (le <= 0) continue;
            const gdt = Math.min(dt, le);
            burstVel[i].y -= 1.1 * gdt;
            burstVel[i].multiplyScalar(0.988);
            posAttr.array[i*3+0] += burstVel[i].x * gdt;
            posAttr.array[i*3+1] += burstVel[i].y * gdt;
            posAttr.array[i*3+2] += burstVel[i].z * gdt;
        }
        posAttr.needsUpdate = true;
        const fadeStart = POP_T + 3.0;
        if (elapsed > fadeStart) {
            burstMat.opacity = clamp01(1 - (elapsed - fadeStart) / 2.5);
        }
    }

    if (elapsed > FINALE_END + 0.2) luckyTitle.classList.add('show');

    controls.update();
    composer.render();
}
animate();



function startAnimation() {
    if (isStarted) return; // 이미 시작되었으면 중복 실행 방지
    isStarted = true;
    startTime = performance.now() / 1000;
    lastFrameTime = startTime;
    clock.start(); // Three.js 시계(clock) 재시작
}





// 현재 스크롤 높이를 저장할 변수
let currentScrollY = 0;
let sec88Active=false;


// 스크롤 이동 이벤트 리스너 등록
window.addEventListener("scroll", () => {
    // 현재 스크롤 높이 변수 업데이트
    currentScrollY = window.scrollY || window.pageYOffset;
    
    // asdf 함수 실행
    checkPositionLucky();
});

function checkPositionLucky() {
    if (sec88Active){return;}
    
    const targetElement = document.getElementById("sec88");
    
    // 요소가 페이지에 존재하는지 확인
    if (!targetElement) return;
    
    // 페이지 최상단부터 해당 요소의 맨 위까지의 절대 높이(픽셀)
    const elementTop = targetElement.getBoundingClientRect().top + window.scrollY;
    
    // 현재 스크롤 높이와 해당 요소 위치의 차이 계산 (절댓값)
    const distance = elementTop - currentScrollY;
    
    // startAnimation() 함수 실행
    if (distance < 20) {
        sec88Active=true;
        startAnimation();
    }
}




