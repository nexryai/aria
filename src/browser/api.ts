import { treaty } from "@elysiajs/eden";
import { IElysiaApp } from "@/controllers/AppController";

const url = process.env.URL_DOMAIN ?? "localhost:3000";
export const app = treaty<IElysiaApp>(url);
