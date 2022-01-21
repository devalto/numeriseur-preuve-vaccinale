import {inflateRaw} from "pako";
import {Buffer} from "buffer";

export class SmartHealthCardQRParseError extends Error {

}

export class SmartHealthCardQRParser {

    public header: object;
    public payload: object;
    public signature: string;

    constructor(header: object, payload: object, signature: string) {
        this.header = header;
        this.payload = payload;
        this.signature = signature;
    }

    public parse(): SmartHealthCard {
        try {
            return new SmartHealthCard(this.payload);
        } catch(e: any) {
            //throw new SmartHealthCardQRParseError();
        }
    }

    static fromQRCodeRawData(uri: string): SmartHealthCardQRParser {
        return this.fromNumericJWS(uri.split("/")[1]);
    }

    static fromNumericJWS(digits: string): SmartHealthCardQRParser {
        return this.fromJWS(
            digits.match(/(..?)/g)
                .map(
                    (number) => String.fromCharCode(parseInt(number, 10) + 45)
                )
                .join("")
        );
    }

    static fromJWS(jwsString: string): SmartHealthCardQRParser {
        const splittedJws = jwsString.split(".");
        const header = Buffer.from(splittedJws[0], "base64").toString("utf8");
        const deflatedPayload = splittedJws[1];
        const signature = Buffer.from(splittedJws[2], "base64").toString("utf8");
        const payloadBuffer = Buffer.from(deflatedPayload, "base64");
        const payload = inflateRaw(payloadBuffer, {to: "string"});

        return new SmartHealthCardQRParser(
            JSON.parse(header),
            JSON.parse(payload),
            signature
        );
    }
}

export class SmartHealthCard {
    public issuer?: string;
    public issuanceDate?: Date;
    public verifiableCredential: VerifiableCredential;

    public constructor(payload: any) {
        if (payload["iss"]) {
            this.issuer = payload['iss'];
        }

        if (payload['nbf']) {
            this.issuanceDate = new Date(payload['nbf']);
        } else if (payload['iat']) {
            this.issuanceDate = new Date(payload['nbf']);
        }

        this.verifiableCredential = new VerifiableCredential(payload['vc']);
    }
}

export class VerifiableCredential {
    public context: string[];
    public type: string[];
    public subject: FhirVerifiableCredential;

    public constructor(payload: any) {
        this.context = payload['@context'];
        this.type = payload['type'];
        this.subject = new FhirVerifiableCredential(payload['credentialSubject']);
    }
}

export class FhirVerifiableCredential {
    public version: string;
    public bundle: FhirBundle

    constructor(payload: any) {
        this.version = payload['fhirVersion'];
        this.bundle = new FhirBundle(payload['fhirBundle']);
    }
}

export class FhirBundle {
    public entries: FhirEntry[] = [];

    constructor(payload: any) {
        for (let entryPayload in payload.entry) {
            this.entries.push(FhirEntry.fromPayload(payload.entry[entryPayload]));
        }
    }

    public patient(): FhirPatient {
        return <FhirPatient>this.entries.find((entry) => {
            if (entry instanceof FhirPatient) {
                return entry;
            }
        });
    }

    public immunizations(): FhirImmunization[] {
        return <FhirImmunization[]>this.entries.filter((entry):FhirImmunization => {
            if (entry instanceof FhirImmunization) {
                return <FhirImmunization>entry;
            }
        });
    }
}

export abstract class FhirEntry {
    static fromPayload(payload: any): FhirEntry {
        const resource = payload['resource'];
        const type = resource['resourceType'];
        if (type == "Patient") {
            return new FhirPatient(resource);
        } else if (type == "Immunization") {
            return new FhirImmunization(resource, payload['fullUrl']);
        } else {
            throw new Error("Unknown FHIR type " + type);
        }
    }
}

enum Gender {Male = "Male", Female = "Female"}
enum ImmunizationStatus {Completed = "completed"}

export class FhirPatient extends FhirEntry {
    public givenName: string;
    public familyName: string;
    public birthDate: Date;
    public gender: Gender;

    constructor(payload: any) {
        super();

        let name = payload["name"][0];
        let gender: string = payload["gender"];

        this.givenName = name.given.join(" ");
        this.familyName = name.family;
        this.birthDate = new Date(payload["birthDate"]);
        this.gender = (<any>Gender)[gender];
    }
}

export class FhirImmunization extends FhirEntry {
    public occurrenceDateTime: Date;
    public status: string;
    public vaccine: FhirVaccine;
    public fullUrl: string;

    constructor(payload: any, fullUrl: string) {
        super();

        this.occurrenceDateTime = new Date(payload["occurrenceDateTime"]);
        this.status = payload["status"];
        this.vaccine = new FhirVaccine(payload["vaccineCode"]);
        this.fullUrl = fullUrl;
    }
}

export abstract class FhirCoding {
    public system: string;
    public code: number;

    constructor(payload: any) {
        let coding = payload["coding"];
        let firstCoding = coding[0];

        this.system = firstCoding["system"];
        this.code = firstCoding["code"];
    }
}

export class FhirVaccine extends FhirCoding {
}

export class FhirDisease extends FhirCoding {
}

export enum CovidImmunizationStatus {NotDone, Partial, Complete}

export class CovidVaccineProof {

    public patient: FhirPatient;
    public firstDose?: FhirImmunization;
    public secondDose?: FhirImmunization;
    public thirdDose?: FhirImmunization;

    constructor(bundle: FhirBundle) {
        this.patient = <FhirPatient> bundle.patient();
        let immunizations = bundle.immunizations();
        this.firstDose = immunizations.find((im: FhirImmunization) => {
           if (
             im.fullUrl == "resource:1" &&
             im.status == "completed" &&
             im.vaccine.system == "http://hl7.org/fhir/sid/cvx"
           ) {
               return im;
           }
        });
        this.secondDose = immunizations.find((im: FhirImmunization) => {
            if (
              im.fullUrl == "resource:2" &&
              im.status == "completed" &&
              im.vaccine.system == "http://hl7.org/fhir/sid/cvx"
            ) {
                return im;
            }
        });
        this.thirdDose = immunizations.find((im: FhirImmunization) => {
            if (
              im.fullUrl == "resource:3" &&
              im.status == "completed" &&
              im.vaccine.system == "http://hl7.org/fhir/sid/cvx"
            ) {
                return im;
            }
        });
    }

    hasFirstDose(): boolean {
        return this.firstDose instanceof FhirImmunization;
    }

    hasSecondDose(): boolean {
        return this.secondDose instanceof FhirImmunization;
    }

    hasThirdDose(): boolean {
        return this.thirdDose instanceof FhirImmunization;
    }

    immunizationStatus(): CovidImmunizationStatus {
        if (!this.hasFirstDose() && !this.hasSecondDose() && !this.hasThirdDose()) {
            return CovidImmunizationStatus.NotDone;
        } else if (this.hasFirstDose() && this.hasSecondDose() && this.hasThirdDose()) {
            return CovidImmunizationStatus.Complete;
        } else {
            return CovidImmunizationStatus.Partial;
        }
    }

    patientName(): string {
        return this.patient.givenName + " " + this.patient.familyName;
    }

}
