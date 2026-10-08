// Google Apps Script companion for the birthday-card website.
// 1. Replace the folder ID below.
// 2. Deploy as a Web App that executes as you and is accessible to anyone.
// 3. Paste the deployment URL into config.js.

const FOLDER_ID = "1dL33ttskWlMWJtnjnpomhFRbPZW-II_p";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    if (!payload.imageBase64 || !payload.fileName || !payload.senderName) {
      throw new Error("Missing required card information.");
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const bytes = Utilities.base64Decode(payload.imageBase64);
    const safeName = String(payload.fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
    const blob = Utilities.newBlob(bytes, payload.mimeType || "image/png", safeName);
    const file = folder.createFile(blob);
    file.setDescription([
      `Birthday wish from: ${payload.senderName}`,
      `Submitted: ${payload.createdAt || new Date().toISOString()}`,
      `Wish: ${payload.wish || ""}`
    ].join("\n"));

    return jsonResponse({ ok: true, fileId: file.getId() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: "Cherry birthday card upload" });
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
