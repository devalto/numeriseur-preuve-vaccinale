import {CovidImmunizationStatus, CovidVaccineProof, SmartHealthCard, SmartHealthCardQRParser} from "./shc";
import Mustache from "mustache"
import jsQR from "jsqr";
import './scss/index.scss'
import './analytics.js'

function main() {
    const showScan = document.getElementById("show-scan");

    showScan.addEventListener("click", initSection2);
    showScan.addEventListener("click", showSection("section-2"));

    document.getElementById("section-3").innerText = "";
}

function showSection(showSection: string) {
    const sections = [
        "section-1",
        "section-2",
        "section-3",
    ];
    return function() {
        sections.forEach((sectionName) => {
            const section = document.getElementById(sectionName);
            section.hidden = sectionName != showSection;
        });
    }
}

function initSection2() {
    const video = document.createElement("video");
    const canvasElement = <HTMLCanvasElement>document.getElementById("canvas");
    const canvas = canvasElement.getContext("2d");
    const loadingMessage = document.getElementById("loadingMessage");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640 } }).then(function(stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        video.play();
        requestAnimationFrame(tick);
    });

    function tick() {
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

                    (<MediaStream>video.srcObject).getTracks().forEach(function(track: MediaStreamTrack) {
                        track.stop();
                    });

                    showShc(shc);
                    //showPayload(parser);
                    showSection("section-3")();
                } catch (e: any) {
                }
            }
        }
        requestAnimationFrame(tick);
    }
}

function showShc(shc: SmartHealthCard) {
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
    '<hr/>';

    element.innerHTML = Mustache.render(template, view);

    const section3 = document.getElementById("section-3");
    section3.innerHTML = element.innerHTML;
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

    const section3 = document.getElementById("section-3");
    section3.appendChild(element);
}

main();
