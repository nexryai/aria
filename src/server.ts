import { Elysia } from "elysia";

import { IncomingHttpHeaders } from "node:http";
import * as http from "node:http";

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

const server = http.createServer(async (req, res) => {
    const proto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(proto) ? proto[0] : proto;

    const host = req.headers.host || "";

    const requestUrl = `${ protocol || "http" }://${host}${req.url}`;

    const body: Buffer[] = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    });

    req.on("error", (error) => {
        console.error(error);
    });

    req.on("end", async () => {
        const hasBody = body.length > 0 && req.method !== "GET" && req.method !== "HEAD";
        const bodyBuffer = hasBody ? Buffer.concat(body) : null;

        console.log(`[${req.method}]`, requestUrl);

        const webStandardRequest = new Request(requestUrl, {
            method: req.method,
            headers: incomingHttpHeadersToRequestHeaders(req.headers),
            body: bodyBuffer,
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
                console.error(error);
                cancel(error instanceof Error ? error : new Error(String(error)));
            }
        }
    });
});

app.compile();
server.listen(3000);

console.log("Server started.");
