const state = {
  stream: null,
  facingMode: "user",
  photos: [],
  selectedIds: [],
  isCountingDown: false,
  isCapturingBatch: false,
  beautyFilter: "bright",
  frameTheme: "black",
};

const BEAUTY_FILTERS = {
  original: {
    label: "원본",
    css: "none",
    canvas: "none",
  },
  bright: {
    label: "화사하게",
    css: "brightness(1.24) contrast(1.08) saturate(1.22)",
    canvas: "brightness(1.24) contrast(1.08) saturate(1.22)",
  },
  soft: {
    label: "뽀샤시",
    css: "brightness(1.28) contrast(.88) saturate(1.14)",
    canvas: "brightness(1.28) contrast(.88) saturate(1.14) blur(.85px)",
  },
  clear: {
    label: "선명하게",
    css: "brightness(1.08) contrast(1.34) saturate(1.32)",
    canvas: "brightness(1.08) contrast(1.34) saturate(1.32)",
  },
  warm: {
    label: "필름톤",
    css: "brightness(1.14) contrast(1.1) saturate(1.28) sepia(.34)",
    canvas: "brightness(1.14) contrast(1.1) saturate(1.28) sepia(.34)",
  },
};

const FRAME_THEMES = {
  black: {
    label: "블랙",
    background: "#050505",
    slot: "#181818",
    text: "#ffffff",
    muted: "#d7d7d7",
    line: "#ffffff",
    accent: "#ffffff",
    photoBorder: "#ffffff",
  },
  white: {
    label: "화이트",
    background: "#fffdf8",
    slot: "#f3f3ef",
    text: "#111111",
    muted: "#555555",
    line: "#171717",
    accent: "#171717",
    photoBorder: "#171717",
  },
  heart: {
    label: "하트",
    background: "#fffdfd",
    slot: "#f0f0ee",
    text: "#171717",
    muted: "#666666",
    line: "#ece7e9",
    accent: "#7a68ff",
    photoBorder: "#ffffff",
  },
  film: {
    label: "필름지",
    background: "#111111",
    slot: "#242424",
    text: "#ffffff",
    muted: "#d1d1d1",
    line: "#f6f6f6",
    accent: "#ffd34d",
    photoBorder: "#f8f8f8",
  },
  cute: {
    label: "뽀짝",
    background: "#fff6fb",
    slot: "#fff0f6",
    text: "#3f2b3d",
    muted: "#8b6f82",
    line: "#ffd4e4",
    accent: "#ff6b9a",
    photoBorder: "#ffffff",
  },
  mangomi: {
    label: "망고미",
    background: "#fffaf0",
    slot: "#fff7e4",
    text: "#2c2415",
    muted: "#8a6b35",
    line: "#ff9f00",
    accent: "#ff9f00",
    photoBorder: "#ff9f00",
  },
};

const MANGOMI_ASSETS = {
  faceHeart: "assets/mangomi/face-heart.png",
  faceBasic: "assets/mangomi/face-basic.png",
  faceWink: "assets/mangomi/face-wink.png",
  faceHappy: "assets/mangomi/face-happy.png",
  bodyParty: "assets/mangomi/body-party.png",
  bodyBasic: "assets/mangomi/body-basic.png",
  logo: "assets/mangomi/mangwoo-logo.png",
};

const $ = (selector) => document.querySelector(selector);
const intro = $("#intro");
const booth = $("#booth");
const select = $("#select");
const result = $("#result");
const video = $("#video");
const placeholder = $("#cameraPlaceholder");
const countdown = $("#countdown");
const flash = $("#flash");
const captureCanvas = $("#captureCanvas");
const resultCanvas = $("#resultCanvas");
const photoGrid = $("#photoGrid");
const selectedCount = $("#selectedCount");
const deleteButton = $("#deleteButton");
const composeButton = $("#composeButton");
const captureButton = $("#captureButton");
const switchButton = $("#switchButton");
const fileInput = $("#fileInput");
const toast = $("#toast");
const frameButtons = [...document.querySelectorAll("[data-frame]")];
const beautyButtons = [...document.querySelectorAll("[data-filter]")];
let mangomiAssetsPromise = null;

$("#sampleDate").textContent = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setScreen(screen) {
  intro.hidden = screen !== "intro";
  booth.hidden = screen !== "booth";
  select.hidden = screen !== "select";
  result.hidden = screen !== "result";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraFallback("카메라를 사용할 수 없어요", "사진 추가 버튼을 이용해 주세요");
    return;
  }

  stopCamera();
  placeholder.hidden = false;
  placeholder.querySelector("strong").textContent = "카메라를 준비하고 있어요";
  placeholder.querySelector("small").textContent = "잠시만 기다려 주세요";

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    video.srcObject = state.stream;
    await video.play();
    placeholder.hidden = true;
    captureButton.disabled = false;
    switchButton.disabled = false;
  } catch {
    showCameraFallback("카메라를 열 수 없어요", "권한을 허용하거나 사진을 추가해 주세요");
  }
}

function showCameraFallback(title, description) {
  placeholder.hidden = false;
  placeholder.querySelector("strong").textContent = title;
  placeholder.querySelector("small").textContent = description;
  captureButton.disabled = true;
  switchButton.disabled = true;
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
}

async function beginBooth() {
  setScreen("booth");
  await startCamera();
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCountdown() {
  if (state.isCountingDown || state.isCapturingBatch || !state.stream) {
    if (!state.stream) showToast("사진 추가 버튼으로도 시작할 수 있어요");
    return;
  }

  state.isCapturingBatch = true;
  state.isCountingDown = true;
  captureButton.disabled = true;
  switchButton.disabled = true;
  state.photos = [];
  state.selectedIds = [];
  renderPhotos();

  for (let shot = 1; shot <= 8; shot += 1) {
    for (const number of [5, 4, 3, 2, 1]) {
      countdown.innerHTML = `<small>${shot} / 8</small>${number}`;
      await wait(950);
    }
    countdown.textContent = "";
    takePhoto({ silent: true, append: true });
    showToast(`${shot}번째 사진을 찍었어요`);
    if (shot < 8) await wait(120);
  }

  countdown.textContent = "";
  state.isCountingDown = false;
  state.isCapturingBatch = false;
  captureButton.disabled = false;
  switchButton.disabled = false;
  stopCamera();
  state.selectedIds = [];
  renderPhotos();
  setScreen("select");
  showToast("8장 촬영 완료! 마음에 드는 4장을 골라주세요");
}

function takePhoto(options = {}) {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 960;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext("2d");

  if (state.facingMode === "user") {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);

  flash.classList.remove("fire");
  void flash.offsetWidth;
  flash.classList.add("fire");
  addPhoto(captureCanvas.toDataURL("image/jpeg", 0.92), options);
  if (!options.silent) showToast("찰칵! 사진이 추가됐어요");
}

function addPhoto(src, options = {}) {
  const photo = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    src,
  };
  if (options.append) state.photos.push(photo);
  else state.photos.unshift(photo);
  renderPhotos();
}

function toggleSelection(id) {
  const index = state.selectedIds.indexOf(id);
  if (index >= 0) {
    state.selectedIds.splice(index, 1);
  } else if (state.selectedIds.length < 4) {
    state.selectedIds.push(id);
  } else {
    showToast("사진은 네 장까지 선택할 수 있어요");
  }
  renderPhotos();
}

function renderPhotos() {
  photoGrid.innerHTML = "";
  const beauty = BEAUTY_FILTERS[state.beautyFilter] || BEAUTY_FILTERS.original;

  if (!state.photos.length) {
    photoGrid.innerHTML = `
      <div class="empty-library">
        <span>♡</span>
        <p>촬영하거나 사진을 추가하면<br />여기에 나타나요</p>
      </div>
    `;
  } else {
    state.photos.forEach((photo) => {
      const index = state.selectedIds.indexOf(photo.id);
      const card = document.createElement("button");
      card.className = `photo-card${index >= 0 ? " selected" : ""}`;
      card.type = "button";
      card.setAttribute("aria-label", index >= 0 ? `선택된 사진 ${index + 1}번` : "사진 선택");
      card.innerHTML = `
        <img src="${photo.src}" alt="촬영한 사진" style="filter: ${beauty.css}" />
        <span class="photo-order">${index + 1}</span>
      `;
      card.addEventListener("click", () => toggleSelection(photo.id));
      photoGrid.appendChild(card);
    });
  }

  selectedCount.textContent = state.selectedIds.length;
  deleteButton.disabled = state.selectedIds.length === 0;
  composeButton.disabled = state.selectedIds.length !== 4;
}

function setBeautyFilter(filterId) {
  if (!BEAUTY_FILTERS[filterId]) return;
  state.beautyFilter = filterId;
  beautyButtons.forEach((button) => {
    const isActive = button.dataset.filter === filterId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderPhotos();
  showToast(`${BEAUTY_FILTERS[filterId].label} 보정을 적용했어요`);
}

function setFrameTheme(frameId) {
  if (!FRAME_THEMES[frameId]) return;
  state.frameTheme = frameId;
  frameButtons.forEach((button) => {
    const isActive = button.dataset.frame === frameId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  showToast(`${FRAME_THEMES[frameId].label} 프레임을 선택했어요`);
  if (!result.hidden && state.selectedIds.length === 4) {
    renderFramePreview();
  }
}

function deleteSelected() {
  const selected = new Set(state.selectedIds);
  state.photos = state.photos.filter((photo) => !selected.has(photo.id));
  state.selectedIds = [];
  renderPhotos();
  showToast("선택한 사진을 삭제했어요");
}

async function addFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;

  for (const file of images) {
    addPhoto(await fileToDataUrl(file), { append: true });
  }
  fileInput.value = "";
  state.selectedIds = [];
  renderPhotos();
  stopCamera();
  setScreen("select");
  showToast(`${images.length}장의 사진을 추가했어요. 네 장을 골라주세요`);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function loadMangomiAssets() {
  if (!mangomiAssetsPromise) {
    mangomiAssetsPromise = Promise.all(
      Object.entries(MANGOMI_ASSETS).map(async ([key, src]) => [key, await loadImage(src)]),
    ).then((entries) => Object.fromEntries(entries));
  }
  return mangomiAssetsPromise;
}

function drawCover(ctx, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawContain(ctx, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    drawX = x + (width - drawWidth) / 2;
  }

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawSticker(ctx, image, x, y, width, height, rotation = 0, shadow = true) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  tempCtx.drawImage(image, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 246 && pixels[i + 1] > 246 && pixels[i + 2] > 246) {
      pixels[i + 3] = 0;
    }
  }
  tempCtx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(rotation);
  if (shadow) {
    ctx.shadowColor = "rgba(107, 72, 19, .18)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 12;
  }
  drawContain(ctx, tempCanvas, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFilteredCover(ctx, image, x, y, width, height, radius = 0) {
  const beauty = BEAUTY_FILTERS[state.beautyFilter] || BEAUTY_FILTERS.original;
  ctx.save();
  if (radius > 0) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
  }
  ctx.filter = beauty.canvas;
  drawCover(ctx, image, x, y, width, height);
  ctx.restore();

  if (state.beautyFilter === "soft") {
    ctx.save();
    if (radius > 0) {
      roundedRectPath(ctx, x, y, width, height, radius);
      ctx.clip();
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffe7ef";
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  if (state.beautyFilter === "warm") {
    ctx.save();
    if (radius > 0) {
      roundedRectPath(ctx, x, y, width, height, radius);
      ctx.clip();
    }
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#ffd6a8";
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}

function drawHeart(ctx, x, y, size, filled = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.28);
  ctx.bezierCurveTo(-size * 0.62, -size * 0.12, -size * 0.5, -size * 0.72, 0, -size * 0.38);
  ctx.bezierCurveTo(size * 0.5, -size * 0.72, size * 0.62, -size * 0.12, 0, size * 0.28);
  ctx.closePath();
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeStyle = "#ff5c8a";
  ctx.fillStyle = "#ff5c8a";
  if (filled) ctx.fill();
  else ctx.stroke();
  ctx.restore();
}

function drawHeartBorder(ctx, width, height) {
  const topY = 38;
  const bottomY = height - 36;
  const horizontalGap = 90;
  let order = 0;

  for (let x = 70; x <= width - 70; x += horizontalGap) {
    drawHeart(ctx, x, topY, 20, order % 2 === 0);
    drawHeart(ctx, x, bottomY, 20, order % 2 !== 0);
    order += 1;
  }

  order = 0;
  for (let y = 112; y <= height - 112; y += 108) {
    drawHeart(ctx, 40, y, 17, order % 2 === 0);
    drawHeart(ctx, width - 40, y, 17, order % 2 !== 0);
    order += 1;
  }
}

function drawStar(ctx, x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawFilmDecor(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "#f6f6f6";
  const holeWidth = 46;
  const holeHeight = 34;
  for (let y = 80; y < height - 80; y += 118) {
    roundedRectPath(ctx, 28, y, holeWidth, holeHeight, 9);
    ctx.fill();
    roundedRectPath(ctx, width - 74, y, holeWidth, holeHeight, 9);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 4;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  ctx.moveTo(94, 66);
  ctx.lineTo(94, height - 66);
  ctx.moveTo(width - 94, 66);
  ctx.lineTo(width - 94, height - 66);
  ctx.stroke();
  ctx.restore();
}

function drawCuteDecor(ctx, width, height) {
  const colors = ["#ff6b9a", "#7a68ff", "#ffd34d", "#66d69e", "#ff9f73"];
  for (let i = 0; i < 34; i += 1) {
    const side = i % 2 === 0 ? 54 : width - 54;
    const y = 90 + i * 98;
    drawStar(ctx, side + (i % 3 - 1) * 12, y, 13 + (i % 3) * 3, colors[i % colors.length]);
  }

  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.arc(120 + (i % 3) * 480, 170 + i * 360, 42, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
  }
  ctx.restore();
}

function drawGear(ctx, x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 10; i += 1) {
    ctx.rotate(Math.PI / 5);
    ctx.fillRect(radius * 0.72, -radius * 0.12, radius * 0.28, radius * 0.24);
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawMangomiConfetti(ctx, width, height) {
  const colors = ["#ff9f00", "#ff5c8a", "#5bbd5b", "#4b79c7", "#ffd91f", "#b77ad9"];
  for (let i = 0; i < 44; i += 1) {
    const sideX = i % 2 === 0 ? 70 + (i % 3) * 18 : width - 90 - (i % 3) * 18;
    const y = 120 + i * 76;
    if (i % 3 === 0) drawDiamond(ctx, sideX, y, 18, colors[i % colors.length]);
    else drawStar(ctx, sideX, y, 13, colors[i % colors.length]);
  }
}

function drawMangomiFrameBackground(ctx, width, height, assets) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fffdf3");
  bg.addColorStop(0.54, "#fff8db");
  bg.addColorStop(1, "#fff2be");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = "#ff9f00";
  ctx.lineWidth = 11;
  roundedRectPath(ctx, 42, 42, width - 84, height - 84, 34);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,159,0,.35)";
  ctx.lineWidth = 3;
  roundedRectPath(ctx, 76, 78, width - 152, height - 156, 26);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.16;
  const gearPoints = [
    [180, 260, 54], [1010, 470, 48], [105, 930, 44], [1040, 1380, 58],
    [160, 2110, 48], [1010, 2540, 46], [710, 3230, 68],
  ];
  gearPoints.forEach(([x, y, r], index) => drawGear(ctx, x, y, r, index % 2 ? "#ffbd45" : "#ffd875"));
  ctx.restore();

  drawMangomiConfetti(ctx, width, height);
}

function drawMangomiOverlay(ctx, width, _height, assets) {
  drawSticker(ctx, assets.faceHappy, -8, 92, 245, 245, -0.18);
  drawSticker(ctx, assets.faceHeart, width - 250, 126, 220, 220, 0.16);
  drawSticker(ctx, assets.bodyBasic, width - 288, 1050, 285, 415, 0.1);
  drawSticker(ctx, assets.faceWink, -10, 1810, 250, 250, -0.18);
  drawSticker(ctx, assets.bodyParty, width - 330, 2515, 320, 460, 0.08);
}

function getFrameLayout(frameId, width) {
  if (frameId === "mangomi") {
    return {
      photoX: 165,
      photoWidth: width - 330,
      photoHeight: 670,
      gap: 34,
      firstY: 228,
      radius: 24,
    };
  }

  return {
    photoX: 108,
    photoWidth: width - 216,
    photoHeight: 715,
    gap: 26,
    firstY: 86,
    radius: frameId === "black" || frameId === "film" ? 4 : 18,
  };
}

function drawFrameBackground(ctx, width, height, theme, mangomiAssets) {
  if (state.frameTheme === "mangomi" && mangomiAssets) {
    drawMangomiFrameBackground(ctx, width, height, mangomiAssets);
    return;
  }

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  if (state.frameTheme === "heart") {
    drawHeartBorder(ctx, width, height);
  }

  if (state.frameTheme === "film") {
    drawFilmDecor(ctx, width, height);
  }

  if (state.frameTheme === "cute") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#fff6fb");
    gradient.addColorStop(0.48, "#fffdf3");
    gradient.addColorStop(1, "#f3f0ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    drawCuteDecor(ctx, width, height);
    drawHeartBorder(ctx, width, height);
  }
}

function drawSlotFrame(ctx, x, y, width, height, radius, theme) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = theme.slot;
  ctx.fill();
  ctx.lineWidth = state.frameTheme === "black" || state.frameTheme === "film" ? 5 : 3;
  ctx.strokeStyle = theme.photoBorder;
  ctx.stroke();
  ctx.restore();
}

function drawFrameFooter(ctx, width, height, footerY, photoX, theme) {
  if (state.frameTheme === "mangomi") return;

  const footerCenterY = (footerY + height) / 2 - 18;
  const bottomTitleY = height - 118;
  const bottomDateY = height - 68;

  ctx.textAlign = "center";
  ctx.fillStyle = theme.text;
  ctx.font = '800 66px Inter, "Malgun Gothic", Arial, sans-serif';
  ctx.fillText("나를 찾다, 미래를 열다!", width / 2, footerCenterY - 36);

  ctx.fillStyle = theme.muted;
  ctx.font = '600 30px Inter, "Malgun Gothic", Arial, sans-serif';
  ctx.fillText("2026 진로직업박람회 X 망우청소년센터", width / 2, footerCenterY + 22);

  ctx.strokeStyle = theme.line;
  ctx.globalAlpha = state.frameTheme === "black" || state.frameTheme === "film" ? 0.7 : 1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(photoX, height - 172);
  ctx.lineTo(width - photoX, height - 172);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  ctx.font = '800 48px Inter, Arial, sans-serif';
  ctx.fillText("MANGWOO FOUR CUTS", photoX, bottomTitleY);

  const date = new Intl.DateTimeFormat("en-CA").format(new Date()).replaceAll("-", "  ·  ");
  ctx.fillStyle = theme.muted;
  ctx.font = '500 26px Inter, Arial, sans-serif';
  ctx.fillText(date, photoX, bottomDateY);
  ctx.textAlign = "left";
}

function drawMangomiFooter(ctx, width, height, lastPhotoBottom, assets) {
  const logoWidth = 880;
  const logoHeight = 342;
  const logoX = (width - logoWidth) / 2;
  const logoCenterY = (lastPhotoBottom + height) / 2;
  const logoY = logoCenterY - logoHeight / 2;
  const dividerY = Math.max(lastPhotoBottom + 32, logoY - 24);

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = "rgba(255,159,0,.34)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(160, dividerY);
  ctx.lineTo(width - 160, dividerY);
  ctx.stroke();
  ctx.restore();

  drawSticker(ctx, assets.logo, logoX, logoY, logoWidth, logoHeight, 0, false);
}

async function renderFramePreview() {
  if (state.selectedIds.length !== 4) return;

  const selectedPhotos = state.selectedIds.map((id) =>
    state.photos.find((photo) => photo.id === id),
  );
  if (selectedPhotos.some((photo) => !photo)) return;

  const images = await Promise.all(selectedPhotos.map((photo) => loadImage(photo.src)));
  const mangomiAssets = state.frameTheme === "mangomi" ? await loadMangomiAssets() : null;
  const ctx = resultCanvas.getContext("2d");
  const width = resultCanvas.width;
  const height = resultCanvas.height;
  const theme = FRAME_THEMES[state.frameTheme] || FRAME_THEMES.black;
  const { photoX, photoWidth, photoHeight, gap, firstY, radius } = getFrameLayout(state.frameTheme, width);

  ctx.clearRect(0, 0, width, height);
  drawFrameBackground(ctx, width, height, theme, mangomiAssets);

  images.forEach((image, index) => {
    const y = firstY + index * (photoHeight + gap);
    drawSlotFrame(ctx, photoX, y, photoWidth, photoHeight, radius, theme);
    drawFilteredCover(ctx, image, photoX, y, photoWidth, photoHeight, radius);
  });

  const lastPhotoBottom = firstY + 4 * photoHeight + 3 * gap;
  const footerY = lastPhotoBottom + 20;
  drawFrameFooter(ctx, width, height, footerY, photoX, theme);
  if (state.frameTheme === "mangomi" && mangomiAssets) {
    drawMangomiOverlay(ctx, width, height, mangomiAssets);
    drawMangomiFooter(ctx, width, height, lastPhotoBottom, mangomiAssets);
  }
}

async function composeStrip() {
  if (state.selectedIds.length !== 4) return;

  composeButton.disabled = true;
  const originalLabel = composeButton.innerHTML;
  composeButton.textContent = "미리보기 만드는 중...";

  setScreen("result");
  await renderFramePreview();

  composeButton.innerHTML = originalLabel;
  composeButton.disabled = false;
}

function saveImage() {
  const borderX = 96;
  const borderY = 144;
  const theme = FRAME_THEMES[state.frameTheme] || FRAME_THEMES.black;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = resultCanvas.width * 2 + borderX * 2;
  exportCanvas.height = resultCanvas.height + borderY * 2;
  const exportContext = exportCanvas.getContext("2d");
  exportContext.fillStyle = theme.background;
  exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(resultCanvas, borderX, borderY);
  exportContext.drawImage(resultCanvas, borderX + resultCanvas.width, borderY);

  const link = document.createElement("a");
  const date = new Intl.DateTimeFormat("en-CA").format(new Date());
  link.download = `fourly-double-strip-${date}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
  showToast("테두리를 포함한 네컷 두 장을 저장했어요");
}

async function switchCamera() {
  state.facingMode = state.facingMode === "user" ? "environment" : "user";
  video.style.transform = state.facingMode === "user" ? "scaleX(-1)" : "none";
  await startCamera();
}

function resetApp() {
  stopCamera();
  state.photos = [];
  state.selectedIds = [];
  state.isCountingDown = false;
  state.isCapturingBatch = false;
  countdown.textContent = "";
  renderPhotos();
  setScreen("intro");
}

$("#startButton").addEventListener("click", beginBooth);
captureButton.addEventListener("click", runCountdown);
switchButton.addEventListener("click", switchCamera);
fileInput.addEventListener("change", (event) => addFiles(event.target.files));
deleteButton.addEventListener("click", deleteSelected);
composeButton.addEventListener("click", composeStrip);
frameButtons.forEach((button) => {
  button.addEventListener("click", () => setFrameTheme(button.dataset.frame));
  button.setAttribute("aria-pressed", String(button.dataset.frame === state.frameTheme));
});
beautyButtons.forEach((button) => {
  button.addEventListener("click", () => setBeautyFilter(button.dataset.filter));
  button.setAttribute("aria-pressed", String(button.dataset.filter === state.beautyFilter));
});
$("#saveButton").addEventListener("click", saveImage);
$("#backButton").addEventListener("click", () => setScreen("select"));
document.querySelector('[data-action="reset"]').addEventListener("click", resetApp);
window.addEventListener("beforeunload", stopCamera);

renderPhotos();
