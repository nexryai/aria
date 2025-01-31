import { Elysia } from "elysia";

import { IncomingHttpHeaders } from "node:http";

import Polka from "polka";

import { apiRouter, authRouter } from "@/controllers/AppController";


function incomingHttpHeadersToRequestHeaders(headers:  IncomingHttpHeaders) {
    const requestHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
        requestHeaders.set(key, value as string);
    }
    return requestHeaders;
}

console.log("Starting server...");
const app = new Elysia({ aot: false })
    .use(authRouter)
    .use(apiRouter);

const server = Polka().use(async (req, res) => {
    const requestUrl = (req.protocol || "http") + "://" + (req.host || req.headers.host || req.headers.origin) + req.url;
    console.log(`[${req.method}]`, requestUrl);
    const webStandardRequest = new Request(requestUrl, {
        method: req.method,
        headers: incomingHttpHeadersToRequestHeaders(req.headers),
        body: req.body,
    });

    const webStandardRes = await app.fetch(webStandardRequest);

    for (const [key, value] of webStandardRes.headers.entries()) {
        res.setHeader(key, value);
    }

    res.writeHead(webStandardRes.status);

    if (!webStandardRes.body) {
        res.end();
        return;
    }

    const reader = webStandardRes.body.getReader();
    if (res.destroyed) {
        reader.cancel();
        return;
    }

    const cancel = (error: Error) => {
        res.off("close", cancel);
        res.off("error", cancel);

        reader.cancel(error).catch(() => {});
        if (error) res.destroy(error);
    };

    res.on("close", cancel);
    res.on("error", cancel);

    next();
    async function next() {
        try {
            for (;;) {
                const { done, value } = await reader.read();

                if (done) break;

                if (!res.write(value)) {
                    res.once("drain", next);
                    return;
                }
            }
            res.end();
        } catch (error) {
            cancel(error instanceof Error ? error : new Error(String(error)));
        }
    }
});

app.compile();
server.listen(3000);
console.log("Server started.");
