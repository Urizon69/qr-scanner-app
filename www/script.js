document.addEventListener("DOMContentLoaded", async function () {
    const statusText = document.querySelector(".status");
    const scannedList = document.getElementById("scanned-list");

    // Success sound
    const successSound = new Audio("https://www.soundjay.com/button/beep-07.mp3");

    // REQUIRED for html5-qrcode in apps
    const html5QrCode = new Html5Qrcode("qr-reader", {
        verbose: false
    });

    const scannedToday = new Set();

    function extractPersonInfo(qrText) {
    // Case-insensitive, works with ANY caps
    const nameMatch = qrText.match(/name\s*:\s*([^\n|]+)/i);
    const roleMatch = qrText.match(/role\s*:\s*(teacher|student)/i);

    return {
        name: nameMatch ? nameMatch[1].trim() : null,
        role: roleMatch ? roleMatch[1].trim().toLowerCase() : null
    };
}


    function getPHDate() {
        return new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila"
        });
    }

    async function submitAttendance(person) {
        if (!person.name || !person.role) {
            statusText.textContent = "QR detected but missing NAME or ROLE";
            return;
        }

        const date = getPHDate();
        const uniqueKey = `${person.name}-${date}`;

        if (scannedToday.has(uniqueKey)) return;
        scannedToday.add(uniqueKey);

        try {
            const response = await fetch(
                "https://ungarnished-jacquelyne-undeprecatingly.ngrok-free.dev/save.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body:
                        "name=" + encodeURIComponent(person.name) +
                        "&role=" + encodeURIComponent(person.role) +
                        "&date=" + encodeURIComponent(date)
                }
            );

            const result = await response.json();

            if (result.status === "success") {
                successSound.play();
                statusText.textContent = `Attendance logged for ${person.name} (${person.role})`;

                const li = document.createElement("li");
                li.textContent = `${person.name} (${person.role}) - ${date}`;
                scannedList.appendChild(li);
            } else {
                statusText.textContent = "Server error saving attendance";
            }

        } catch (err) {
            console.error(err);
            statusText.textContent = "Network error";
        }
    }

    // 🔥 IMPORTANT PART FOR APP CAMERA ACCESS 🔥
    try {
        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
            statusText.textContent = "No camera found";
            return;
        }

        // Prefer BACK camera
        let backCamera = cameras.find(cam =>
            cam.label.toLowerCase().includes("back")
        );

        const cameraId = backCamera ? backCamera.id : cameras[0].id;

        html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true
            },
            (decodedText) => {
                const person = extractPersonInfo(decodedText);
                submitAttendance(person);
            },
            () => {}
        );

    } catch (err) {
        console.error("Camera init error:", err);
        statusText.textContent =
            "Camera permission denied. Allow camera access in app settings.";
    }
});
