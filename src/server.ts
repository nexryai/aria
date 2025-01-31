import { Elysia } from "elysia";

import { node } from "@elysiajs/node";

import { authRouter, apiRouter } from "@/controllers/AppController";

console.log("Starting server...");
const app = new Elysia({ adapter: node() })
    .use(authRouter)
    .use(apiRouter);

app.listen(3000);
console.log("Server started.");
