import { Elysia } from "elysia";

import { apiRouter, authRouter } from "@/controllers/AppController";


console.log("Starting server...");
const app = new Elysia()
    .use(authRouter)
    .use(apiRouter);

app.listen(3000);
console.log("Server started.");
