export class GoogleAnalytics {
    private code: string;
    private url: string;

    constructor(code: string, url: string = "https://www.googletagmanager.com/gtag/js") {
        this.code = code;
        this.url = url;
    }

    include(window: Window) {
        (<any>window).dataLayer = (<any>window).dataLayer || [];
        this.send('js', new Date());
        this.send('config', this.code);

        let document = window.document;
        let urlWithId = this.url + "?id=" + this.code;
        let analytics = document.createElement('script');
        analytics.setAttribute('src', urlWithId);
        analytics.async = true;
        document.head.appendChild(analytics);
    }

    send(...arg: Array<any>) {
        (<any>window).dataLayer.push(arg);
    }
}