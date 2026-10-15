
const video = document.getElementById("camera");
const preview = document.getElementById("preview");
const placeholder = document.getElementById("placeholder");
const canvas = document.getElementById("canvas");
const status = document.getElementById("status");

const startButton = document.getElementById("start-camera");
const takeButton = document.getElementById("take-photo");
const retakeButton = document.getElementById("retake");
const uploadInput = document.getElementById("photo-upload");

let stream = null;
let capturedImageUrl = null;

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    video.srcObject = null;
    takeButton.disabled = true;
}

function showPreview(imageUrl) {
    preview.src = imageUrl;
    preview.hidden = false;
    video.hidden = true;
    placeholder.hidden = true;

    retakeButton.hidden = false;
    takeButton.hidden = true;
    startButton.hidden = true;

    status.textContent =
        "Photo ready for the next step. You can retake or upload another image.";

    stopCamera();
}

startButton.addEventListener("click", async () => {
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
        startButton.hidden = true;

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

        if (capturedImageUrl) {
            URL.revokeObjectURL(capturedImageUrl);
        }

        capturedImageUrl = URL.createObjectURL(blob);
        showPreview(capturedImageUrl);
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

    if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
    }

    capturedImageUrl = URL.createObjectURL(file);
    showPreview(capturedImageUrl);
});

retakeButton.addEventListener("click", () => {
    if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
        capturedImageUrl = null;
    }

    preview.removeAttribute("src");
    preview.hidden = true;
    placeholder.hidden = false;

    retakeButton.hidden = true;
    takeButton.hidden = false;
    startButton.hidden = false;

    status.textContent = "Choose camera or upload a photo.";
    uploadInput.value = "";
});

// Stop the camera when the user leaves the page.
window.addEventListener("pagehide", stopCamera);
