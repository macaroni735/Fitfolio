
const video = document.getElementById("camera");
const mannequinGuide = document.getElementById("mannequin-guide");
const preview = document.getElementById("preview");
const placeholder = document.getElementById("placeholder");
const canvas = document.getElementById("canvas");
const status = document.getElementById("status");
const cameraFrame = document.getElementById("camera-frame");

const startButton = document.getElementById("start-camera");
const takeButton = document.getElementById("take-photo");
const retakeButton = document.getElementById("retake");
const uploadInput = document.getElementById("photo-upload");

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

const clothingTags = [];

captureContainer.clothingImages = clothingImages;
captureContainer.clothingTransform = clothingTransform;
captureContainer.clothingTags = clothingTags;

const imagePreviewUrls = {
    original: null,
    processed: null,
    final: null,
};

function replaceImage(role, blob) {
    if (imagePreviewUrls[role]) {
        URL.revokeObjectURL(imagePreviewUrls[role]);
        imagePreviewUrls[role] = null;
    }

    clothingImages[role] = blob;

    if (!blob) {
        return null;
    }

    imagePreviewUrls[role] = URL.createObjectURL(blob);
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
    mannequinGuide.hidden = false;

    retakeButton.hidden = false;
    takeButton.hidden = true;
    startButton.hidden = true;
    continueButton.hidden = false;

    status.textContent =
        "Photo ready for the next step. You can retake or upload another image.";

    stopCamera();
}

startButton.addEventListener("click", async () => {
    cameraFrame.hidden = false;
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
        mannequinGuide.hidden = false;

        takeButton.hidden = false;
        takeButton.disabled = false;
        retakeButton.hidden = true;
        startButton.hidden = true;
        continueButton.hidden = true;

        status.textContent =
            "Position the clothing item in view, then take a photo.";
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

    canvas.toBlob(blob => {
        if (!blob) {
            status.textContent = "Couldn't capture the image. Please try again.";
            return;
        }

        setOriginalImage(blob);
        showPreview(imagePreviewUrls.original);
    }, "image/png");
});

uploadInput.addEventListener("change", () => {
    const file = uploadInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        status.textContent = "Please choose an image file.";
        uploadInput.value = "";
        return;
    }

    setOriginalImage(file);
    cameraFrame.hidden = false;
    showPreview(imagePreviewUrls.original);
});

retakeButton.addEventListener("click", async () => {
    setOriginalImage(null);

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


// Background removal

function showEditorStep() {
    stopCamera();

    cameraFrame.hidden = true;
    document.querySelector(".capture-controls").hidden = true;
    status.hidden = true;
    cleanupStep.hidden = true;
    positionStep.hidden = true;
    detailsStep.hidden = true;

    editorStep.hidden = false;
    editorError.hidden = true;
    retryProcessingButton.hidden = true;

    processedPreview.src = imagePreviewUrls.original;
    processedPreview.alt = "Original clothing photo";
    editorWorkspace.hidden = false;

    processCapturedImage();
}

function showCaptureStep() {
    processingRequestId += 1;

    detailsStep.hidden = true;
    positionStep.hidden = true;
    cleanupStep.hidden = true;
    editorStep.hidden = true;
    cameraFrame.hidden = false;
    document.querySelector(".capture-controls").hidden = false;
    status.hidden = false;
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

continueButton.addEventListener("click", showEditorStep);


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
    cleanupStep.hidden = false;

    if (cleanupReady && loadedProcessedUrl === imagePreviewUrls.processed) {
        return;
    }

    cleanupReady = false;
    cleanupStatus.textContent = "Erase any leftover background or extra details.";

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
        cleanupStatus.textContent = "Erase any leftover background or extra details.";
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

function applyClothingTransform(slot) {
    const shiftX =
        ((clothingTransform.x - 0.5) / MANNEQUIN_SLOT_WIDTH) * 100;
    const shiftY =
        ((clothingTransform.y - 0.5) / MANNEQUIN_SLOT_HEIGHT) * 100;

    slot.style.transform =
        `translate(${shiftX}%, ${shiftY}%) rotate(${clothingTransform.rotation}deg) scale(${clothingTransform.scale})`;
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
    positionStep.hidden = false;
    positionStatus.textContent =
        "Line the clothing up with the mannequin. Drag to move, then adjust rotation and scale.";
    positionImage.src = imagePreviewUrls.final;
    applyPositionTransform();
    syncPositionControls();
}

function showCleanupFromPosition() {
    isPositioning = false;
    positionStep.hidden = true;
    cleanupStep.hidden = false;
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

function showDetailsStep() {
    if (!imagePreviewUrls.final) {
        positionStatus.textContent = "Please finish placing the image first.";
        return;
    }

    isPositioning = false;
    positionStep.hidden = true;
    detailsStep.hidden = false;
    detailsPreviewImage.src = imagePreviewUrls.final;
    applyClothingTransform(detailsPreviewSlot);
    updateDetailsVisibility();
}

function showPositionFromDetails() {
    detailsStep.hidden = true;
    positionStep.hidden = false;
    positionImage.src = imagePreviewUrls.final;
    applyPositionTransform();
    syncPositionControls();
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
    positionStatus.textContent =
        "Line the clothing up with the mannequin. Drag to move, then adjust rotation and scale.";
});

backToCleanupButton.addEventListener("click", showCleanupFromPosition);
continueAfterPositionButton.addEventListener("click", showDetailsStep);
editPositionButton.addEventListener("click", showPositionFromDetails);
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

    if (!clothingImages.original || !clothingImages.final) {
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
    formData.append("transform", JSON.stringify(clothingTransform));
    formData.append(
        "original_front_image",
        blobAsFile(clothingImages.original, "original_front.png"),
    );
    if (clothingImages.processed) {
        formData.append(
            "processed_front_image",
            blobAsFile(clothingImages.processed, "processed_front.png"),
        );
    }
    formData.append(
        "final_front_image",
        blobAsFile(clothingImages.final, "final_front.png"),
    );

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