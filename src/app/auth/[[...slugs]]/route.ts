import { authRouter as server } from "@/controllers/AppController";


const authRouterWithSuperCoolLogger = async (req: Request): Promise<Response> => {
    const cloned = req.clone();
    console.log("=== ⭐︎Request body =============");
    console.log(await cloned.json());
    return server.handle(req);
};

export const GET = server.handle;
export const POST = authRouterWithSuperCoolLogger;
