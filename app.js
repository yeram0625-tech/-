const state = {
  stream: null,
  facingMode: "user",
  photos: [],
  selectedIds: [],
  isCountingDown: false,
};

const $ = (selector) => document.querySelector(selector);
const intro = $("#intro");
const booth = $("#booth");
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
  if (state.isCountingDown || !state.stream) {
    if (!state.stream) showToast("사진 추가 버튼으로도 시작할 수 있어요");
    return;
  }

  state.isCountingDown = true;
  captureButton.disabled = true;
  for (const number of [3, 2, 1]) {
    countdown.textContent = number;
    await wait(900);
  }
  countdown.textContent = "";
  takePhoto();
  state.isCountingDown = false;
  captureButton.disabled = false;
}

function takePhoto() {
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
  addPhoto(captureCanvas.toDataURL("image/jpeg", 0.92));
  showToast("찰칵! 사진이 추가됐어요");
}

function addPhoto(src) {
  const photo = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    src,
  };
  state.photos.unshift(photo);
  if (state.selectedIds.length < 4) state.selectedIds.push(photo.id);
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
        <img src="${photo.src}" alt="촬영한 사진" />
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
    addPhoto(await fileToDataUrl(file));
  }
  fileInput.value = "";
  showToast(`${images.length}장의 사진을 추가했어요`);
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

async function composeStrip() {
  if (state.selectedIds.length !== 4) return;

  composeButton.disabled = true;
  const originalLabel = composeButton.innerHTML;
  composeButton.textContent = "만드는 중...";

  const selectedPhotos = state.selectedIds.map((id) =>
    state.photos.find((photo) => photo.id === id),
  );
  const images = await Promise.all(selectedPhotos.map((photo) => loadImage(photo.src)));
  const ctx = resultCanvas.getContext("2d");
  const width = resultCanvas.width;
  const height = resultCanvas.height;
  const photoX = 108;
  const photoWidth = width - photoX * 2;
  const photoHeight = 690;
  const gap = 30;
  const firstY = 92;

  ctx.fillStyle = "#fffdfd";
  ctx.fillRect(0, 0, width, height);
  drawHeartBorder(ctx, width, height);

  images.forEach((image, index) => {
    const y = firstY + index * (photoHeight + gap);
    ctx.fillStyle = "#f0f0ee";
    ctx.fillRect(photoX, y, photoWidth, photoHeight);
    drawCover(ctx, image, photoX, y, photoWidth, photoHeight);
  });

  const footerY = firstY + 4 * (photoHeight + gap) + 20;
  ctx.textAlign = "center";
  ctx.fillStyle = "#171717";
  ctx.font = '800 60px Inter, "Malgun Gothic", Arial, sans-serif';
  ctx.fillText("나를 찾다, 미래를 열다!", width / 2, footerY + 82);

  ctx.fillStyle = "#666666";
  ctx.font = '600 28px Inter, "Malgun Gothic", Arial, sans-serif';
  ctx.fillText("2026서울진로직업박람회 X 망우청소년센터", width / 2, footerY + 140);

  ctx.strokeStyle = "#ece7e9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(photoX, footerY + 190);
  ctx.lineTo(width - photoX, footerY + 190);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#171717";
  ctx.font = '800 45px Inter, Arial, sans-serif';
  ctx.fillText("YERAM FOUR CUTS", photoX, footerY + 260);

  const date = new Intl.DateTimeFormat("en-CA").format(new Date()).replaceAll("-", "  ·  ");
  ctx.fillStyle = "#777777";
  ctx.font = '500 24px Inter, Arial, sans-serif';
  ctx.fillText(date, photoX, footerY + 306);

  ctx.textAlign = "right";
  ctx.fillStyle = "#7a68ff";
  ctx.font = 'italic 700 32px Georgia, "Times New Roman", serif';
  ctx.fillText("ViveCoded By YERAM", width - photoX, footerY + 276);
  ctx.textAlign = "left";

  composeButton.innerHTML = originalLabel;
  composeButton.disabled = false;
  stopCamera();
  setScreen("result");
}

function saveImage() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = resultCanvas.width * 2;
  exportCanvas.height = resultCanvas.height;
  const exportContext = exportCanvas.getContext("2d");
  exportContext.drawImage(resultCanvas, 0, 0);
  exportContext.drawImage(resultCanvas, resultCanvas.width, 0);

  const link = document.createElement("a");
  const date = new Intl.DateTimeFormat("en-CA").format(new Date());
  link.download = `fourly-double-strip-${date}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
  showToast("네컷 프레임 두 장을 나란히 저장했어요");
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
  renderPhotos();
  setScreen("intro");
}

$("#startButton").addEventListener("click", beginBooth);
captureButton.addEventListener("click", runCountdown);
switchButton.addEventListener("click", switchCamera);
fileInput.addEventListener("change", (event) => addFiles(event.target.files));
deleteButton.addEventListener("click", deleteSelected);
composeButton.addEventListener("click", composeStrip);
$("#saveButton").addEventListener("click", saveImage);
$("#backButton").addEventListener("click", async () => {
  setScreen("booth");
  await startCamera();
});
document.querySelector('[data-action="reset"]').addEventListener("click", resetApp);
window.addEventListener("beforeunload", stopCamera);

renderPhotos();
