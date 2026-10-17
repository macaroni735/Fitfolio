
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
const editorSuccess = document.getElementById("editor-success");
const processedPreview = document.getElementById("processed-preview");

const backToCaptureButton = document.getElementById("back-to-capture");
const continueAfterProcessingButton = document.getElementById("continue-after-processing");
const retryProcessingButton = document.getElementById("retry-processing");
const continueButton = document.getElementById("continue-to-editor");

const csrfToken = document.querySelector("#csrf-form [name=csrfmiddlewaretoken]").value;
const processImageUrl = document.querySelector(".capture-container").dataset.processUrl;

let stream = null;
let processingRequestId = 0;

// Held until the clothing form is saved. Nothing is written to the database here.
const clothingImages = {
    original: null,
    processed: null,
    final: null,
};
const captureContainer = document.querySelector(".capture-container");
captureContainer.clothingImages = clothingImages;
captureContainer.setFinalImage = setFinalImage;

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

function setOriginalImage(blob) {
    replaceImage("original", blob);
    clearProcessedImages();
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


// Image cleanup functionality

function showEditorStep() {
    stopCamera();

    cameraFrame.hidden = true;
    document.querySelector(".capture-controls").hidden = true;
    status.hidden = true;

    editorStep.hidden = false;
    editorError.hidden = true;
    editorSuccess.hidden = true;
    continueAfterProcessingButton.hidden = true;
    retryProcessingButton.hidden = true;

    processedPreview.src = imagePreviewUrls.original;
    processedPreview.alt = "Original clothing photo";
    editorWorkspace.hidden = false;

    processCapturedImage();
}

function showCaptureStep() {
    processingRequestId += 1;

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
    continueAfterProcessingButton.hidden = true;
    editorError.hidden = true;
    editorSuccess.hidden = true;
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

        editorWorkspace.hidden = false;
        editorSuccess.hidden = false;
        continueAfterProcessingButton.hidden = false;
        processingStatus.hidden = true;
    } catch (error) {
        if (requestId !== processingRequestId) {
            return;
        }

        processingStatus.hidden = true;
        continueAfterProcessingButton.hidden = true;
        editorError.textContent = error.message ||
            "Something went wrong while processing the image.";
        editorError.hidden = false;
        retryProcessingButton.hidden = false;
    }
}

retryProcessingButton.addEventListener("click", processCapturedImage);

backToCaptureButton.addEventListener("click", showCaptureStep);

continueButton.addEventListener("click", showEditorStep);