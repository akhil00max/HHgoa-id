const $ = (selector) => document.querySelector(selector);
const photoInput = $("#photo-input");
const cameraInput = $("#camera-input");
const uploadZone = $("#upload-zone");
const uploadLabel = $("#upload-label");
const previewPhoto = $("#photo-preview");
const photoEmpty = $("#photo-empty");
const nameInput = $("#name-input");
const roleInput = $("#role-input");
const cardName = $("#card-name");
const cardRole = $("#card-role");
const cardClass = $("#card-class");
const previewState = $("#preview-state");
const outputSection = $("#output-section");
const downloadLink = $("#download-link");
const shareButton = $("#share-button");
const canvas = $("#export-canvas");
const photoWrap = document.querySelector(".photo-wrap");
const moveHint = $("#move-hint");
const photoTools = $("#photo-tools");
const zoomRange = $("#zoom-range");
const zoomValue = $("#zoom-value");
const builderClasses = ["PIXEL PIRATE", "SHIP CAPTAIN", "CHAOS ENGINEER", "CODE NOMAD", "IDEA SMUGGLER", "DEBUG DIVER", "TERMINAL SURFER", "VIBE ARCHITECT"];
const flipWrap = $("#flip-wrap");
const flipHint = $("#flip-hint");
const qrHolder = $("#qr-holder");
const fieldGrid = $("#field-grid");
const teamSlots = $("#team-slots");
const stickerOptions = document.querySelectorAll(".sticker-option");
const THEMES = {
  acid: { bg: "#e8ff31", ink: "#10100f", photoBg: "#b6c628" },
  sunset: { bg: "#ff8a5b", ink: "#1a0a05", photoBg: "#e2643a" },
  jungle: { bg: "#1f8a4c", ink: "#eef7df", photoBg: "#136135" },
};

let currentFormat = "card";
let currentTheme = "acid";
let activeStickers = [];
let teamMembers = {
  1: { dataUrl: "", name: "", image: null },
  2: { dataUrl: "", name: "", image: null },
};

let selectedTitle = "PIXEL PIRATE";
let photoDataUrl = "";
let finalImageUrl = "";
let photoOffset = { x: 0, y: 0 };
let photoDrag = null;
let photoZoom = 1;
const activePointers = new Map();
let pinchGesture = null;

const clean = (value, fallback) => value.trim().toUpperCase() || fallback;
const safeFileName = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "builder";

function updatePreview() {
  cardName.textContent = clean(nameInput.value, "YOUR NAME");
  cardRole.textContent = clean(roleInput.value, "BUILDER / STACK");
  cardClass.textContent = selectedTitle;
  const hasProfile = photoDataUrl && nameInput.value.trim() && roleInput.value.trim();
  previewState.textContent = hasProfile ? "READY TO GENERATE" : photoDataUrl ? "ADD DETAILS" : "AWAITING INPUT";
}

function getOffsetBounds(zoom = photoZoom) {
  const rect = photoWrap.getBoundingClientRect();
  if (!previewPhoto.naturalWidth || !rect.width || !rect.height) return { x: 0, y: 0 };
  const baseScale = Math.max(rect.width / previewPhoto.naturalWidth, rect.height / previewPhoto.naturalHeight);
  const baseWidth = previewPhoto.naturalWidth * baseScale;
  const baseHeight = previewPhoto.naturalHeight * baseScale;
  return {
    x: Math.max(0, (baseWidth * zoom - rect.width) / 2),
    y: Math.max(0, (baseHeight * zoom - rect.height) / 2),
  };
}

function setPhotoOffset(x, y) {
  const bounds = getOffsetBounds();
  photoOffset = {
    x: Math.max(-bounds.x, Math.min(bounds.x, x)),
    y: Math.max(-bounds.y, Math.min(bounds.y, y)),
  };
  previewPhoto.style.transform = `translate(${photoOffset.x}px, ${photoOffset.y}px) scale(${photoZoom})`;
}

function setPhotoZoom(zoom) {
  photoZoom = Math.max(Number(zoomRange.min), Math.min(Number(zoomRange.max), Number(zoom)));
  zoomRange.value = photoZoom;
  zoomValue.value = `${Math.round(photoZoom * 100)}%`;
  zoomValue.textContent = `${Math.round(photoZoom * 100)}%`;
  setPhotoOffset(photoOffset.x, photoOffset.y);
}

async function readImage(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    alert("Please choose an image under 15MB.");
    return;
  }
  const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  uploadLabel.textContent = "LOADING PHOTO...";
  try {
    let readFile = file;
    if (isHeic) {
      if (!window.heic2any) throw new Error("HEIC conversion is still loading. Please try again in a moment.");
      const converted = await window.heic2any({ blob: file, toType: "image/jpeg", quality: .92 });
      readFile = Array.isArray(converted) ? converted[0] : converted;
    }
    const reader = new FileReader();
    reader.onload = () => {
      photoDataUrl = reader.result;
      previewPhoto.src = photoDataUrl;
      previewPhoto.onload = () => {
        previewPhoto.classList.add("ready");
        photoEmpty.classList.add("hidden");
        moveHint.hidden = false;
        photoTools.hidden = false;
        zoomRange.disabled = false;
        photoOffset = { x: 0, y: 0 };
        setPhotoZoom(1);
        uploadLabel.textContent = file.name.length > 23 ? `${file.name.slice(0, 20)}...` : file.name;
        updatePreview();
      };
    };
    reader.readAsDataURL(readFile);
  } catch (error) {
    uploadLabel.textContent = "TRY ANOTHER PHOTO";
    alert(error.message || "We couldn't read that photo. Please try a JPG or PNG.");
  }
}

photoInput.addEventListener("change", (event) => readImage(event.target.files[0]));
cameraInput.addEventListener("change", (event) => readImage(event.target.files[0]));
["dragenter", "dragover"].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => {
  event.preventDefault(); uploadZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => {
  event.preventDefault(); uploadZone.classList.remove("dragging");
}));
uploadZone.addEventListener("drop", (event) => readImage(event.dataTransfer.files[0]));
zoomRange.addEventListener("input", (event) => setPhotoZoom(event.target.value));

function pointerDistance() {
  const [first, second] = [...activePointers.values()];
  return Math.hypot(second.x - first.x, second.y - first.y);
}

photoWrap.addEventListener("pointerdown", (event) => {
  if (!photoDataUrl) return;
  event.preventDefault();
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  photoWrap.classList.add("dragging-photo");
  photoWrap.setPointerCapture(event.pointerId);
  if (activePointers.size === 1) {
    photoDrag = { startX: event.clientX, startY: event.clientY, x: photoOffset.x, y: photoOffset.y };
  } else if (activePointers.size === 2) {
    photoDrag = null;
    pinchGesture = { distance: Math.max(pointerDistance(), 1), zoom: photoZoom };
  }
  moveHint.hidden = false;
});
photoWrap.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  event.preventDefault();
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (activePointers.size >= 2 && pinchGesture) {
    setPhotoZoom(pinchGesture.zoom * (pointerDistance() / pinchGesture.distance));
    return;
  }
  if (photoDrag) setPhotoOffset(photoDrag.x + event.clientX - photoDrag.startX, photoDrag.y + event.clientY - photoDrag.startY);
});
function endPhotoGesture(event) {
  activePointers.delete(event.pointerId);
  pinchGesture = null;
  photoDrag = null;
  if (!activePointers.size) photoWrap.classList.remove("dragging-photo");
}
photoWrap.addEventListener("pointerup", endPhotoGesture);
photoWrap.addEventListener("pointercancel", endPhotoGesture);

[nameInput, roleInput].forEach((input) => input.addEventListener("input", updatePreview));
$("#title-options").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  selectedTitle = button.dataset.title === "random" ? builderClasses[Math.floor(Math.random() * builderClasses.length)] : button.dataset.title;
  document.querySelectorAll(".title-option").forEach((option) => option.classList.toggle("active", option === button));
  updatePreview();
});

function applyTheme(themeKey) {
  currentTheme = themeKey;
  const t = THEMES[themeKey];
  const idCard = $("#id-card");
  idCard.style.setProperty("--acid", t.bg);
  idCard.style.setProperty("--ink", t.ink);
  photoWrap.style.background = t.photoBg;
  document.querySelectorAll(".theme-swatch").forEach((swatch) => swatch.classList.toggle("active", swatch.dataset.theme === themeKey));
}
$("#theme-picker").addEventListener("click", (event) => {
  const button = event.target.closest(".theme-swatch");
  if (!button) return;
  applyTheme(button.dataset.theme);
});

$("#format-tabs").addEventListener("click", (event) => {
  const button = event.target.closest(".format-tab");
  if (!button) return;
  currentFormat = button.dataset.format;
  document.querySelectorAll(".format-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  teamSlots.hidden = currentFormat !== "team";
  const isFrame = currentFormat === "frame";
  fieldGrid.style.display = isFrame ? "none" : "";
  $(".title-field").style.display = isFrame ? "none" : "";
  updatePreview();
});

stickerOptions.forEach((button) => {
  button.addEventListener("click", () => {
    const sticker = button.dataset.sticker;
    const isActive = activeStickers.includes(sticker);
    if (isActive) {
      activeStickers = activeStickers.filter((s) => s !== sticker);
      button.classList.remove("active");
    } else {
      if (activeStickers.length >= 2) {
        const removed = activeStickers.shift();
        document.querySelector(`.sticker-option[data-sticker="${removed}"]`)?.classList.remove("active");
      }
      activeStickers.push(sticker);
      button.classList.add("active");
    }
  });
});

async function readTeamSlotImage(file, slot) {
  if (!file) return;
  const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  let readFile = file;
  try {
    if (isHeic && window.heic2any) {
      const converted = await window.heic2any({ blob: file, toType: "image/jpeg", quality: .92 });
      readFile = Array.isArray(converted) ? converted[0] : converted;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        teamMembers[slot].dataUrl = reader.result;
        teamMembers[slot].image = img;
        document.querySelector(`.team-slot[data-slot="${slot}"] .team-slot-label`).textContent = `✓ TEAMMATE ${slot} ADDED`;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(readFile);
  } catch (error) {
    alert("Couldn't read that teammate photo. Try a JPG or PNG.");
  }
}
document.querySelectorAll(".team-photo-input").forEach((input) => {
  input.addEventListener("change", (event) => readTeamSlotImage(event.target.files[0], Number(input.dataset.slot)));
});
document.querySelectorAll(".team-name-input").forEach((input) => {
  input.addEventListener("input", () => { teamMembers[Number(input.dataset.slot)].name = input.value; });
});

flipHint.addEventListener("click", () => flipWrap.classList.toggle("flipped"));
flipWrap.addEventListener("click", (event) => {
  if (event.target.closest(".photo-wrap")) return;
  flipWrap.classList.toggle("flipped");
});

function renderQr(targetUrl) {
  qrHolder.innerHTML = "";
  if (window.QRCode) {
    new window.QRCode(qrHolder, { text: targetUrl, width: 120, height: 120, colorDark: "#10100f", colorLight: "#e8ff31" });
  }
}

function drawText(context, text, x, y, maxWidth, font, align = "left") {
  context.font = font;
  context.textAlign = align;
  context.fillText(text, x, y, maxWidth);
}

function drawCoverImage(context, image, x, y, width, height) {
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const baseWidth = image.naturalWidth * baseScale;
  const baseHeight = image.naturalHeight * baseScale;
  const drawWidth = baseWidth * photoZoom;
  const drawHeight = baseHeight * photoZoom;
  const previewRect = photoWrap.getBoundingClientRect();
  const sourceX = (width - drawWidth) / 2 + ((photoOffset.x / previewRect.width) * width);
  const sourceY = (height - drawHeight) / 2 + ((photoOffset.y / previewRect.height) * height);
  context.drawImage(image, x + sourceX, y + sourceY, drawWidth, drawHeight);
}

function drawStickers(ctx, w, h) {
  activeStickers.forEach((sticker, index) => {
    const x = w - 90 - index * 80;
    const y = h - 200;
    ctx.font = "56px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sticker, x, y);
  });
}

function drawQrBadge(ctx, w, h, ink, acid) {
  const size = 96, margin = 40;
  const x = w - size - margin, y = h - size - margin - 130;
  ctx.fillStyle = acid;
  ctx.fillRect(x - 8, y - 8, size + 16, size + 16);
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(x - 8, y - 8, size + 16, size + 16);
  const qrCanvas = qrHolder.querySelector("canvas");
  if (qrCanvas) ctx.drawImage(qrCanvas, x, y, size, size);
}

function renderCardFormat(ctx, w, h, t) {
  const { bg: acid, ink, photoBg } = t;
  ctx.fillStyle = ink;
  drawText(ctx, "HH", 58, 80, 200, "900 70px Impact, sans-serif");
  drawText(ctx, "GOA", 58, 134, 200, "900 70px Impact, sans-serif");
  drawText(ctx, "BUILDER", 1018, 72, 150, "500 24px monospace", "right");
  drawText(ctx, "ID / 2026", 1018, 100, 150, "500 24px monospace", "right");
  ctx.beginPath(); ctx.arc(928, 160, 85, 0, Math.PI * 2); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(168, 175, 744, 744); ctx.clip();
  ctx.fillStyle = photoBg; ctx.fillRect(168, 175, 744, 744);
  if (photoDataUrl && previewPhoto.naturalWidth) {
    ctx.filter = "grayscale(1) contrast(1.18)";
    drawCoverImage(ctx, previewPhoto, 168, 175, 744, 744);
    ctx.filter = "none";
    ctx.fillStyle = `${acid}40`; ctx.fillRect(168, 175, 744, 744);
  } else {
    drawText(ctx, "YOUR", 208, 350, 500, "900 68px Impact, sans-serif");
    drawText(ctx, "FACE", 208, 420, 500, "900 68px Impact, sans-serif");
    drawText(ctx, "HERE", 208, 490, 500, "900 68px Impact, sans-serif");
  }
  ctx.restore();
  ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(168, 175, 744, 744);
  ctx.save(); ctx.translate(1050, 920); ctx.rotate(-Math.PI / 2); drawText(ctx, "HACKER HOUSE GOA — BUILD STATION", 0, 0, 440, "500 20px monospace"); ctx.restore();
  drawText(ctx, clean(nameInput.value, "YOUR NAME"), 55, 1000, 890, "900 86px Impact, sans-serif");
  drawText(ctx, clean(roleInput.value, "BUILDER / STACK"), 57, 1043, 890, "500 23px monospace");
  ctx.fillRect(55, 1084, 970, 6);
  drawText(ctx, "BUILDER CLASS", 55, 1126, 300, "500 16px monospace");
  drawText(ctx, selectedTitle, 55, 1175, 830, "900 43px Impact, sans-serif");
  drawText(ctx, "GOA, INDIA", 55, 1204, 260, "500 18px monospace");
  drawText(ctx, "28—31 OCT", 540, 1204, 180, "500 18px monospace", "center");
  drawText(ctx, $("#member-id").textContent, 1025, 1204, 180, "500 18px monospace", "right");
  ctx.fillStyle = ink; ctx.fillRect(0, 1235, w, 115);
  ctx.fillStyle = acid; drawText(ctx, "FRAME IN GOA", 55, 1300, 600, "900 50px Impact, sans-serif");
  drawText(ctx, "#FrameInGoa", 1025, 1295, 250, "500 20px monospace", "right");
  drawStickers(ctx, w, h);
  drawQrBadge(ctx, w, h, ink, acid);
}

function renderFrameFormat(ctx, w, h, t) {
  const { bg: acid, ink, photoBg } = t;
  ctx.fillStyle = photoBg; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 - 60, r = 430;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = photoBg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (photoDataUrl && previewPhoto.naturalWidth) {
    ctx.filter = "grayscale(1) contrast(1.15)";
    drawCoverImage(ctx, previewPhoto, cx - r, cy - r, r * 2, r * 2);
    ctx.filter = "none";
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = acid; ctx.lineWidth = 26; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI * 2); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 13, 0, Math.PI * 2); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = ink; ctx.fillRect(0, h - 170, w, 170);
  ctx.fillStyle = acid;
  drawText(ctx, "FRAME IN GOA", w / 2, h - 95, 900, "900 60px Impact, sans-serif", "center");
  drawText(ctx, "GOA, INDIA · 28—31 OCT 2026 · #FrameInGoa", w / 2, h - 45, 900, "500 22px monospace", "center");
  drawStickers(ctx, w, h - 170);
  drawQrBadge(ctx, w, h, ink, acid);
}

function renderTeamFormat(ctx, w, h, t) {
  const { bg: acid, ink, photoBg } = t;
  ctx.fillStyle = acid; ctx.fillRect(0, 0, w, h);
  const members = [
    { dataUrl: photoDataUrl, image: previewPhoto, name: clean(nameInput.value, "YOU") },
    { dataUrl: teamMembers[1].dataUrl, image: teamMembers[1].image, name: clean(teamMembers[1].name, "TEAMMATE 1") },
    { dataUrl: teamMembers[2].dataUrl, image: teamMembers[2].image, name: clean(teamMembers[2].name, "TEAMMATE 2") },
  ].filter((m) => m.dataUrl);
  ctx.fillStyle = ink;
  drawText(ctx, "HH", 58, 80, 200, "900 70px Impact, sans-serif");
  drawText(ctx, "GOA", 58, 134, 200, "900 70px Impact, sans-serif");
  drawText(ctx, "TEAM ID / 2026", 1018, 90, 300, "500 24px monospace", "right");
  const slotW = 940 / Math.max(members.length, 1), top = 230, size = Math.min(slotW - 30, 420);
  members.forEach((member, i) => {
    const x = 70 + i * slotW + (slotW - size) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(x, top, size, size); ctx.clip();
    ctx.fillStyle = photoBg; ctx.fillRect(x, top, size, size);
    if (member.image && member.image.naturalWidth) {
      ctx.filter = "grayscale(1) contrast(1.15)";
      ctx.drawImage(member.image, x, top, size, size);
      ctx.filter = "none";
    }
    ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(x, top, size, size);
    drawText(ctx, member.name, x + size / 2, top + size + 46, size, "900 26px Impact, sans-serif", "center");
  });
  drawText(ctx, "BUILDER TEAM", 55, top + size + 130, 700, "500 20px monospace");
  drawText(ctx, clean(roleInput.value, "TEAM STACK"), 55, top + size + 175, 890, "900 48px Impact, sans-serif");
  ctx.fillRect(55, top + size + 205, 970, 6);
  ctx.fillStyle = ink; ctx.fillRect(0, 1235, w, 115);
  ctx.fillStyle = acid; drawText(ctx, "FRAME IN GOA", 55, 1300, 600, "900 50px Impact, sans-serif");
  drawText(ctx, "#FrameInGoa", 1025, 1295, 250, "500 20px monospace", "right");
  drawStickers(ctx, w, h);
  drawQrBadge(ctx, w, h, ink, acid);
}

function renderExport() {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const t = THEMES[currentTheme];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(16,16,15,.22)"; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  if (currentFormat === "frame") renderFrameFormat(ctx, w, h, t);
  else if (currentFormat === "team") renderTeamFormat(ctx, w, h, t);
  else renderCardFormat(ctx, w, h, t);

  return canvas.toDataURL("image/png");
}

$("#builder-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentFormat !== "team" && !photoDataUrl) { uploadZone.scrollIntoView({ behavior: "smooth", block: "center" }); uploadLabel.textContent = "PHOTO REQUIRED"; return; }
  if (currentFormat === "card" || currentFormat === "team") {
    if (!nameInput.value.trim()) { nameInput.focus(); return; }
  }
  renderQr(`${location.origin}${location.pathname}?ref=frame`);
  finalImageUrl = renderExport();
  downloadLink.href = finalImageUrl;
  downloadLink.download = `hh-goa-${safeFileName(nameInput.value)}-${currentFormat}.png`;
  outputSection.hidden = false;
  flipHint.hidden = false;
  outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

shareButton.addEventListener("click", async () => {
  if (!finalImageUrl) finalImageUrl = renderExport();
  const caption = `I just framed in for Hacker House Goa 2026. See you at the build station. #FrameInGoa`;
  try {
    const response = await fetch(finalImageUrl);
    const blob = await response.blob();
    const file = new File([blob], downloadLink.download || "hh-goa-builder-id.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: "My HH Goa Builder ID", text: caption, files: [file] });
      return;
    }
  } catch (error) { /* Continue to X intent below. */ }
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`, "_blank", "noopener,noreferrer");
});

$("#share-whatsapp").addEventListener("click", () => {
  const caption = `I just framed in for Hacker House Goa 2026. #FrameInGoa ${location.origin}${location.pathname}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener,noreferrer");
});
$("#share-linkedin").addEventListener("click", () => {
  const shareUrl = `${location.origin}${location.pathname}`;
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
});

applyTheme("acid");
updatePreview();
