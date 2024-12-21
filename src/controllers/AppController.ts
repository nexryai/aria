import { Elysia, t } from "elysia";

export const server = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
    .get('/gallery/:id', ({ params }) => `Elysia: ${params.id}`, {
        params: t.Object({
            id: t.String()
        })
    })
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })

export type IElysiaApp = typeof server;
