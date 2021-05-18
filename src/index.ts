import {
    CovidImmunizationStatus,
    CovidVaccineProof,
    SmartHealthCard,
    SmartHealthCardQRParseError,
    SmartHealthCardQRParser
} from "./shc";
import Mustache from "mustache"
import jsQR from "jsqr";
import './scss/index.scss'
import './analytics.js'
import 'bootstrap'

function main() {
    const showScan = document.getElementById("show-camera");

    showScan.addEventListener("click", initSectionCamera);
    showScan.addEventListener("click", showSection("section-camera"));

    const showFile = document.getElementById("show-file-upload");

    showFile.addEventListener("click", initSectionFile);
    showFile.addEventListener("click", showSection("section-file"));
}

function showSection(showSection: string) {
    const sections = [
        "section-home",
        "section-camera",
        "section-file",
        "section-final",
    ];
    return function () {
        sections.forEach((sectionName) => {
            const section = document.getElementById(sectionName);
            section.hidden = sectionName != showSection;
        });
    }
}

function initSectionFile() {
    const uploadedFile = <HTMLInputElement>document.getElementById("uploaded-file");
    uploadedFile.addEventListener("change", (e) => {
        if (uploadedFile.files.length <= 0) {
            return;
        }

        const file = uploadedFile.files[0];
        const url = URL.createObjectURL(file);
        const img = new Image();
        const c = <HTMLCanvasElement>document.getElementById("photo");

        img.addEventListener("load", () => {
            URL.revokeObjectURL(this.src);
            c.height = img.height;
            c.width = img.width;

            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, c.width, c.height);

            c.hidden = false;

            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            if (code) {
                try {
                    const parser = SmartHealthCardQRParser.fromQRCodeRawData(code.data);
                    const shc = parser.parse();

                    uploadedFile.value = "";
                    c.hidden = true;

                    showFinalSection(shc, parser);
                } catch (e: any) {
                    throw e;
                }
            }

        });

        img.src = url;
    });
}

function initSectionCamera() {
    const video = document.createElement("video");
    const canvasElement = <HTMLCanvasElement>document.getElementById("canvas");
    const canvas = canvasElement.getContext("2d");
    const loadingMessage = document.getElementById("loadingMessage");

    navigator.mediaDevices.getUserMedia({video: {facingMode: "environment", width: 640}}).then(function (stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        video.play();
        requestAnimationFrame(tick);
    });

    function tick() {
        let continueRequest = true;
        loadingMessage.innerText = "⌛ chargement de la video..."
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            loadingMessage.hidden = true;
            canvasElement.hidden = false;

            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            if (code) {
                try {
                    const parser = SmartHealthCardQRParser.fromQRCodeRawData(code.data);
                    const shc = parser.parse();

                    (<MediaStream>video.srcObject).getTracks().forEach(function (track: MediaStreamTrack) {
                        track.stop();
                    });

                    showFinalSection(shc, parser);

                    continueRequest = false;
                } catch (e: any) {
                    throw e;
                }
            }
        }
        if (continueRequest) {
            requestAnimationFrame(tick);
        }
    }
}

function showFinalSection(shc: SmartHealthCard, shcParser: SmartHealthCardQRParser) {
    showShc(shc);
    showPayload(shcParser);
    showSection("section-final")();
}

function showShc(shc: SmartHealthCard) {
    const section = document.getElementById("section-final");
    section.innerText = "";

    const element = document.createElement('div');
    const info = new CovidVaccineProof(shc.verifiableCredential.subject.bundle);
    const dateFormatter = Intl.DateTimeFormat("fr");
    const templateImmuneStatus = (info.immunizationStatus() == CovidImmunizationStatus.Complete || info.immunizationStatus() == CovidImmunizationStatus.Partial)?'<div class="alert alert-success" role="alert">{{immunizationStatus}}</div>':'<div class="alert alert-danger" role="alert">{{immunizationStatus}}</div>';
    
    const view = {
        immunizationStatus: info.immunizationStatus() != CovidImmunizationStatus.Complete ? (info.immunizationStatus() == CovidImmunizationStatus.Partial ? '✅ Première dose administrée': '❌ Non vacciné') : '✅ Seconde dose administrée',
        fullName: info.patientName(),
        firstDose: info.hasFirstDose() ? "✅ Première dose administrée le " + dateFormatter.format(info.firstDose.occurrenceDateTime) : "❌ Première dose non administrée",
        secondDose: info.hasSecondDose() ? "✅ Seconde dose administrée le " + dateFormatter.format(info.secondDose.occurrenceDateTime) : "❌ Seconde dose non administrée"
    };

    var template =
    '<div class="card fade-in-text">'+
      '<div class="card-body">'+
        '<h5 class="card-title">{{fullName}}</h5>'+
        templateImmuneStatus+
        '<p class="card-text">'+
        '<div class="alert alert-primary" role="alert">{{firstDose}}</div>'+
        '<div class="alert alert-primary" role="alert">{{secondDose}}</div>'+
        '</p>'+
      '</div>'+
    '</div>'+
    '<hr/>' +
    '<button id="show-home">Recommencer</button>' +
    '<hr/>';

    element.innerHTML = Mustache.render(template, view);

    section.appendChild(element);

    const showHome = document.getElementById("show-home");
    showHome.addEventListener("click", showSection("section-home"));
};

function showPayload(shcParser: SmartHealthCardQRParser) {
    const element = document.createElement('div');

    const view = {
        header: JSON.stringify(shcParser.header, undefined, 2),
        payload: JSON.stringify(shcParser.payload, undefined, 2)
    }

    const template =
        '<h2>Contenu complet du code QR</h2>' +
        '<h3>Entête</h3>' +
        '<pre class="json"><code>{{header}}</code></pre>' +
        '<h3>Payload</h3>' +
        '<pre class="json"><code>{{payload}}</code></pre>';

    element.innerHTML = Mustache.render(template, view);

    const section = document.getElementById("section-final");
    section.appendChild(element);
}

window.URL = window.URL || window.webkitURL;

main();