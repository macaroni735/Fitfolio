
const video = document.getElementById("camera");
const mannequinGuide = document.getElementById("mannequin-guide");
const preview = document.getElementById("preview");
const placeholder = document.getElementById("placeholder");
const canvas = document.getElementById("canvas");
const status = document.getElementById("status");
const cameraFrame = document.getElementById("camera-frame");
const cameraGuideSlot = document.getElementById("camera-guide-slot");
const guideTools = document.getElementById("guide-tools");
const guideRotationInput = document.getElementById("guide-rotation");
const guideScaleInput = document.getElementById("guide-scale");
const guideRotationValue = document.getElementById("guide-rotation-value");
const guideScaleValue = document.getElementById("guide-scale-value");
const toggleGuideButton = document.getElementById("toggle-guide");
const resetGuideButton = document.getElementById("reset-guide");

const startButton = document.getElementById("start-camera");
const takeButton = document.getElementById("take-photo");
const retakeButton = document.getElementById("retake");
const uploadInput = document.getElementById("photo-upload");
const captureControls = document.querySelector(".capture-controls");
const backCaptureBanner = document.getElementById("back-capture-banner");
const backToDetailsButton = document.getElementById("back-to-details");
const flowBackButton = document.getElementById("flow-back");
const exitDetailsButton = document.getElementById("exit-details");
const wardrobeUrl = flowBackButton.dataset.wardrobeUrl;

const editorStep = document.getElementById("editor-step");
const processingStatus = document.getElementById("processing-status");
const editorError = document.getElementById("editor-error");
const editorWorkspace = document.getElementById("editor-workspace");
const processedPreview = document.getElementById("processed-preview");

const backToCaptureButton = document.getElementById("back-to-capture");
const retryProcessingButton = document.getElementById("retry-processing");
const continueButton = document.getElementById("continue-to-editor");

const cleanupStep = document.getElementById("cleanup-step");
const cleanupStatus = document.getElementById("cleanup-status");
const cleanupFrame = document.getElementById("cleanup-frame");
const cleanupCanvas = document.getElementById("cleanup-canvas");
const brushPreview = document.getElementById("brush-preview");
const brushSizeInput = document.getElementById("brush-size");
const brushSizeSwatch = document.getElementById("brush-size-swatch");
const backToProcessedButton = document.getElementById("back-to-processed");
const undoCleanupButton = document.getElementById("undo-cleanup");
const resetCleanupButton = document.getElementById("reset-cleanup");
const continueAfterCleanupButton = document.getElementById("continue-after-cleanup");

const positionStep = document.getElementById("position-step");
const positionStatus = document.getElementById("position-status");
const positionFrame = document.getElementById("position-frame");
const positionSlot = document.getElementById("position-slot");
const positionImage = document.getElementById("position-image");
const positionRotationInput = document.getElementById("position-rotation");
const positionScaleInput = document.getElementById("position-scale");
const rotationValue = document.getElementById("rotation-value");
const scaleValue = document.getElementById("scale-value");
const resetPositionButton = document.getElementById("reset-position");
const backToCleanupButton = document.getElementById("back-to-cleanup");
const continueAfterPositionButton = document.getElementById("continue-after-position");

const detailsStep = document.getElementById("details-step");
const detailsPreviewSlot = document.getElementById("details-preview-slot");
const detailsPreviewImage = document.getElementById("details-preview-image");
const editPositionButton = document.getElementById("edit-position");
const addBackButton = document.getElementById("add-back");
const detailsBackPreview = document.getElementById("details-back-preview");
const detailsBackSlot = document.getElementById("details-back-slot");
const detailsBackImage = document.getElementById("details-back-image");
const editBackButton = document.getElementById("edit-back");
const retakeBackButton = document.getElementById("retake-back");
const backPreviewActions = document.getElementById("back-preview-actions");
const addGalleryButton = document.getElementById("add-gallery");
const detailsGalleryPreview = document.getElementById("details-gallery-preview");
const detailsGalleryThumbs = document.getElementById("details-gallery-thumbs");
const detailsGalleryCount = document.getElementById("details-gallery-count");
const galleryStep = document.getElementById("gallery-step");
const galleryStatus = document.getElementById("gallery-status");
const galleryGrid = document.getElementById("gallery-grid");
const galleryBackButton = document.getElementById("gallery-back");
const galleryAddButton = document.getElementById("gallery-add");
const uploadButton = document.querySelector(".upload-button");
const clothingDetailsForm = document.getElementById("clothing-details-form");
const detailsError = document.getElementById("details-error");
const nameInput = document.getElementById("clothing-name");
const descriptionInput = document.getElementById("clothing-description");
const categorySelect = document.getElementById("clothing-category");
const articleTypeSelect = document.getElementById("clothing-article-type");
const sizeInput = document.getElementById("clothing-size");
const publishCheckbox = document.getElementById("clothing-publish");
const anonymousCheckbox = document.getElementById("clothing-anonymous");
const forSaleCheckbox = document.getElementById("clothing-for-sale");
const publishFields = document.getElementById("publish-fields");
const saleFields = document.getElementById("sale-fields");
const createClothingButton = document.getElementById("create-clothing");
const priceInput = document.getElementById("clothing-price");
const countInput = document.getElementById("clothing-count");
const stockInput = document.getElementById("clothing-stock");
const tagEditor = document.getElementById("tag-editor");
const tagList = document.getElementById("tag-list");
const tagInput = document.getElementById("clothing-tags");

const captureContainer = document.querySelector(".capture-container");
const csrfToken = document.querySelector("#csrf-form [name=csrfmiddlewaretoken]").value;
const processImageUrl = captureContainer.dataset.processUrl;
const createUrl = captureContainer.dataset.createUrl;

let stream = null;
let processingRequestId = 0;

// Held in the page until Create saves them.
const clothingImages = {
    original: null,
    processed: null,
    final: null,
};

// Placement is stored in mannequin-frame space, not screen pixels:
// x, y: image center as a fraction of the frame (0–1)
// rotation: degrees clockwise
// scale: 1 fits the image inside the mannequin guide box
const DEFAULT_CLOTHING_TRANSFORM = {
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
};
const clothingTransform = { ...DEFAULT_CLOTHING_TRANSFORM };

function createSideState() {
    return {
        images: { original: null, processed: null, final: null },
        urls: { original: null, processed: null, final: null },
        transform: { ...DEFAULT_CLOTHING_TRANSFORM },
    };
}

const sideState = {
    front: createSideState(),
    back: createSideState(),
};
let captureSide = "front";
let committedBack = null;
let captureMode = "item";
const MAX_GALLERY_PHOTOS = 12;
const galleryPhotos = [];
let galleryDraftBlob = null;
let galleryDraftUrl = null;
let openGalleryGridAfterCapture = false;
let hasReachedDetails = false;
let flowBackAction = null;
const GALLERY_PREVIEW_COUNT = 4;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]);
const MAX_IMAGE_DIMENSION = 1600;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const DEFAULT_GUIDE_TRANSFORM = {
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
};
const guideTransform = { ...DEFAULT_GUIDE_TRANSFORM };
let guideVisible = true;
let isMovingGuide = false;
let guideDragOffsetX = 0;
let guideDragOffsetY = 0;

const clothingTags = [];

captureContainer.clothingImages = clothingImages;
captureContainer.clothingTransform = clothingTransform;
captureContainer.clothingTags = clothingTags;

const imagePreviewUrls = {
    original: null,
    processed: null,
    final: null,
};

function cloneSide(side) {
    return {
        images: { ...side.images },
        urls: { ...side.urls },
        transform: { ...side.transform },
    };
}

function rememberCommittedBack() {
    if (sideState.back.urls.final) {
        committedBack = cloneSide(sideState.back);
    }
}

function urlIsKept(url) {
    if (!url) {
        return false;
    }

    const sources = [sideState.front, sideState.back];
    if (committedBack) {
        sources.push(committedBack);
    }

    return sources.some(side =>
        side.urls.original === url ||
        side.urls.processed === url ||
        side.urls.final === url
    );
}

function persistActiveSide() {
    const side = sideState[captureSide];
    side.images.original = clothingImages.original;
    side.images.processed = clothingImages.processed;
    side.images.final = clothingImages.final;
    side.urls.original = imagePreviewUrls.original;
    side.urls.processed = imagePreviewUrls.processed;
    side.urls.final = imagePreviewUrls.final;
    side.transform = { ...clothingTransform };
}

function applyLiveFrom(sideName) {
    const side = sideState[sideName];
    clothingImages.original = side.images.original;
    clothingImages.processed = side.images.processed;
    clothingImages.final = side.images.final;
    imagePreviewUrls.original = side.urls.original;
    imagePreviewUrls.processed = side.urls.processed;
    imagePreviewUrls.final = side.urls.final;
    Object.assign(clothingTransform, side.transform);
}

function activateSide(sideName) {
    persistActiveSide();
    if (captureSide === sideName) {
        return;
    }

    captureSide = sideName;
    applyLiveFrom(sideName);
}

function capturingBack() {
    return captureMode === "item" && captureSide === "back";
}

function capturingGalleryPhotos() {
    return captureMode === "gallery";
}

function capturePromptKind() {
    if (capturingGalleryPhotos()) {
        return "gallery";
    }
    if (capturingBack()) {
        return "back";
    }
    return "front";
}

function setGalleryDraft(blob) {
    if (galleryDraftUrl && !galleryPhotos.some(photo => photo.url === galleryDraftUrl)) {
        URL.revokeObjectURL(galleryDraftUrl);
    }

    galleryDraftBlob = blob;
    galleryDraftUrl = blob ? URL.createObjectURL(blob) : null;
}

function clearGalleryDraft() {
    setGalleryDraft(null);
}

function addGalleryPhoto(blob) {
    if (!blob || galleryPhotos.length >= MAX_GALLERY_PHOTOS) {
        return;
    }

    galleryPhotos.push({
        blob,
        url: URL.createObjectURL(blob),
    });
}

function commitGalleryDraft() {
    if (!galleryDraftBlob) {
        status.textContent = "Take or upload a photo first.";
        return;
    }

    if (galleryPhotos.length >= MAX_GALLERY_PHOTOS) {
        status.textContent = `You can add up to ${MAX_GALLERY_PHOTOS} extra photos.`;
        return;
    }

    galleryPhotos.push({
        blob: galleryDraftBlob,
        url: galleryDraftUrl,
    });
    galleryDraftBlob = null;
    galleryDraftUrl = null;
    finishGalleryCapture();
}

function finishGalleryCapture() {
    captureMode = "item";
    hideCaptureChrome();
    if (openGalleryGridAfterCapture && galleryPhotos.length) {
        showGalleryStep();
        return;
    }
    showDetailsStep();
}

function removeGalleryPhoto(index) {
    const [photo] = galleryPhotos.splice(index, 1);
    if (photo?.url) {
        URL.revokeObjectURL(photo.url);
    }

    if (!galleryPhotos.length) {
        showDetailsStep();
        return;
    }

    renderGalleryGrid();
    updateGalleryPreview();
}

function updateGalleryPreview() {
    const hasPhotos = galleryPhotos.length > 0;
    addGalleryButton.hidden = hasPhotos;
    detailsGalleryPreview.hidden = !hasPhotos;

    detailsGalleryThumbs.replaceChildren();
    if (!hasPhotos) {
        detailsGalleryCount.hidden = true;
        return;
    }

    const thumbs = galleryPhotos.slice(0, GALLERY_PREVIEW_COUNT);
    thumbs.forEach(photo => {
        const image = document.createElement("img");
        image.src = photo.url;
        image.alt = "";
        image.draggable = false;
        detailsGalleryThumbs.append(image);
    });
    detailsGalleryThumbs.dataset.count = String(thumbs.length);

    detailsGalleryCount.textContent = String(galleryPhotos.length);
    detailsGalleryCount.hidden = galleryPhotos.length < 5;
}

function renderGalleryGrid() {
    galleryGrid.replaceChildren();

    galleryPhotos.forEach((photo, index) => {
        const tile = document.createElement("div");
        tile.className = "gallery-tile";

        const image = document.createElement("img");
        image.src = photo.url;
        image.alt = `Gallery photo ${index + 1}`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "gallery-remove";
        removeButton.setAttribute("aria-label", `Remove photo ${index + 1}`);
        removeButton.textContent = "X";
        removeButton.addEventListener("click", event => {
            event.stopPropagation();
            removeGalleryPhoto(index);
        });

        tile.append(image, removeButton);
        galleryGrid.append(tile);
    });

    if (galleryPhotos.length < MAX_GALLERY_PHOTOS) {
        const addTile = document.createElement("button");
        addTile.type = "button";
        addTile.className = "gallery-add-tile";
        const addIcon = document.createElement("span");
        addIcon.className = "details-back-prompt-icon";
        addIcon.setAttribute("aria-hidden", "true");
        addIcon.textContent = "+";
        const addLabel = document.createElement("span");
        addLabel.textContent = "Add";
        addTile.append(addIcon, addLabel);
        addTile.addEventListener("click", () => {
            startGalleryCapture({ fromGrid: true });
        });
        galleryGrid.append(addTile);
    }
}

function showGalleryStep() {
    persistActiveSide();
    captureMode = "item";
    editorStep.hidden = true;
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    detailsStep.hidden = true;
    hideCaptureChrome();
    galleryStep.hidden = false;
    galleryStatus.textContent = "Extra photos of this item.";
    renderGalleryGrid();
    updateSideUi();
}

function hideCaptureChrome() {
    stopCamera();
    hideGuideTools();
    cameraFrame.hidden = true;
    captureControls.hidden = true;
    status.hidden = true;
}

function showCaptureChrome() {
    cameraFrame.hidden = false;
    captureControls.hidden = false;
    status.hidden = false;
}

function updateSideUi() {
    const onDetails = !detailsStep.hidden;
    const onCapture =
        detailsStep.hidden &&
        editorStep.hidden &&
        cleanupStep.hidden &&
        positionStep.hidden &&
        galleryStep.hidden;
    const extraCapture = capturingBack() || capturingGalleryPhotos();

    if (capturingGalleryPhotos()) {
        backCaptureBanner.textContent = "Add extra photos of this item.";
        continueButton.textContent = "Add photo";
        uploadButton.textContent = "Upload Photos";
        uploadInput.multiple = true;
    } else {
        backCaptureBanner.textContent = "Adding the back of this item.";
        continueButton.textContent = "Next";
        uploadButton.textContent = "Upload Photo";
        uploadInput.multiple = false;
    }

    backCaptureBanner.hidden = !(extraCapture && !onDetails);
    backToDetailsButton.hidden = true;
    updateFlowNav();
}

function goToWardrobe() {
    window.location.href = wardrobeUrl;
}

function updateFlowNav() {
    const onDetails = !detailsStep.hidden;
    exitDetailsButton.hidden = !onDetails;
    flowBackButton.hidden = onDetails;

    if (onDetails) {
        flowBackAction = null;
        return;
    }

    if (!editorStep.hidden) {
        flowBackButton.textContent = "← Photo";
        flowBackAction = showCaptureStep;
        return;
    }

    if (!cleanupStep.hidden) {
        flowBackButton.textContent = "← Photo";
        flowBackAction = showCaptureFromCleanup;
        return;
    }

    if (!positionStep.hidden) {
        flowBackButton.textContent = "← Cleanup";
        flowBackAction = showCleanupFromPosition;
        return;
    }

    if (!galleryStep.hidden) {
        flowBackButton.textContent = "← Details";
        flowBackAction = showDetailsStep;
        return;
    }

    if (capturingGalleryPhotos()) {
        flowBackButton.textContent = openGalleryGridAfterCapture
            ? "← Gallery"
            : "← Details";
        flowBackAction = cancelCaptureToDetails;
        return;
    }

    if (capturingBack() || hasReachedDetails) {
        flowBackButton.textContent = "← Details";
        flowBackAction = capturingBack() ? cancelCaptureToDetails : showDetailsStep;
        return;
    }

    flowBackButton.textContent = "← My Wardrobe";
    flowBackAction = goToWardrobe;
}

function cleanupPrompt() {
    return capturingBack()
        ? "Erase leftover background or extra details from the back."
        : "Erase any leftover background or extra details.";
}

function positionPrompt() {
    return capturingBack()
        ? "Line the back of the clothing up with the mannequin. Drag to move, then adjust rotation and scale."
        : "Line the clothing up with the mannequin. Drag to move, then adjust rotation and scale.";
}

function resetCaptureUiForNewPhoto() {
    stopCamera();
    preview.removeAttribute("src");
    preview.hidden = true;
    video.hidden = true;
    placeholder.hidden = false;
    const kind = capturePromptKind();
    placeholder.textContent =
        kind === "gallery"
            ? "A gallery photo will appear here."
            : kind === "back"
                ? "A photo of the back of this item will appear here."
                : "Your camera preview will appear here.";
    retakeButton.hidden = true;
    takeButton.hidden = true;
    continueButton.hidden = true;
    startButton.hidden = false;
    uploadInput.value = "";
    showCaptureChrome();
    status.textContent =
        kind === "gallery"
            ? "Take a photo for the gallery, or upload one."
            : kind === "back"
                ? "Take a photo of the back of this item, or upload one."
                : "Choose camera or upload a photo.";
    showGuideTools();
}

function replaceImage(role, blob) {
    const previousUrl = imagePreviewUrls[role];

    clothingImages[role] = blob;
    imagePreviewUrls[role] = blob ? URL.createObjectURL(blob) : null;

    if (previousUrl && previousUrl !== imagePreviewUrls[role] && !urlIsKept(previousUrl)) {
        URL.revokeObjectURL(previousUrl);
    }

    return imagePreviewUrls[role];
}

function clearProcessedImages() {
    replaceImage("processed", null);
    replaceImage("final", null);
}

function resetClothingTransform() {
    clothingTransform.x = DEFAULT_CLOTHING_TRANSFORM.x;
    clothingTransform.y = DEFAULT_CLOTHING_TRANSFORM.y;
    clothingTransform.rotation = DEFAULT_CLOTHING_TRANSFORM.rotation;
    clothingTransform.scale = DEFAULT_CLOTHING_TRANSFORM.scale;
}

function isAllowedImageFile(file) {
    const type = (file.type || "").toLowerCase();
    if (ALLOWED_IMAGE_TYPES.has(type)) {
        return true;
    }

    if (type && !type.startsWith("image/")) {
        return false;
    }

    return /\.(jpe?g|png|webp)$/i.test(file.name || "");
}

function loadImageElement(blob) {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;

    return image.decode().then(() => {
        URL.revokeObjectURL(url);
        return image;
    }).catch(error => {
        URL.revokeObjectURL(url);
        throw error;
    });
}

function canvasToBlob(sourceCanvas, type, quality) {
    return new Promise((resolve, reject) => {
        sourceCanvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
                return;
            }
            reject(new Error("Couldn't process the image. Please try another photo."));
        }, type, quality);
    });
}

async function prepareImageFile(file) {
    if (!file) {
        throw new Error("Please choose an image file.");
    }

    if (!isAllowedImageFile(file)) {
        throw new Error("Please upload a JPEG, PNG, or WebP image.");
    }

    let image;
    try {
        image = await loadImageElement(file);
    } catch {
        throw new Error("Please upload a valid image.");
    }

    const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = maxSide > MAX_IMAGE_DIMENSION
        ? MAX_IMAGE_DIMENSION / maxSide
        : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const type = (file.type || "").toLowerCase();
    const needsResize = scale < 1;
    const tooHeavy = file.size > MAX_IMAGE_BYTES;

    if (!needsResize && !tooHeavy) {
        return file;
    }

    const drawCanvas = document.createElement("canvas");
    drawCanvas.width = width;
    drawCanvas.height = height;
    drawCanvas.getContext("2d").drawImage(image, 0, 0, width, height);

    const preferPng = type === "image/png" || type === "image/webp" || !type;
    let blob = await canvasToBlob(
        drawCanvas,
        preferPng ? "image/png" : "image/jpeg",
        0.92,
    );

    if (blob.size > MAX_IMAGE_BYTES) {
        for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
            blob = await canvasToBlob(drawCanvas, "image/jpeg", quality);
            if (blob.size <= MAX_IMAGE_BYTES) {
                break;
            }
        }
    }

    if (blob.size > MAX_IMAGE_BYTES) {
        throw new Error(
            "That image is still too large after resizing. Please try a smaller photo.",
        );
    }

    const extension = blob.type === "image/png" ? "png" : "jpg";
    const baseName = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}

function setOriginalImage(blob) {
    replaceImage("original", blob);
    clearProcessedImages();
    resetClothingTransform();
}

function setProcessedImage(blob) {
    replaceImage("processed", blob);
    // Adjustments have not happened yet, so the final image starts here.
    replaceImage("final", blob);
}

function setFinalImage(blob) {
    const previewUrl = replaceImage("final", blob);

    if (previewUrl) {
        processedPreview.src = previewUrl;
        processedPreview.alt = "Adjusted clothing image";
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    video.srcObject = null;
    takeButton.hidden = true;
}

function showPreview(imageUrl) {
    preview.src = imageUrl;
    preview.hidden = false;
    video.hidden = true;
    placeholder.hidden = true;

    retakeButton.hidden = false;
    takeButton.hidden = true;
    startButton.hidden = true;
    continueButton.hidden = false;

    const kind = capturePromptKind();
    status.textContent =
        kind === "gallery"
            ? "Photo ready to add. You can retake or upload another image."
            : kind === "back"
                ? "Back photo ready for the next step. You can retake or upload another image."
                : "Photo ready for the next step. You can retake or upload another image.";

    showGuideTools();
    stopCamera();
}

startButton.addEventListener("click", async () => {
    cameraFrame.hidden = false;
    showGuideTools();
    if (!navigator.mediaDevices?.getUserMedia) {
        status.textContent =
            "Camera access is unavailable here. Please upload a photo instead.";
        return;
    }

    try {
        stopCamera();

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        video.srcObject = stream;
        video.hidden = false;
        preview.hidden = true;
        placeholder.hidden = true;

        takeButton.hidden = false;
        takeButton.disabled = false;
        retakeButton.hidden = true;
        startButton.hidden = true;
        continueButton.hidden = true;

        const kind = capturePromptKind();
        status.textContent =
            kind === "gallery"
                ? "Take a photo for the gallery."
                : kind === "back"
                    ? "Position the back of the clothing item in view, then take a photo. You can readjust later."
                    : "Position the clothing item in view, then take a photo. You can readjust later.";
        showGuideTools();
    } catch (error) {
        status.textContent =
            "Couldn't access the camera. Check browser permissions or upload a photo.";
    }
});

takeButton.addEventListener("click", () => {
    if (!video.videoWidth || !video.videoHeight) {
        status.textContent = "The camera is not ready yet. Try again in a moment.";
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async blob => {
        if (!blob) {
            status.textContent = "Couldn't capture the image. Please try again.";
            return;
        }

        try {
            const prepared = await prepareImageFile(blob);
            if (capturingGalleryPhotos()) {
                setGalleryDraft(prepared);
                showPreview(galleryDraftUrl);
                return;
            }

            setOriginalImage(prepared);
            showPreview(imagePreviewUrls.original);
        } catch (error) {
            status.textContent = error.message ||
                "Couldn't capture the image. Please try again.";
        }
    }, "image/png");
});

uploadInput.addEventListener("change", async () => {
    const files = [...uploadInput.files];
    if (!files.length) {
        return;
    }

    const images = files.filter(isAllowedImageFile);
    if (!images.length) {
        status.textContent = "Please upload a JPEG, PNG, or WebP image.";
        uploadInput.value = "";
        return;
    }

    try {
        if (capturingGalleryPhotos() && images.length > 1) {
            const remaining = MAX_GALLERY_PHOTOS - galleryPhotos.length;
            for (const file of images.slice(0, remaining)) {
                addGalleryPhoto(await prepareImageFile(file));
            }
            uploadInput.value = "";
            finishGalleryCapture();
            return;
        }

        const prepared = await prepareImageFile(images[0]);
        if (capturingGalleryPhotos()) {
            setGalleryDraft(prepared);
            cameraFrame.hidden = false;
            showPreview(galleryDraftUrl);
            uploadInput.value = "";
            return;
        }

        setOriginalImage(prepared);
        cameraFrame.hidden = false;
        showPreview(imagePreviewUrls.original);
        uploadInput.value = "";
    } catch (error) {
        status.textContent = error.message || "Please upload a valid image.";
        uploadInput.value = "";
    }
});

retakeButton.addEventListener("click", async () => {
    if (capturingGalleryPhotos()) {
        clearGalleryDraft();
    } else {
        setOriginalImage(null);
    }

    preview.removeAttribute("src");
    preview.hidden = true;
    uploadInput.value = "";

    retakeButton.hidden = true;
    takeButton.hidden = true;
    startButton.hidden = false;

    status.textContent = "Reopening camera...";

    startButton.click();
});

window.addEventListener("pagehide", stopCamera);

function resetGuideTransform() {
    guideTransform.x = DEFAULT_GUIDE_TRANSFORM.x;
    guideTransform.y = DEFAULT_GUIDE_TRANSFORM.y;
    guideTransform.rotation = DEFAULT_GUIDE_TRANSFORM.rotation;
    guideTransform.scale = DEFAULT_GUIDE_TRANSFORM.scale;
}

function applyGuideTransform() {
    applySlotTransform(cameraGuideSlot, guideTransform);
}

function syncGuideControls() {
    guideRotationInput.value = String(Math.round(guideTransform.rotation));
    guideScaleInput.value = String(Math.round(guideTransform.scale * 100));
    guideRotationValue.textContent = `${Math.round(guideTransform.rotation)}°`;
    guideScaleValue.textContent = `${Math.round(guideTransform.scale * 100)}%`;
}

function applyGuideVisibility() {
    cameraGuideSlot.hidden = !guideVisible;
    toggleGuideButton.textContent = guideVisible ? "Hide Guide" : "Show Guide";
}

function showGuideTools() {
    if (capturingGalleryPhotos()) {
        hideGuideTools();
        cameraGuideSlot.hidden = true;
        return;
    }

    guideTools.hidden = false;
    applyGuideVisibility();
    applyGuideTransform();
    syncGuideControls();
}

function hideGuideTools() {
    isMovingGuide = false;
    guideTools.hidden = true;
}

cameraGuideSlot.addEventListener("pointerdown", event => {
    if (!guideVisible || event.button) {
        return;
    }

    event.preventDefault();
    cameraGuideSlot.setPointerCapture(event.pointerId);
    isMovingGuide = true;

    const frameRect = cameraFrame.getBoundingClientRect();
    guideDragOffsetX =
        event.clientX - (frameRect.left + guideTransform.x * frameRect.width);
    guideDragOffsetY =
        event.clientY - (frameRect.top + guideTransform.y * frameRect.height);
});

cameraGuideSlot.addEventListener("pointermove", event => {
    if (!isMovingGuide) {
        return;
    }

    const frameRect = cameraFrame.getBoundingClientRect();
    guideTransform.x = roundTransform(clamp(
        (event.clientX - guideDragOffsetX - frameRect.left) / frameRect.width,
        -0.25,
        1.25,
    ));
    guideTransform.y = roundTransform(clamp(
        (event.clientY - guideDragOffsetY - frameRect.top) / frameRect.height,
        -0.25,
        1.25,
    ));
    applyGuideTransform();
});

function stopMovingGuide() {
    isMovingGuide = false;
}

cameraGuideSlot.addEventListener("pointerup", stopMovingGuide);
cameraGuideSlot.addEventListener("pointercancel", stopMovingGuide);

cameraFrame.addEventListener("wheel", event => {
    if (capturingGalleryPhotos()) {
        return;
    }

    event.preventDefault();
    guideTransform.scale = clamp(guideTransform.scale + (event.deltaY > 0 ? -0.05 : 0.05), 0.2, 2.5);
    applyGuideTransform();
    syncGuideControls();
}, { passive: false });

guideRotationInput.addEventListener("input", () => {
    guideTransform.rotation = Number(guideRotationInput.value);
    applyGuideTransform();
    syncGuideControls();
});

guideScaleInput.addEventListener("input", () => {
    guideTransform.scale = Number(guideScaleInput.value) / 100;
    applyGuideTransform();
    syncGuideControls();
});

toggleGuideButton.addEventListener("click", () => {
    guideVisible = !guideVisible;
    applyGuideVisibility();
});

resetGuideButton.addEventListener("click", () => {
    guideVisible = true;
    resetGuideTransform();
    applyGuideVisibility();
    applyGuideTransform();
    syncGuideControls();
});


// Background removal

function showEditorStep() {
    if (capturingGalleryPhotos()) {
        commitGalleryDraft();
        return;
    }

    hideCaptureChrome();
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    detailsStep.hidden = true;
    galleryStep.hidden = true;

    editorStep.hidden = false;
    editorError.hidden = true;
    retryProcessingButton.hidden = true;

    processedPreview.src = imagePreviewUrls.original;
    processedPreview.alt = capturingBack()
        ? "Original back photo"
        : "Original clothing photo";
    editorWorkspace.hidden = false;
    updateSideUi();

    processCapturedImage();
}

function showCaptureStep() {
    processingRequestId += 1;

    detailsStep.hidden = true;
    positionStep.hidden = true;
    cleanupStep.hidden = true;
    editorStep.hidden = true;
    galleryStep.hidden = true;
    showCaptureChrome();
    showGuideTools();

    if (imagePreviewUrls.original) {
        showPreview(imagePreviewUrls.original);
    }

    updateSideUi();
}

async function processCapturedImage() {
    const requestId = ++processingRequestId;

    if (!clothingImages.original) {
        editorError.textContent = "Please capture or upload a photo first.";
        editorError.hidden = false;
        return;
    }

    retryProcessingButton.hidden = true;
    editorError.hidden = true;
    processingStatus.hidden = false;

    try {
        const formData = new FormData();
        formData.append(
            "image",
            clothingImages.original,
            clothingImages.original.name || "original.png",
        );

        const response = await fetch(
            processImageUrl,
            {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken,
                },
                body: formData,
                credentials: "same-origin",
            }
        );

        if (requestId !== processingRequestId) {
            return;
        }

        if (!response.ok) {
            let message = "Image processing failed. Please try again.";

            try {
                const errorData = await response.json();
                message = errorData.error || message;
            } catch {
                // Keep the default message if the response isn't JSON.
            }

            throw new Error(message);
        }

        const processedBlob = await response.blob();

        if (requestId !== processingRequestId) {
            return;
        }

        if (!processedBlob.type.includes("image/png")) {
            throw new Error("The server returned an unexpected image format.");
        }

        setProcessedImage(processedBlob);
        processedPreview.src = imagePreviewUrls.processed;
        processedPreview.alt = "Clothing image with background removed";
        processingStatus.hidden = true;
        await showCleanupStep();
    } catch (error) {
        if (requestId !== processingRequestId) {
            return;
        }

        processingStatus.hidden = true;
        editorError.textContent = error.message ||
            "Something went wrong while processing the image.";
        editorError.hidden = false;
        retryProcessingButton.hidden = false;
    }
}

retryProcessingButton.addEventListener("click", processCapturedImage);

backToCaptureButton.addEventListener("click", showCaptureStep);

function continueFromCapture() {
    if (capturingGalleryPhotos()) {
        commitGalleryDraft();
        return;
    }

    showEditorStep();
}

continueButton.addEventListener("click", continueFromCapture);


// Manual cleanup

const cleanupContext = cleanupCanvas.getContext("2d", { willReadFrequently: true });
const cleanupUndoStack = [];
const MAX_CLEANUP_UNDOS = 20;

let isErasing = false;
let lastErasePoint = null;
let cleanupReady = false;
let loadedProcessedUrl = null;

function getCleanupPoint(event) {
    const rect = cleanupCanvas.getBoundingClientRect();
    const scaleX = cleanupCanvas.width / rect.width;
    const scaleY = cleanupCanvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
        scale: (scaleX + scaleY) / 2,
    };
}

function getBrushDisplaySize() {
    return Number(brushSizeInput.value);
}

function updateBrushPreviewSize() {
    const size = `${getBrushDisplaySize()}px`;
    brushPreview.style.width = size;
    brushPreview.style.height = size;
    brushSizeSwatch.style.width = size;
    brushSizeSwatch.style.height = size;
}

function showBrushPreview(event) {
    if (!cleanupReady) {
        return;
    }

    const canvasRect = cleanupCanvas.getBoundingClientRect();
    const frameRect = cleanupFrame.getBoundingClientRect();
    const overCanvas =
        event.clientX >= canvasRect.left &&
        event.clientX <= canvasRect.right &&
        event.clientY >= canvasRect.top &&
        event.clientY <= canvasRect.bottom;

    if (!overCanvas && !isErasing) {
        hideBrushPreview();
        return;
    }

    updateBrushPreviewSize();
    brushPreview.style.left = `${event.clientX - frameRect.left}px`;
    brushPreview.style.top = `${event.clientY - frameRect.top}px`;
    brushPreview.hidden = false;
}

function hideBrushPreview() {
    if (!isErasing) {
        brushPreview.hidden = true;
    }
}

function updateCleanupUndoButton() {
    undoCleanupButton.disabled = cleanupUndoStack.length === 0;
}

function pushCleanupUndo() {
    cleanupUndoStack.push(
        cleanupContext.getImageData(
            0,
            0,
            cleanupCanvas.width,
            cleanupCanvas.height,
        ),
    );

    if (cleanupUndoStack.length > MAX_CLEANUP_UNDOS) {
        cleanupUndoStack.shift();
    }

    updateCleanupUndoButton();
}

function eraseCleanup(point, fromPoint) {
    const brushSize = Number(brushSizeInput.value) * point.scale;

    cleanupContext.save();
    cleanupContext.globalCompositeOperation = "destination-out";
    cleanupContext.lineCap = "round";
    cleanupContext.lineJoin = "round";
    cleanupContext.lineWidth = brushSize;
    cleanupContext.beginPath();

    if (fromPoint) {
        cleanupContext.moveTo(fromPoint.x, fromPoint.y);
        cleanupContext.lineTo(point.x, point.y);
    } else {
        cleanupContext.moveTo(point.x, point.y);
        cleanupContext.lineTo(point.x + 0.01, point.y);
    }

    cleanupContext.stroke();
    cleanupContext.restore();
}

async function loadCleanupCanvas() {
    if (!imagePreviewUrls.processed) {
        throw new Error("The processed image is not ready yet.");
    }

    const image = new Image();
    image.src = imagePreviewUrls.processed;
    await image.decode();

    cleanupCanvas.width = image.naturalWidth;
    cleanupCanvas.height = image.naturalHeight;
    cleanupContext.clearRect(0, 0, cleanupCanvas.width, cleanupCanvas.height);
    cleanupContext.drawImage(image, 0, 0);

    cleanupUndoStack.length = 0;
    updateCleanupUndoButton();
    cleanupReady = true;
    loadedProcessedUrl = imagePreviewUrls.processed;
}

async function showCleanupStep() {
    if (!clothingImages.processed) {
        editorError.textContent = "Please wait for background removal to finish.";
        editorError.hidden = false;
        return;
    }

    detailsStep.hidden = true;
    positionStep.hidden = true;
    editorStep.hidden = true;
    galleryStep.hidden = true;
    cleanupStep.hidden = false;
    updateSideUi();

    if (cleanupReady && loadedProcessedUrl === imagePreviewUrls.processed) {
        cleanupStatus.textContent = cleanupPrompt();
        return;
    }

    cleanupReady = false;
    cleanupStatus.textContent = cleanupPrompt();

    try {
        await loadCleanupCanvas();
    } catch (error) {
        cleanupStatus.textContent = error.message ||
            "Couldn't open the image editor. Please go back and try again.";
    }
}

function showCaptureFromCleanup() {
    isErasing = false;
    lastErasePoint = null;
    hideBrushPreview();
    showCaptureStep();
}

function undoCleanup() {
    const previous = cleanupUndoStack.pop();
    if (!previous) {
        return;
    }

    cleanupContext.putImageData(previous, 0, 0);
    updateCleanupUndoButton();
}

async function resetCleanup() {
    try {
        await loadCleanupCanvas();
        cleanupStatus.textContent = cleanupPrompt();
    } catch (error) {
        cleanupStatus.textContent = error.message ||
            "Couldn't reset the image. Please go back and try again.";
    }
}

function cropCanvasToOpaqueBounds(sourceCanvas) {
    const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = sourceCanvas;
    const { data } = context.getImageData(0, 0, width, height);
    const alphaThreshold = 16;
    const padding = 2;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let index = 3; index < data.length; index += 4) {
        if (data[index] <= alphaThreshold) {
            continue;
        }

        const pixel = (index - 3) / 4;
        const x = pixel % width;
        const y = (pixel - x) / width;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    if (maxX < minX || maxY < minY) {
        return sourceCanvas;
    }

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    if (cropWidth === width && cropHeight === height) {
        return sourceCanvas;
    }

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    croppedCanvas.getContext("2d").drawImage(
        sourceCanvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
    );

    return croppedCanvas;
}

function saveCleanupImage() {
    return new Promise((resolve, reject) => {
        if (!cleanupReady) {
            reject(new Error("The editor is still loading. Please wait a moment."));
            return;
        }

        cropCanvasToOpaqueBounds(cleanupCanvas).toBlob(blob => {
            if (!blob) {
                reject(new Error("Couldn't save the edited image. Please try again."));
                return;
            }

            setFinalImage(blob);
            resolve(blob);
        }, "image/png");
    });
}

cleanupCanvas.addEventListener("pointerdown", event => {
    if (!cleanupReady || event.button) {
        return;
    }

    event.preventDefault();
    cleanupCanvas.setPointerCapture(event.pointerId);
    pushCleanupUndo();
    isErasing = true;
    lastErasePoint = getCleanupPoint(event);
    showBrushPreview(event);
    eraseCleanup(lastErasePoint, null);
});

cleanupCanvas.addEventListener("pointermove", event => {
    showBrushPreview(event);

    if (!isErasing) {
        return;
    }

    const point = getCleanupPoint(event);
    eraseCleanup(point, lastErasePoint);
    lastErasePoint = point;
});

function stopErasing(event) {
    isErasing = false;
    lastErasePoint = null;

    if (event) {
        showBrushPreview(event);
    } else {
        hideBrushPreview();
    }
}

cleanupCanvas.addEventListener("pointerup", stopErasing);
cleanupCanvas.addEventListener("pointercancel", event => {
    isErasing = false;
    lastErasePoint = null;
    hideBrushPreview();
});
cleanupCanvas.addEventListener("pointerenter", showBrushPreview);
cleanupCanvas.addEventListener("pointerleave", hideBrushPreview);
brushSizeInput.addEventListener("input", updateBrushPreviewSize);

backToProcessedButton.addEventListener("click", showCaptureFromCleanup);
undoCleanupButton.addEventListener("click", undoCleanup);
resetCleanupButton.addEventListener("click", resetCleanup);
continueAfterCleanupButton.addEventListener("click", async () => {
    try {
        await saveCleanupImage();
        showPositionStep();
    } catch (error) {
        cleanupStatus.textContent = error.message ||
            "Couldn't save the edited image. Please try again.";
    }
});
updateCleanupUndoButton();
updateBrushPreviewSize();


// Image placement

let isPositioning = false;
let positionDragOffsetX = 0;
let positionDragOffsetY = 0;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundTransform(value) {
    return Math.round(value * 10000) / 10000;
}

const MANNEQUIN_SLOT_WIDTH = 0.7;
const MANNEQUIN_SLOT_HEIGHT = 0.9;

function applySlotTransform(slot, transform) {
    const shiftX =
        ((transform.x - 0.5) / MANNEQUIN_SLOT_WIDTH) * 100;
    const shiftY =
        ((transform.y - 0.5) / MANNEQUIN_SLOT_HEIGHT) * 100;

    slot.style.transform =
        `translate(${shiftX}%, ${shiftY}%) rotate(${transform.rotation}deg) scale(${transform.scale})`;
}

function applyClothingTransform(slot) {
    applySlotTransform(slot, clothingTransform);
}

function applyPositionTransform() {
    applyClothingTransform(positionSlot);
}

function syncPositionControls() {
    positionRotationInput.value = String(Math.round(clothingTransform.rotation));
    positionScaleInput.value = String(Math.round(clothingTransform.scale * 100));
    rotationValue.textContent = `${Math.round(clothingTransform.rotation)}°`;
    scaleValue.textContent = `${Math.round(clothingTransform.scale * 100)}%`;
}

function showPositionStep() {
    if (!imagePreviewUrls.final) {
        cleanupStatus.textContent = "Please finish editing the image first.";
        return;
    }

    detailsStep.hidden = true;
    cleanupStep.hidden = true;
    galleryStep.hidden = true;
    positionStep.hidden = false;
    positionStatus.textContent = positionPrompt();
    positionImage.src = imagePreviewUrls.final;
    applyPositionTransform();
    syncPositionControls();
    updateSideUi();
}

function showCleanupFromPosition() {
    isPositioning = false;
    showCleanupStep();
}

function parseCountValue(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 1;
    }

    return parsed;
}

function formatPriceInput() {
    const parsed = Number.parseFloat(priceInput.value);
    const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    priceInput.value = amount.toFixed(2);
}

function currentCount() {
    const parsed = Number.parseInt(countInput.value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 1;
    }

    return parsed;
}

function formatCountInput() {
    countInput.value = String(parseCountValue(countInput.value));
    syncStockLimit();
}

function syncStockLimit() {
    const count = currentCount();
    stockInput.max = String(count);

    if (stockInput.value === "") {
        return;
    }

    const parsedStock = Number.parseInt(stockInput.value, 10);
    let stock = Number.isFinite(parsedStock) ? parsedStock : 1;
    stock = Math.min(Math.max(stock, 0), count);

    if (String(stock) !== stockInput.value) {
        stockInput.value = String(stock);
    }
}

function formatStockInput() {
    if (stockInput.value === "") {
        stockInput.value = "1";
    }

    syncStockLimit();
}

function updateDetailsVisibility() {
    const published = publishCheckbox.checked;
    const forSale = published && forSaleCheckbox.checked;

    publishFields.hidden = !published;
    saleFields.hidden = !forSale;

    if (forSale) {
        formatPriceInput();
        syncStockLimit();
    }
}

function updateBackPreview() {
    const back = sideState.back;
    const hasBack = Boolean(back.urls.final);

    addBackButton.hidden = hasBack;
    detailsBackPreview.hidden = !hasBack;
    backPreviewActions.hidden = !hasBack;

    if (!hasBack) {
        return;
    }

    detailsBackImage.src = back.urls.final;
    applySlotTransform(detailsBackSlot, back.transform);
}

function showDetailsStep() {
    persistActiveSide();

    if (!sideState.front.urls.final) {
        positionStatus.textContent = "Please finish placing the image first.";
        return;
    }

    rememberCommittedBack();
    hasReachedDetails = true;
    activateSide("front");
    isPositioning = false;
    editorStep.hidden = true;
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    galleryStep.hidden = true;
    hideCaptureChrome();
    detailsStep.hidden = false;
    detailsPreviewImage.src = sideState.front.urls.final;
    applySlotTransform(detailsPreviewSlot, sideState.front.transform);
    updateBackPreview();
    updateGalleryPreview();
    updateDetailsVisibility();
    updateSideUi();
}

function showPositionFromDetails() {
    activateSide("front");
    detailsStep.hidden = true;
    galleryStep.hidden = true;
    positionStep.hidden = false;
    positionStatus.textContent = positionPrompt();
    positionImage.src = imagePreviewUrls.final;
    applyPositionTransform();
    syncPositionControls();
    updateSideUi();
}

function showBackPositionFromDetails() {
    activateSide("back");
    if (!imagePreviewUrls.final) {
        startBackCapture();
        return;
    }

    detailsStep.hidden = true;
    hideCaptureChrome();
    showPositionStep();
}

function startBackCapture() {
    persistActiveSide();
    captureMode = "item";
    rememberCommittedBack();
    activateSide("back");
    editorStep.hidden = true;
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    detailsStep.hidden = true;
    galleryStep.hidden = true;

    if (imagePreviewUrls.original) {
        showCaptureChrome();
        showPreview(imagePreviewUrls.original);
    } else {
        resetCaptureUiForNewPhoto();
    }

    updateSideUi();
}

function restoreCommittedBackIfNeeded() {
    persistActiveSide();
    if (!committedBack || sideState.back.urls.final) {
        return;
    }

    sideState.back = cloneSide(committedBack);
    captureSide = "back";
    applyLiveFrom("back");
}

function startGalleryCapture(options = {}) {
    const fromGrid = Boolean(options.fromGrid);
    showDetailsError("");
    if (galleryPhotos.length >= MAX_GALLERY_PHOTOS) {
        const message = `You can add up to ${MAX_GALLERY_PHOTOS} extra photos.`;
        if (fromGrid) {
            galleryStatus.textContent = message;
        } else {
            showDetailsError(message);
        }
        return;
    }

    persistActiveSide();
    captureMode = "gallery";
    openGalleryGridAfterCapture = fromGrid;
    clearGalleryDraft();
    editorStep.hidden = true;
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    detailsStep.hidden = true;
    galleryStep.hidden = true;
    resetCaptureUiForNewPhoto();
    updateSideUi();
}

function cancelCaptureToDetails() {
    if (capturingGalleryPhotos()) {
        clearGalleryDraft();
        finishGalleryCapture();
        return;
    }

    restoreCommittedBackIfNeeded();
    activateSide("front");
    hideCaptureChrome();
    showDetailsStep();
}

positionSlot.addEventListener("pointerdown", event => {
    if (event.button) {
        return;
    }

    event.preventDefault();
    positionSlot.setPointerCapture(event.pointerId);
    isPositioning = true;

    const frameRect = positionFrame.getBoundingClientRect();
    positionDragOffsetX =
        event.clientX - (frameRect.left + clothingTransform.x * frameRect.width);
    positionDragOffsetY =
        event.clientY - (frameRect.top + clothingTransform.y * frameRect.height);
});

positionSlot.addEventListener("pointermove", event => {
    if (!isPositioning) {
        return;
    }

    const frameRect = positionFrame.getBoundingClientRect();
    clothingTransform.x = roundTransform(clamp(
        (event.clientX - positionDragOffsetX - frameRect.left) / frameRect.width,
        -0.25,
        1.25,
    ));
    clothingTransform.y = roundTransform(clamp(
        (event.clientY - positionDragOffsetY - frameRect.top) / frameRect.height,
        -0.25,
        1.25,
    ));
    applyPositionTransform();
});

function stopPositioning() {
    isPositioning = false;
}

positionSlot.addEventListener("pointerup", stopPositioning);
positionSlot.addEventListener("pointercancel", stopPositioning);

positionFrame.addEventListener("wheel", event => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    clothingTransform.scale = clamp(clothingTransform.scale + delta, 0.2, 2.5);
    applyPositionTransform();
    syncPositionControls();
}, { passive: false });

positionRotationInput.addEventListener("input", () => {
    clothingTransform.rotation = Number(positionRotationInput.value);
    applyPositionTransform();
    syncPositionControls();
});

positionScaleInput.addEventListener("input", () => {
    clothingTransform.scale = Number(positionScaleInput.value) / 100;
    applyPositionTransform();
    syncPositionControls();
});

resetPositionButton.addEventListener("click", () => {
    resetClothingTransform();
    applyPositionTransform();
    syncPositionControls();
    positionStatus.textContent = positionPrompt();
});

backToCleanupButton.addEventListener("click", showCleanupFromPosition);
continueAfterPositionButton.addEventListener("click", showDetailsStep);
editPositionButton.addEventListener("click", showPositionFromDetails);
flowBackButton.addEventListener("click", () => {
    if (typeof flowBackAction === "function") {
        flowBackAction();
    }
});
addBackButton.addEventListener("click", startBackCapture);
editBackButton.addEventListener("click", showBackPositionFromDetails);
retakeBackButton.addEventListener("click", startBackCapture);
addGalleryButton.addEventListener("click", () => startGalleryCapture());
detailsGalleryPreview.addEventListener("click", showGalleryStep);
galleryBackButton.addEventListener("click", showDetailsStep);
galleryAddButton.addEventListener("click", () => {
    startGalleryCapture({ fromGrid: true });
});
backToDetailsButton.addEventListener("click", cancelCaptureToDetails);
publishCheckbox.addEventListener("change", updateDetailsVisibility);
forSaleCheckbox.addEventListener("change", updateDetailsVisibility);
priceInput.addEventListener("blur", formatPriceInput);
priceInput.addEventListener("change", formatPriceInput);
countInput.addEventListener("input", syncStockLimit);
countInput.addEventListener("change", syncStockLimit);
countInput.addEventListener("blur", formatCountInput);
stockInput.addEventListener("input", syncStockLimit);
stockInput.addEventListener("change", syncStockLimit);
stockInput.addEventListener("blur", formatStockInput);

function blobAsFile(blob, fallbackName) {
    if (!blob) {
        return null;
    }

    if (blob instanceof File && blob.name) {
        return blob;
    }

    const type = blob.type || "image/png";
    return new File([blob], fallbackName, { type });
}

function showDetailsError(message) {
    detailsError.textContent = message;
    detailsError.hidden = !message;
}

async function createClothing() {
    showDetailsError("");
    formatCountInput();
    formatStockInput();
    formatPriceInput();
    addClothingTag(tagInput.value);

    persistActiveSide();
    const front = sideState.front;
    const back = sideState.back;

    if (!front.images.original || !front.images.final) {
        showDetailsError("Please finish capturing and editing the image first.");
        return;
    }

    const name = nameInput.value.trim();
    if (!name) {
        showDetailsError("Please enter a name.");
        nameInput.focus();
        return;
    }

    const published = publishCheckbox.checked;
    const forSale = published && forSaleCheckbox.checked;
    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", descriptionInput.value.trim());
    formData.append("category", categorySelect.value);
    formData.append("article_type", articleTypeSelect.value);
    formData.append("size", sizeInput.value.trim());
    formData.append("tags", JSON.stringify(clothingTags));
    formData.append("count", String(currentCount()));
    formData.append("publish", published ? "true" : "false");
    formData.append("anonymous", published && anonymousCheckbox.checked ? "true" : "false");
    formData.append("for_sale", forSale ? "true" : "false");
    formData.append("price", forSale ? priceInput.value : "");
    formData.append("stock", forSale ? stockInput.value : "1");

    const transformPayload = { ...front.transform };
    if (back.images.final) {
        transformPayload.back = { ...back.transform };
    }
    formData.append("transform", JSON.stringify(transformPayload));
    formData.append(
        "original_front_image",
        blobAsFile(front.images.original, "original_front.png"),
    );
    if (front.images.processed) {
        formData.append(
            "processed_front_image",
            blobAsFile(front.images.processed, "processed_front.png"),
        );
    }
    formData.append(
        "final_front_image",
        blobAsFile(front.images.final, "final_front.png"),
    );

    if (back.images.final) {
        if (back.images.original) {
            formData.append(
                "original_back_image",
                blobAsFile(back.images.original, "original_back.png"),
            );
        }
        if (back.images.processed) {
            formData.append(
                "processed_back_image",
                blobAsFile(back.images.processed, "processed_back.png"),
            );
        }
        formData.append(
            "final_back_image",
            blobAsFile(back.images.final, "final_back.png"),
        );
    }

    galleryPhotos.forEach((photo, index) => {
        formData.append(
            "gallery_images",
            blobAsFile(photo.blob, `gallery_${index + 1}.png`),
        );
    });

    createClothingButton.disabled = true;

    try {
        const response = await fetch(createUrl, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrfToken,
            },
            body: formData,
            credentials: "same-origin",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(
                data.error || "Couldn't save the clothing item. Please try again.",
            );
        }

        window.location.href = data.redirect || "/wardrobe/";
    } catch (error) {
        showDetailsError(
            error.message || "Couldn't save the clothing item. Please try again.",
        );
        createClothingButton.disabled = false;
    }
}

createClothingButton.addEventListener("click", createClothing);
clothingDetailsForm.addEventListener("submit", event => {
    event.preventDefault();
    createClothing();
});

function normalizeTag(value) {
    return value.replaceAll(",", " ").trim().replace(/\s+/g, " ");
}

function renderClothingTags() {
    tagList.replaceChildren(...clothingTags.map((tag, index) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";

        const label = document.createElement("span");
        label.textContent = tag;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "tag-remove";
        removeButton.setAttribute("aria-label", `Remove ${tag}`);
        removeButton.textContent = "×";
        removeButton.addEventListener("click", () => {
            clothingTags.splice(index, 1);
            renderClothingTags();
            tagInput.focus();
        });

        chip.append(label, removeButton);
        return chip;
    }));

    tagInput.placeholder = clothingTags.length
        ? ""
        : "Type a tag, then Enter";
}

function addClothingTag(rawValue) {
    const tag = normalizeTag(rawValue);
    if (!tag) {
        return;
    }

    const alreadyAdded = clothingTags.some(
        existing => existing.toLowerCase() === tag.toLowerCase(),
    );
    if (alreadyAdded) {
        tagInput.value = "";
        return;
    }

    clothingTags.push(tag);
    tagInput.value = "";
    renderClothingTags();
}

tagEditor.addEventListener("click", () => {
    tagInput.focus();
});

tagInput.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addClothingTag(tagInput.value);
        return;
    }

    if (event.key === "Backspace" && tagInput.value === "" && clothingTags.length) {
        clothingTags.pop();
        renderClothingTags();
    }
});

tagInput.addEventListener("input", () => {
    if (!tagInput.value.includes(",")) {
        return;
    }

    const parts = tagInput.value.split(",");
    const leftover = parts.pop();
    parts.forEach(part => addClothingTag(part));
    tagInput.value = leftover.trimStart();
});

tagInput.addEventListener("blur", () => {
    addClothingTag(tagInput.value);
});

updateFlowNav();