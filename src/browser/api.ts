import { treaty } from "@elysiajs/eden";

import { IElysiaApp } from "@/controllers/AppController";

const url = typeof window !== "undefined"
    ? new URL("https://aria.nexryai.me")
    : new URL("http://localhost:3000");

const appDomain = url.host;
export const app = treaty<IElysiaApp>(appDomain);
